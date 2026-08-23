import nodemailer, { type Transporter } from 'nodemailer';
import { CustomError, HttpStatusCodes } from '../../utils/helpers/index.js';
import logger from '../logger.js';

const ENVIO_MAX_TENTATIVAS = 3;
const ENVIO_BACKOFF_MS = 1000;

function esc(str: string | undefined | null): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DetalheLinha {
  label: string;
  value: string;
  valueColor?: string;
}

function buildDetailsTable(rows: DetalheLinha[]): string {
  const linhas = rows
    .map(
      (
        row,
        i,
      ) => `                <tr${i % 2 === 0 ? ' style="background-color: #f8f9fa;"' : ''}>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6; width: 40%;">${row.label}</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;${row.valueColor ? ` color: ${row.valueColor}; font-weight: bold;` : ''}">${row.value}</td>
                </tr>`,
    )
    .join('\n');

  return `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
${linhas}
            </table>`;
}

function renderEmailHtml(params: {
  title: string;
  titleColor?: string;
  bodyHtml: string;
  footerExtraHtml?: string;
}): string {
  const {
    title,
    titleColor = '#306FCC',
    bodyHtml,
    footerExtraHtml = '',
  } = params;

  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: ${titleColor}; font-size: 24px; margin-bottom: 20px; margin-top: 0;">${title}</h1>
            ${bodyHtml}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                ${footerExtraHtml}
                <p style="margin: 0; font-size: 16px; color: #999;">Equipe ${esc(process.env['COMPANY_NAME'] || 'Estoque Inteligente')}</p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

export interface EmprestimoEmailData {
  item?: { nome?: string };
  localizacao?: { nome?: string };
  solicitante_nome?: string;
  quantidade_emprestada?: number;
  data_prevista_devolucao?: string | Date;
  data_saida?: string | Date;
  observacoes_emprestimo?: string;
  quantidade_aberta?: number;
  observacoes_devolucao?: string;
}

class EmailService {
  private transporter: Transporter | null;

  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter(): void {
    if (!process.env['EMAIL_USER'] || !process.env['EMAIL_APP_PASSWORD']) {
      logger.warn(
        'Variáveis de ambiente EMAIL_USER e EMAIL_APP_PASSWORD não configuradas. Serviço de e-mail não estará disponível.',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env['EMAIL_USER'],
          pass: process.env['EMAIL_APP_PASSWORD'],
        },
      });

      this.transporter.verify().then(
        () => logger.info('Serviço de e-mail configurado e verificado.'),
        (error: unknown) =>
          logger.error(
            error,
            'Falha ao verificar conexão do serviço de e-mail.',
          ),
      );
    } catch (error) {
      logger.error(error, 'Erro ao inicializar transporter de e-mail.');
    }
  }

  private async sendMailComRetry(
    mailOptions: Parameters<Transporter['sendMail']>[0],
  ): Promise<{ messageId: string }> {
    let ultimoErro: unknown;

    for (let tentativa = 1; tentativa <= ENVIO_MAX_TENTATIVAS; tentativa++) {
      try {
        return await this.transporter!.sendMail(mailOptions);
      } catch (error) {
        ultimoErro = error;
        logger.warn(
          { tentativa, maxTentativas: ENVIO_MAX_TENTATIVAS, error },
          'Falha ao enviar e-mail, tentando novamente.',
        );
        if (tentativa < ENVIO_MAX_TENTATIVAS) {
          await sleep(ENVIO_BACKOFF_MS * tentativa);
        }
      }
    }

    throw ultimoErro;
  }

  async enviarEmail(
    to: string,
    subject: string,
    text: string,
    html: string | null = null,
  ): Promise<{ success: boolean; messageId: string }> {
    if (!this.transporter) {
      throw new CustomError({
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
        errorType: 'emailServiceUnavailable',
        field: 'Email',
        details: [],
        customMessage: 'Serviço de e-mail não está configurado.',
      });
    }

    const mailOptions = {
      from: `"${process.env['COMPANY_NAME'] || 'Estoque Inteligente'}" <${process.env['EMAIL_USER']}>`,
      to,
      subject,
      text,
      html: html ?? text,
    };

    try {
      const info = await this.sendMailComRetry(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(
        error,
        `Erro ao enviar e-mail para ${to} após ${ENVIO_MAX_TENTATIVAS} tentativa(s).`,
      );
      throw new CustomError({
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
        errorType: 'emailSendError',
        field: 'Email',
        details: [],
        customMessage: 'Erro ao enviar e-mail. Tente novamente mais tarde.',
      });
    }
  }

  async enviarEmailConvite(
    nome: string,
    email: string,
    token: string,
  ): Promise<{ success: boolean; messageId: string }> {
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const activationUrl = `${frontendUrl}/ativar-conta?token=${token}`;

    const subject = 'Ative sua conta';

    const text = `
Olá, ${nome}!

Sua conta foi criada. Clique no link para definir sua senha (ou entrar com Google usando o mesmo e-mail):
${activationUrl}

Link válido por 24 horas.

Equipe Estoque Inteligente
        `.trim();

    const html = renderEmailHtml({
      title: 'Bem-vindo ao Estoque Inteligente!',
      bodyHtml: `
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${esc(nome)}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 18px;">Sua conta foi criada no sistema. Para começar, clique no botão abaixo e defina sua senha (ou entre com Google usando o mesmo e-mail).</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${esc(activationUrl)}" style="display: inline-block; padding: 14px 32px; background-color: #306FCC; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Ativar minha conta</a>
            </div>
            <div style="margin-top: 25px; border-radius: 4px;">
                <p style="margin: 0; font-size: 18px;"><strong>Importante:</strong> Este link expira em 24 horas por segurança.</p>
            </div>`,
      footerExtraHtml:
        '<p style="margin: 0 0 8px 0; font-size: 16px;">Não solicitou este cadastro? Ignore este e-mail.</p>',
    });

    return this.enviarEmail(email, subject, text, html);
  }

  async enviarEmailNovoEmprestimo(
    nomeResponsavel: string,
    emailResponsavel: string,
    emprestimo: EmprestimoEmailData,
  ): Promise<{ success: boolean; messageId: string }> {
    const itemNome = emprestimo.item?.nome || 'Item desconhecido';
    const localizacaoNome =
      emprestimo.localizacao?.nome || 'Localização desconhecida';
    const solicitante = emprestimo.solicitante_nome;
    const quantidade = emprestimo.quantidade_emprestada;
    const dataPrevista = emprestimo.data_prevista_devolucao
      ? new Date(emprestimo.data_prevista_devolucao).toLocaleString('pt-BR')
      : 'Sem previsão';
    const dataSaida = new Date(emprestimo.data_saida!).toLocaleString('pt-BR');

    const observacoes = emprestimo.observacoes_emprestimo || '';
    const subject = `Novo empréstimo registrado — ${itemNome}`;

    const text = `
Olá, ${nomeResponsavel}!

Um novo empréstimo foi registrado no sistema.

Detalhes:
- Item: ${itemNome}
- Solicitante: ${solicitante}
- Localização: ${localizacaoNome}
- Quantidade emprestada: ${quantidade}
- Data de saída: ${dataSaida}
- Previsão de devolução: ${dataPrevista}${observacoes ? `\n- Observações: ${observacoes}` : ''}

Acesse o sistema para mais detalhes.

Equipe ${process.env['COMPANY_NAME'] || 'Estoque Inteligente'}
    `.trim();

    const html = renderEmailHtml({
      title: 'Novo Empréstimo Registrado',
      bodyHtml: `
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${esc(nomeResponsavel)}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">Um novo empréstimo foi registrado no sistema com os seguintes detalhes:</p>
            ${buildDetailsTable([
              { label: 'Item', value: esc(itemNome) },
              { label: 'Solicitante', value: esc(solicitante) },
              { label: 'Localização', value: esc(localizacaoNome) },
              { label: 'Quantidade emprestada', value: String(quantidade) },
              { label: 'Data de saída', value: dataSaida },
              { label: 'Previsão de devolução', value: dataPrevista },
              ...(observacoes
                ? [{ label: 'Observações', value: esc(observacoes) }]
                : []),
            ])}`,
    });

    return this.enviarEmail(emailResponsavel, subject, text, html);
  }

  async enviarEmailDevolucaoEmprestimo(
    nomeResponsavel: string,
    emailResponsavel: string,
    emprestimo: EmprestimoEmailData,
    quantidadeDevolvida: number,
  ): Promise<{ success: boolean; messageId: string }> {
    const itemNome = emprestimo.item?.nome || 'Item desconhecido';
    const localizacaoNome =
      emprestimo.localizacao?.nome || 'Localização desconhecida';
    const solicitante = emprestimo.solicitante_nome;
    const quantidadeAberta = emprestimo.quantidade_aberta ?? 0;
    const totalmenteDevolvido = quantidadeAberta <= 0;
    const observacoesDevolucao = emprestimo.observacoes_devolucao || '';
    const dataDevolucao = new Date().toLocaleString('pt-BR');

    const subject = totalmenteDevolvido
      ? `Empréstimo devolvido — ${itemNome}`
      : `Devolução parcial registrada — ${itemNome}`;

    const text = `
Olá, ${nomeResponsavel}!

${totalmenteDevolvido ? 'O empréstimo abaixo foi totalmente devolvido.' : 'Uma devolução parcial foi registrada para o empréstimo abaixo.'}

Detalhes:
- Item: ${itemNome}
- Solicitante: ${solicitante}
- Localização: ${localizacaoNome}
- Quantidade devolvida: ${quantidadeDevolvida}
- Quantidade ainda em aberto: ${quantidadeAberta}
- Data da devolução: ${dataDevolucao}${observacoesDevolucao ? `\n- Observações: ${observacoesDevolucao}` : ''}

Equipe ${process.env['COMPANY_NAME'] || 'Estoque Inteligente'}
    `.trim();

    const html = renderEmailHtml({
      title: totalmenteDevolvido
        ? 'Empréstimo Devolvido'
        : 'Devolução Parcial Registrada',
      bodyHtml: `
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${esc(nomeResponsavel)}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">${totalmenteDevolvido ? 'O empréstimo abaixo foi <strong>totalmente devolvido</strong>.' : 'Uma <strong>devolução parcial</strong> foi registrada para o empréstimo abaixo.'}</p>
            ${buildDetailsTable([
              { label: 'Item', value: esc(itemNome) },
              { label: 'Solicitante', value: esc(solicitante) },
              { label: 'Localização', value: esc(localizacaoNome) },
              {
                label: 'Quantidade devolvida',
                value: String(quantidadeDevolvida),
                valueColor: '#16a34a',
              },
              {
                label: 'Quantidade em aberto',
                value: String(quantidadeAberta),
              },
              { label: 'Data da devolução', value: dataDevolucao },
              ...(observacoesDevolucao
                ? [{ label: 'Observações', value: esc(observacoesDevolucao) }]
                : []),
            ])}`,
    });

    return this.enviarEmail(emailResponsavel, subject, text, html);
  }

  async enviarEmailEmprestimoAtrasado(
    nomeResponsavel: string,
    emailResponsavel: string,
    emprestimo: EmprestimoEmailData,
  ): Promise<{ success: boolean; messageId: string }> {
    const itemNome = emprestimo.item?.nome || 'Item desconhecido';
    const localizacaoNome =
      emprestimo.localizacao?.nome || 'Localização desconhecida';
    const solicitante = emprestimo.solicitante_nome;
    const quantidadeAberta = emprestimo.quantidade_aberta ?? 0;
    const dataPrevista = new Date(emprestimo.data_prevista_devolucao!);
    const hoje = new Date();
    const diasAtraso = Math.floor(
      (hoje.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dataPrevistaFormatada = dataPrevista.toLocaleString('pt-BR');

    const subject = `Empréstimo em atraso — ${itemNome}`;

    const text = `
Olá, ${nomeResponsavel}!

O empréstimo abaixo está em atraso há ${diasAtraso} dia(s).

Detalhes:
- Item: ${itemNome}
- Solicitante: ${solicitante}
- Localização: ${localizacaoNome}
- Quantidade em aberto: ${quantidadeAberta}
- Previsão de devolução: ${dataPrevistaFormatada}
- Dias em atraso: ${diasAtraso}

Por favor, tome as providências necessárias.

Equipe ${process.env['COMPANY_NAME'] || 'Estoque Inteligente'}
    `.trim();

    const html = renderEmailHtml({
      title: 'Empréstimo em Atraso',
      titleColor: '#dc2626',
      bodyHtml: `
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${esc(nomeResponsavel)}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">O empréstimo abaixo está em atraso há <strong style="color: #dc2626;">${diasAtraso} dia(s)</strong>. Por favor, tome as providências necessárias.</p>
            ${buildDetailsTable([
              { label: 'Item', value: esc(itemNome) },
              { label: 'Solicitante', value: esc(solicitante) },
              { label: 'Localização', value: esc(localizacaoNome) },
              {
                label: 'Quantidade em aberto',
                value: String(quantidadeAberta),
              },
              { label: 'Previsão de devolução', value: dataPrevistaFormatada },
              {
                label: 'Dias em atraso',
                value: `${diasAtraso} dia(s)`,
                valueColor: '#dc2626',
              },
            ])}`,
    });

    return this.enviarEmail(emailResponsavel, subject, text, html);
  }

  async enviarEmailRecuperacaoSenha(
    nome: string,
    email: string,
    token: string,
  ): Promise<{ success: boolean; messageId: string }> {
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/redefinir-senha?token=${token}`;

    const subject = 'Recuperação de senha';

    const text = `
Olá, ${nome}!

Você solicitou a recuperação de senha da sua conta no Estoque Inteligente.

Clique no link abaixo para redefinir sua senha:
${resetUrl}

Este link é válido por 24 horas.

Se você não solicitou esta recuperação, ignore este e-mail.

Equipe Estoque Inteligente
        `.trim();

    const html = renderEmailHtml({
      title: 'Recuperação de Senha',
      bodyHtml: `
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${esc(nome)}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 18px;">Você solicitou a recuperação de senha da sua conta. Para redefinir, clique no botão abaixo.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${esc(resetUrl)}" style="display: inline-block; padding: 14px 32px; background-color: #306FCC; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Redefinir minha senha</a>
            </div>
            <div style="margin-top: 25px; border-radius: 4px;">
                <p style="margin: 0; font-size: 18px;"><strong>Importante:</strong> Este link expira em 24 horas por segurança.</p>
            </div>`,
      footerExtraHtml:
        '<p style="margin: 0 0 8px 0; font-size: 16px;">Não solicitou esta recuperação? Ignore este e-mail.</p>',
    });

    return this.enviarEmail(email, subject, text, html);
  }
}

export default new EmailService();
