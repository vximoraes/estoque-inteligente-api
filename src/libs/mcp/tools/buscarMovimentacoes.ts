import MovimentacaoModel from '../../../modules/movimentacao/MovimentacaoModel.js';

export async function buscarMovimentacoes(
  {
    tipo,
    dataInicio,
    dataFim,
    itemNome,
    limite = 20,
  }: {
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
    itemNome?: string;
    limite?: number;
  },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = {};

  if (tipo) filtros['tipo'] = tipo;

  if (dataInicio || dataFim) {
    const data_hora: Record<string, Date> = {};
    if (dataInicio) data_hora['$gte'] = new Date(dataInicio);
    if (dataFim) data_hora['$lte'] = new Date(dataFim);
    filtros['data_hora'] = data_hora;
  }

  const movimentacoes = await MovimentacaoModel.find(filtros)
    .populate('item', 'nome')
    .populate('localizacao', 'nome')
    .populate('usuario', 'nome')
    .sort({ data_hora: -1 })
    .limit(Math.min(Number(limite), 50))
    .lean();

  const resultado = movimentacoes.filter((m) => {
    if (itemNome) {
      const mObj = m as Record<string, unknown>;
      const item = mObj['item'] as Record<string, unknown> | null;
      const nomeLower = String(item?.['nome'] ?? '').toLowerCase();
      return nomeLower.includes(itemNome.toLowerCase());
    }
    return true;
  });

  return resultado.map((m) => {
    const mObj = m as Record<string, unknown>;
    const item = mObj['item'] as Record<string, unknown> | null;
    const localizacao = mObj['localizacao'] as Record<string, unknown> | null;
    const usuario = mObj['usuario'] as Record<string, unknown> | null;
    return {
      tipo: mObj['tipo'],
      item: item?.['nome'] ?? null,
      localizacao: localizacao?.['nome'] ?? null,
      quantidade: mObj['quantidade'],
      responsavel: usuario?.['nome'] ?? null,
      data_hora: mObj['data_hora'],
    };
  });
}
