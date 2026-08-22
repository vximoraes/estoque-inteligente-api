import ItemModel from '../../../modules/item/ItemModel.js';
import EmprestimoModel from '../../../modules/emprestimo/EmprestimoModel.js';
import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';

export async function resumoEstoque(_args: unknown, _usuarioId: string) {
  const [
    totalItens,
    emEstoque,
    baixoEstoque,
    indisponivel,
    totalEmprestimosAtivos,
    totalItensPermanentes,
    unidadesDisponiveis,
    unidadesEmprestadas,
    unidadesManutencao,
  ] = await Promise.all([
    ItemModel.countDocuments({ ativo: true }),
    ItemModel.countDocuments({ ativo: true, status: 'Em Estoque' }),
    ItemModel.countDocuments({ ativo: true, status: 'Baixo Estoque' }),
    ItemModel.countDocuments({ ativo: true, status: 'Indisponível' }),
    EmprestimoModel.countDocuments({
      ativo: true,
      quantidade_aberta: { $gt: 0 },
    }),
    ItemModel.countDocuments({ ativo: true, tipo: 'permanente' }),
    PatrimonioModel.countDocuments({ ativo: true, status: 'Disponível' }),
    PatrimonioModel.countDocuments({ ativo: true, status: 'Emprestado' }),
    PatrimonioModel.countDocuments({ ativo: true, status: 'Manutenção' }),
  ]);

  const totalUnidadesPatrimonio =
    unidadesDisponiveis + unidadesEmprestadas + unidadesManutencao;

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
    indisponivel,
    emprestimos_ativos: totalEmprestimosAtivos,
    emprestimos_atrasados: emprestimosAtrasados,
    total_itens_permanentes: totalItensPermanentes,
    total_unidades_patrimonio: totalUnidadesPatrimonio,
    unidades_disponiveis: unidadesDisponiveis,
    unidades_emprestadas: unidadesEmprestadas,
    unidades_manutencao: unidadesManutencao,
  };
}
