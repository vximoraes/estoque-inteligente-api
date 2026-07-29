import EstoqueModel from '../../../modules/estoque/EstoqueModel.js';

export async function buscarEstoque(
  {
    itemId,
    localizacaoId,
    limite = 20,
  }: { itemId?: string; localizacaoId?: string; limite?: number },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = {};

  if (itemId) filtros['item'] = itemId;
  if (localizacaoId) filtros['localizacao'] = localizacaoId;

  const registros = await EstoqueModel.find(filtros)
    .populate('item', 'nome status')
    .populate('localizacao', 'nome')
    .limit(Math.min(Number(limite), 50))
    .sort({ updatedAt: -1 })
    .lean();

  return registros.map((r) => {
    const rObj = r as Record<string, unknown>;
    const item = rObj['item'] as Record<string, unknown> | null;
    const localizacao = rObj['localizacao'] as Record<string, unknown> | null;
    return {
      item: item?.['nome'] ?? rObj['item'],
      localizacao: localizacao?.['nome'] ?? rObj['localizacao'],
      quantidade: rObj['quantidade'],
      atualizado_em: rObj['updatedAt'],
    };
  });
}
