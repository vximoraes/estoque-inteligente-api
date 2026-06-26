import OrcamentoModel from '../../../modules/orcamento/OrcamentoModel.js';

export async function buscarOrcamentos(
  { nome, limite = 20 }: { nome?: string; limite?: number },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };

  if (nome) filtros['nome'] = { $regex: nome, $options: 'i' };

  const orcamentos = await OrcamentoModel.find(filtros)
    .populate('itens.item', 'nome')
    .populate('itens.fornecedor', 'nome')
    .limit(Math.min(Number(limite), 50))
    .sort({ createdAt: -1 })
    .lean();

  return orcamentos.map((o) => {
    const oObj = o as Record<string, unknown>;
    const itens = oObj['itens'] as Array<Record<string, unknown>> | undefined;
    return {
      id: o._id,
      nome: oObj['nome'],
      descricao: oObj['descricao'],
      total: oObj['total'],
      quantidade_itens: itens?.length ?? 0,
      itens: itens?.map((i) => {
        const item = i['item'] as Record<string, unknown> | null;
        const fornecedor = i['fornecedor'] as Record<string, unknown> | null;
        return {
          item: item?.['nome'] ?? i['nome'],
          fornecedor: fornecedor?.['nome'] ?? null,
          quantidade: i['quantidade'],
          valor_unitario: i['valor_unitario'],
          subtotal: i['subtotal'],
        };
      }),
      criado_em: oObj['createdAt'],
    };
  });
}
