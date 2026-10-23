const ETAPAS: Record<string, string> = {
  buscarItens: 'Consultando itens do almoxarifado',
  buscarPatrimonios: 'Consultando patrimônios',
  buscarEstoque: 'Consultando estoque por local',
  buscarMovimentacoes: 'Consultando movimentações',
  buscarEmprestimos: 'Consultando empréstimos',
  verificarItensAbaixoMinimo: 'Verificando itens abaixo do mínimo',
  itensPrioritariosCompra: 'Calculando prioridade de compra',
  buscarCategorias: 'Consultando categorias',
  buscarLocalizacoes: 'Consultando localizações',
  buscarFornecedores: 'Consultando fornecedores',
  resumoEstoque: 'Montando o resumo do estoque',
  historicoPatrimonio: 'Consultando o histórico do patrimônio',
  buscarUsuarios: 'Consultando usuários',
};

export function etapaDaFerramenta(nome: string | undefined): string {
  const chave = Object.keys(ETAPAS).find((ferramenta) =>
    nome?.endsWith(ferramenta),
  );
  return `${chave ? ETAPAS[chave] : 'Consultando os dados'}…`;
}
