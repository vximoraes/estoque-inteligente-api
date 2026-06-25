import OrcamentoModel from '../../../modules/orcamento/OrcamentoModel.js';

export async function buscarOrcamentos({ nome, limite = 20 }, _usuarioId) {
  const filtros = { ativo: true };

  if (nome) filtros.nome = { $regex: nome, $options: 'i' };

  const orcamentos = await OrcamentoModel.find(filtros)
    .populate('itens.item', 'nome')
    .populate('itens.fornecedor', 'nome')
    .limit(Math.min(Number(limite), 50))
    .sort({ createdAt: -1 })
    .lean();

  return orcamentos.map((o) => ({
    id: o._id,
    nome: o.nome,
    descricao: o.descricao,
    total: o.total,
    quantidade_itens: o.itens?.length ?? 0,
    itens: o.itens?.map((i) => ({
      item: i.item?.nome ?? i.nome,
      fornecedor: i.fornecedor?.nome ?? null,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      subtotal: i.subtotal,
    })),
    criado_em: o.createdAt,
  }));
}
