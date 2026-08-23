import mongoose from 'mongoose';
import ItemModel from '../../../modules/item/ItemModel.js';
import MovimentacaoModel from '../../../modules/movimentacao/MovimentacaoModel.js';

const JANELA_DIAS = 30;

export async function itensPrioritariosCompra(
  _args: unknown,
  _usuarioId: string,
) {
  const desde = new Date(Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000);

  const itens = await ItemModel.find({
    ativo: true,
    tipo: 'consumo',
    status: { $in: ['Baixo Estoque', 'Indisponível'] },
  })
    .populate('categoria', 'nome')
    .lean();

  if (itens.length === 0) return [];

  const itemIds = itens.map((item) => item._id as mongoose.Types.ObjectId);

  const contagemSaidas = await MovimentacaoModel.aggregate<{
    _id: mongoose.Types.ObjectId;
    total: number;
  }>([
    {
      $match: {
        tipo: 'saida',
        data_hora: { $gte: desde },
        item: { $in: itemIds },
      },
    },
    { $group: { _id: '$item', total: { $sum: '$quantidade' } } },
  ]);

  const saidasPorItem = new Map(
    contagemSaidas.map((c) => [c._id.toString(), c.total]),
  );

  return itens
    .map((item) => {
      const itemObj = item as Record<string, unknown>;
      const categoria = itemObj['categoria'] as Record<string, unknown> | null;
      const quantidade = Number(item.quantidade);
      const estoqueMinimo = Number(item.estoque_minimo);
      const deficit = estoqueMinimo - quantidade;
      const saidas30dias = saidasPorItem.get(String(item._id)) ?? 0;

      return {
        nome: item.nome,
        quantidade_atual: quantidade,
        estoque_minimo: estoqueMinimo,
        status: item.status,
        categoria: categoria?.['nome'] ?? null,
        deficit,
        saidas_30_dias: saidas30dias,
        score_prioridade: deficit * (1 + saidas30dias),
      };
    })
    .sort((a, b) => b.score_prioridade - a.score_prioridade);
}
