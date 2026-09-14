import EstoqueModel from '../../../modules/estoque/EstoqueModel.js';
import ItemModel from '../../../modules/item/ItemModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';

export async function buscarEstoque(
  {
    itemId,
    itemNome,
    localizacaoId,
    localizacaoNome,
    limite = 20,
  }: {
    itemId?: string;
    itemNome?: string;
    localizacaoId?: string;
    localizacaoNome?: string;
    limite?: number;
  },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = {};

  if (itemId) filtros['item'] = itemId;
  if (localizacaoId) filtros['localizacao'] = localizacaoId;

  if (itemNome) {
    const itensCorrespondentes = await ItemModel.find({
      nome: { $regex: itemNome, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['item'] = { $in: itensCorrespondentes.map((i) => i._id) };
  }

  if (localizacaoNome) {
    const localizacoesCorrespondentes = await LocalizacaoModel.find({
      nome: { $regex: localizacaoNome, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['localizacao'] = {
      $in: localizacoesCorrespondentes.map((l) => l._id),
    };
  }

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
