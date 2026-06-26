import ItemModel from '../../../modules/item/ItemModel.js';

export async function buscarItens(
  {
    nome,
    status,
    limite = 20,
  }: { nome?: string; status?: string; limite?: number },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };

  if (nome) filtros['nome'] = { $regex: nome, $options: 'i' };
  if (status) filtros['status'] = status;

  const itens = await ItemModel.find(filtros)
    .populate('categoria', 'nome')
    .limit(Math.min(Number(limite), 50))
    .sort({ nome: 1 })
    .lean();

  return itens.map((item) => {
    const itemObj = item as Record<string, unknown>;
    const categoria = itemObj['categoria'] as Record<string, unknown> | null;
    return {
      id: item._id,
      nome: item.nome,
      descricao: item.descricao,
      quantidade: item.quantidade,
      estoque_minimo: item.estoque_minimo,
      status: item.status,
      categoria: categoria?.['nome'] ?? null,
    };
  });
}
