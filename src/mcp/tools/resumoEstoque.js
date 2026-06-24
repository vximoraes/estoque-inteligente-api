import ItemModel from '../../modules/item/ItemModel.js';
import EmprestimoModel from '../../modules/emprestimo/EmprestimoModel.js';

export async function resumoEstoque(_args, _usuarioId) {
  const [totalItens, emEstoque, baixoEstoque, indisponivel, totalEmprestimosAtivos] =
    await Promise.all([
      ItemModel.countDocuments({ ativo: true }),
      ItemModel.countDocuments({ ativo: true, status: 'Em Estoque' }),
      ItemModel.countDocuments({ ativo: true, status: 'Baixo Estoque' }),
      ItemModel.countDocuments({ ativo: true, status: 'Indisponível' }),
      EmprestimoModel.countDocuments({ ativo: true, quantidade_aberta: { $gt: 0 } }),
    ]);

  const hoje = new Date();
  const emprestimosAtrasados = await EmprestimoModel.countDocuments({
    ativo: true,
    quantidade_aberta: { $gt: 0 },
    data_prevista_devolucao: { $lt: hoje },
  });

  return {
    total_itens: totalItens,
    em_estoque: emEstoque,
    baixo_estoque: baixoEstoque,
    indisponivel: indisponivel,
    emprestimos_ativos: totalEmprestimosAtivos,
    emprestimos_atrasados: emprestimosAtrasados,
  };
}
