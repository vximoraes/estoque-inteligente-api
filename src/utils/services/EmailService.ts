import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { CustomError, HttpStatusCodes } from '../../utils/helpers/index.js';

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
      console.warn(
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
    } catch (_error) {}
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
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (_error) {
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

Sua conta foi criada. Clique no link para definir sua senha:
${activationUrl}

Link válido por 5 minutos.

Equipe Estoque Inteligente
        `.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #306FCC; font-size: 24px; margin-bottom: 20px; margin-top: 0;">Bem-vindo ao Estoque Inteligente!</h1>
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${nome}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 18px;">Sua conta foi criada no sistema. Para começar, clique no botão abaixo e defina sua senha.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${activationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #306FCC; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Ativar minha conta</a>
            </div>
            <div style="margin-top: 25px; border-radius: 4px;">
                <p style="margin: 0; font-size: 18px;"><strong>Importante:</strong> Este link expira em 5 minutos por segurança.</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p style="margin: 0 0 8px 0; font-size: 16px;">Não solicitou este cadastro? Ignore este e-mail.</p>
                <p style="margin: 0; font-size: 16px; color: #999;">Equipe Estoque Inteligente</p>
            </div>
        </div>
    </div>
</body>
</html>
        `.trim();

    return this.enviarEmail(email, subject, text, html);
  }

  async enviarEmailNovoEmprestimo(
    nomeResponsavel: string,
    emailResponsavel: string,
    emprestimo: EmprestimoEmailData,
  ): Promise<{ success: boolean; messageId: string }> {
    const itemNome = emprestimo.item?.nome || 'Item desconhecido';
    const localizacaoNome = emprestimo.localizacao?.nome || 'Localização desconhecida';
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

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #306FCC; font-size: 24px; margin-bottom: 20px; margin-top: 0;">Novo Empréstimo Registrado</h1>
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${nomeResponsavel}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">Um novo empréstimo foi registrado no sistema com os seguintes detalhes:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6; width: 40%;">Item</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${itemNome}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Solicitante</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${solicitante}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Localização</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${localizacaoNome}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Quantidade emprestada</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${quantidade}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Data de saída</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${dataSaida}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Previsão de devolução</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${dataPrevista}</td>
                </tr>
                ${observacoes ? `<tr style="background-color: #f8f9fa;"><td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Observações</td><td style="padding: 10px 14px; border: 1px solid #dee2e6;">${observacoes}</td></tr>` : ''}
            </table>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="margin: 0; font-size: 16px; color: #999;">Equipe ${process.env['COMPANY_NAME'] || 'Estoque Inteligente'}</p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();

    return this.enviarEmail(emailResponsavel, subject, text, html);
  }

  async enviarEmailDevolucaoEmprestimo(
    nomeResponsavel: string,
    emailResponsavel: string,
    emprestimo: EmprestimoEmailData,
    quantidadeDevolvida: number,
  ): Promise<{ success: boolean; messageId: string }> {
    const itemNome = emprestimo.item?.nome || 'Item desconhecido';
    const localizacaoNome = emprestimo.localizacao?.nome || 'Localização desconhecida';
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

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #306FCC; font-size: 24px; margin-bottom: 20px; margin-top: 0;">${totalmenteDevolvido ? 'Empréstimo Devolvido' : 'Devolução Parcial Registrada'}</h1>
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${nomeResponsavel}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">${totalmenteDevolvido ? 'O empréstimo abaixo foi <strong>totalmente devolvido</strong>.' : 'Uma <strong>devolução parcial</strong> foi registrada para o empréstimo abaixo.'}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6; width: 40%;">Item</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${itemNome}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Solicitante</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${solicitante}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Localização</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${localizacaoNome}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Quantidade devolvida</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6; color: #16a34a; font-weight: bold;">${quantidadeDevolvida}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Quantidade em aberto</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${quantidadeAberta}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Data da devolução</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${dataDevolucao}</td>
                </tr>
                ${observacoesDevolucao ? `<tr style="background-color: #f8f9fa;"><td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Observações</td><td style="padding: 10px 14px; border: 1px solid #dee2e6;">${observacoesDevolucao}</td></tr>` : ''}
            </table>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="margin: 0; font-size: 16px; color: #999;">Equipe ${process.env['COMPANY_NAME'] || 'Estoque Inteligente'}</p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();

    return this.enviarEmail(emailResponsavel, subject, text, html);
  }

  async enviarEmailEmprestimoAtrasado(
    nomeResponsavel: string,
    emailResponsavel: string,
    emprestimo: EmprestimoEmailData,
  ): Promise<{ success: boolean; messageId: string }> {
    const itemNome = emprestimo.item?.nome || 'Item desconhecido';
    const localizacaoNome = emprestimo.localizacao?.nome || 'Localização desconhecida';
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

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px; margin-top: 0;">Empréstimo em Atraso</h1>
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${nomeResponsavel}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">O empréstimo abaixo está em atraso há <strong style="color: #dc2626;">${diasAtraso} dia(s)</strong>. Por favor, tome as providências necessárias.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6; width: 40%;">Item</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${itemNome}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Solicitante</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${solicitante}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Localização</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${localizacaoNome}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Quantidade em aberto</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${quantidadeAberta}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6;">Previsão de devolução</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${dataPrevistaFormatada}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 14px; font-weight: bold; border: 1px solid #dee2e6; color: #dc2626;">Dias em atraso</td>
                    <td style="padding: 10px 14px; border: 1px solid #dee2e6; color: #dc2626; font-weight: bold;">${diasAtraso} dia(s)</td>
                </tr>
            </table>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="margin: 0; font-size: 16px; color: #999;">Equipe ${process.env['COMPANY_NAME'] || 'Estoque Inteligente'}</p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();

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

Este link é válido por 5 minutos.

Se você não solicitou esta recuperação, ignore este e-mail.

Equipe Estoque Inteligente
        `.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #306FCC; font-size: 24px; margin-bottom: 20px; margin-top: 0;">Recuperação de Senha</h1>
            <p style="margin: 0 0 15px 0; font-size: 18px;">Olá, <strong>${nome}</strong>!</p>
            <p style="margin: 0 0 20px 0; font-size: 18px;">Você solicitou a recuperação de senha da sua conta. Para redefinir, clique no botão abaixo.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #306FCC; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Redefinir minha senha</a>
            </div>
            <div style="margin-top: 25px; border-radius: 4px;">
                <p style="margin: 0; font-size: 18px;"><strong>Importante:</strong> Este link expira em 5 minutos por segurança.</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p style="margin: 0 0 8px 0; font-size: 16px;">Não solicitou esta recuperação? Ignore este e-mail.</p>
                <p style="margin: 0; font-size: 16px; color: #999;">Equipe Estoque Inteligente</p>
            </div>
        </div>
    </div>
</body>
</html>
        `.trim();

    return this.enviarEmail(email, subject, text, html);
  }
}

export default new EmailService();
