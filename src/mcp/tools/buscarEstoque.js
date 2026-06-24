import EstoqueModel from '../../modules/estoque/EstoqueModel.js';

export async function buscarEstoque({ itemId, localizacaoId, limite = 20 }, _usuarioId) {
  const filtros = {};

  if (itemId) filtros.item = itemId;
  if (localizacaoId) filtros.localizacao = localizacaoId;

  const registros = await EstoqueModel.find(filtros)
    .populate('item', 'nome status')
    .populate('localizacao', 'nome')
    .limit(Math.min(Number(limite), 50))
    .sort({ updatedAt: -1 })
    .lean();

  return registros.map((r) => ({
    item: r.item?.nome ?? r.item,
    localizacao: r.localizacao?.nome ?? r.localizacao,
    quantidade: r.quantidade,
    atualizado_em: r.updatedAt,
  }));
}
