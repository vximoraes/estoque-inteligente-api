import EmprestimoModel from '../../../modules/emprestimo/EmprestimoModel.js';

export async function buscarEmprestimos({ status, solicitanteNome, limite = 20 }, _usuarioId) {
  const filtros = { ativo: true };

  if (solicitanteNome) {
    filtros.solicitante_nome = { $regex: solicitanteNome, $options: 'i' };
  }

  const emprestimos = await EmprestimoModel.find(filtros)
    .populate('item', 'nome')
    .populate('localizacao', 'nome')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limite) * 3, 150))
    .lean();

  const hoje = new Date();
  const comStatus = emprestimos.map((e) => {
    let statusCalculado;
    if (e.quantidade_aberta <= 0) {
      statusCalculado = 'Devolvido';
    } else if (e.data_prevista_devolucao && new Date(e.data_prevista_devolucao) < hoje) {
      statusCalculado = 'Atrasado';
    } else {
      statusCalculado = 'Ativo';
    }
    return { ...e, statusCalculado };
  });

  const filtrados = status ? comStatus.filter((e) => e.statusCalculado === status) : comStatus;

  return filtrados.slice(0, Math.min(Number(limite), 50)).map((e) => ({
    item: e.item?.nome ?? null,
    localizacao: e.localizacao?.nome ?? null,
    solicitante: e.solicitante_nome,
    quantidade_emprestada: e.quantidade_emprestada,
    quantidade_devolvida: e.quantidade_devolvida,
    quantidade_aberta: e.quantidade_aberta,
    data_prevista_devolucao: e.data_prevista_devolucao,
    status: e.statusCalculado,
  }));
}
