import MovimentacaoModel from '../../../modules/movimentacao/MovimentacaoModel.js';
import ItemModel from '../../../modules/item/ItemModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';
import { resultadoLimitado } from '../resultadoLimitado.js';

export async function buscarMovimentacoes(
  {
    tipo,
    dataInicio,
    dataFim,
    itemNome,
    localizacao,
    limite = 20,
  }: {
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
    itemNome?: string;
    localizacao?: string;
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

  if (itemNome) {
    const itensCorrespondentes = await ItemModel.find({
      nome: { $regex: itemNome, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['item'] = { $in: itensCorrespondentes.map((i) => i._id) };
  }

  if (localizacao) {
    const localizacoesCorrespondentes = await LocalizacaoModel.find({
      nome: { $regex: localizacao, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['localizacao'] = {
      $in: localizacoesCorrespondentes.map((l) => l._id),
    };
  }

  const [movimentacoes, total] = await Promise.all([
    MovimentacaoModel.find(filtros)
      .populate('item', 'nome')
      .populate('localizacao', 'nome')
      .populate('usuario', 'nome')
      .sort({ data_hora: -1 })
      .limit(Math.min(Number(limite), 50))
      .lean(),
    MovimentacaoModel.countDocuments(filtros),
  ]);

  const registrosFormatados = movimentacoes.map((m) => {
    const mObj = m as Record<string, unknown>;
    const item = mObj['item'] as Record<string, unknown> | null;
    const localizacaoPopulada = mObj['localizacao'] as Record<
      string,
      unknown
    > | null;
    const usuario = mObj['usuario'] as Record<string, unknown> | null;
    return {
      tipo: mObj['tipo'],
      item: item?.['nome'] ?? null,
      localizacao: localizacaoPopulada?.['nome'] ?? null,
      quantidade: mObj['quantidade'],
      responsavel: usuario?.['nome'] ?? null,
      data_hora: mObj['data_hora'],
    };
  });

  return resultadoLimitado(registrosFormatados, total);
}
