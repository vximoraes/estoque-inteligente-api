import ItemModel from '../../../modules/item/ItemModel.js';

export async function verificarItensAbaixoMinimo(_args, _usuarioId) {
  const itens = await ItemModel.find({
    ativo: true,
    status: { $in: ['Baixo Estoque', 'Indisponível'] },
  })
    .populate('categoria', 'nome')
    .sort({ quantidade: 1 })
    .lean();

  return itens.map((item) => ({
    nome: item.nome,
    quantidade_atual: item.quantidade,
    estoque_minimo: item.estoque_minimo,
    status: item.status,
    categoria: item.categoria?.nome ?? null,
    deficit: item.estoque_minimo - item.quantidade,
  }));
}
