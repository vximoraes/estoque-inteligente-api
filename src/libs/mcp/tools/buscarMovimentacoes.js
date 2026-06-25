import MovimentacaoModel from '../../../modules/movimentacao/MovimentacaoModel.js';

export async function buscarMovimentacoes(
  { tipo, dataInicio, dataFim, itemNome, limite = 20 },
  _usuarioId,
) {
  const filtros = {};

  if (tipo) filtros.tipo = tipo;

  if (dataInicio || dataFim) {
    filtros.data_hora = {};
    if (dataInicio) filtros.data_hora.$gte = new Date(dataInicio);
    if (dataFim) filtros.data_hora.$lte = new Date(dataFim);
  }

  let query = MovimentacaoModel.find(filtros)
    .populate('item', 'nome')
    .populate('localizacao', 'nome')
    .populate('usuario', 'nome')
    .sort({ data_hora: -1 })
    .limit(Math.min(Number(limite), 50));

  const movimentacoes = await query.lean();

  const resultado = movimentacoes.filter((m) => {
    if (itemNome) {
      return m.item?.nome?.toLowerCase().includes(itemNome.toLowerCase());
    }
    return true;
  });

  return resultado.map((m) => ({
    tipo: m.tipo,
    item: m.item?.nome ?? null,
    localizacao: m.localizacao?.nome ?? null,
    quantidade: m.quantidade,
    responsavel: m.usuario?.nome ?? null,
    data_hora: m.data_hora,
  }));
}
