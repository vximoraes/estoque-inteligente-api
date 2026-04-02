import EmprestimoModel from '../models/Emprestimo.js';
import EmailService from '../services/EmailService.js';
import logger from '../utils/logger.js';

const INTERVALO_MS = 60 * 60 * 1000;

export async function verificarEmprestimosAtrasados() {
  const hoje = new Date();

  let emprestimosAtrasados;
  try {
    emprestimosAtrasados = await EmprestimoModel.find({
      ativo: true,
      quantidade_aberta: { $gt: 0 },
      data_prevista_devolucao: { $lt: hoje },
      email_atraso_enviado: { $ne: true },
    })
      .populate('item', 'nome')
      .populate('localizacao', 'nome');
  } catch (err) {
    logger.error('Erro ao buscar empréstimos atrasados:', err);
    return;
  }

  if (emprestimosAtrasados.length === 0) return;

  logger.info(`Job de atraso: ${emprestimosAtrasados.length} empréstimo(s) atrasado(s) encontrado(s).`);

  for (const emp of emprestimosAtrasados) {
    if (emp.solicitante_email) {
      try {
        await EmailService.enviarEmailEmprestimoAtrasado(
          emp.solicitante_nome,
          emp.solicitante_email,
          emp,
        );
      } catch (err) {
        logger.error(`Erro ao enviar e-mail de atraso para empréstimo ${emp._id}:`, err);
      }
    }

    await EmprestimoModel.updateOne({ _id: emp._id }, { email_atraso_enviado: true });
  }
}

export function iniciarJobEmprestimosAtrasados() {
  verificarEmprestimosAtrasados().catch((err) =>
    logger.error('Erro inesperado no job de empréstimos atrasados:', err),
  );

  setInterval(() => {
    verificarEmprestimosAtrasados().catch((err) =>
      logger.error('Erro inesperado no job de empréstimos atrasados:', err),
    );
  }, INTERVALO_MS);

  logger.info('Job de empréstimos atrasados inicializado (intervalo: 1h)');
}
