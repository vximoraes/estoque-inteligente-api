import ItemModel from '../../../modules/item/ItemModel.js';

export async function verificarItensAbaixoMinimo(
  _args: unknown,
  _usuarioId: string,
) {
  const itens = await ItemModel.find({
    ativo: true,
    status: { $in: ['Baixo Estoque', 'Indisponível'] },
  })
    .populate('categoria', 'nome')
    .sort({ quantidade: 1 })
    .lean();

  return itens.map((item) => {
    const itemObj = item as Record<string, unknown>;
    const categoria = itemObj['categoria'] as Record<string, unknown> | null;
    const quantidade = Number(item.quantidade);
    const estoqueMinimo = Number(item.estoque_minimo);
    return {
      nome: item.nome,
      quantidade_atual: quantidade,
      estoque_minimo: estoqueMinimo,
      status: item.status,
      categoria: categoria?.['nome'] ?? null,
      deficit: estoqueMinimo - quantidade,
    };
  });
}
