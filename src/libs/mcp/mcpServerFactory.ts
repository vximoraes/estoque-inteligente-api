import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buscarItens } from './tools/buscarItens.js';
import { buscarPatrimonios } from './tools/buscarPatrimonios.js';
import { buscarEstoque } from './tools/buscarEstoque.js';
import { buscarMovimentacoes } from './tools/buscarMovimentacoes.js';
import { buscarEmprestimos } from './tools/buscarEmprestimos.js';
import { verificarItensAbaixoMinimo } from './tools/verificarItensAbaixoMinimo.js';
import { itensPrioritariosCompra } from './tools/itensPrioritariosCompra.js';
import { buscarCategorias } from './tools/buscarCategorias.js';
import { buscarLocalizacoes } from './tools/buscarLocalizacoes.js';
import { buscarFornecedores } from './tools/buscarFornecedores.js';
import { resumoEstoque } from './tools/resumoEstoque.js';
import { historicoPatrimonio } from './tools/historicoPatrimonio.js';
import { buscarUsuarios } from './tools/buscarUsuarios.js';
import { formatarResultado } from './formatarResultado.js';
import { fusoDoUsuario } from './fusoDoUsuario.js';
import { resumoMovimentacoes } from './tools/resumoMovimentacoes.js';
import { tendenciaMensal } from './tools/tendenciaMensal.js';
import PermissionService from '../../utils/services/PermissionService.js';

const permissionService = new PermissionService();

async function verificarPermissao(
  usuarioId: string,
  ...rotas: string[]
): Promise<void> {
  for (const rota of rotas) {
    const permitido = await permissionService.hasPermission(
      usuarioId,
      rota,
      'buscar',
    );
    if (!permitido) {
      throw new Error(`Permissão negada para acessar "${rota}".`);
    }
  }
}

export function criarMCPServer(usuarioId: string): McpServer {
  const server = new McpServer({
    name: 'estoque-inteligente',
    version: '1.0.0',
  });

  server.tool(
    'buscarItens',
    'Busca itens de consumo do almoxarifado com filtros opcionais de nome, status e tipo. Para bens permanentes (patrimônio, ex: notebooks) — número de patrimônio, modelo, localização de cada unidade — use buscarPatrimonios.',
    {
      nome: z
        .string()
        .optional()
        .describe('Filtrar por nome do item (busca parcial)'),
      status: z
        .enum(['Em Estoque', 'Baixo Estoque', 'Indisponível'])
        .optional()
        .describe('Filtrar pelo status do item'),
      categoria: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da categoria (busca parcial)'),
      localizacao: z
        .string()
        .optional()
        .describe(
          'Filtrar por itens com estoque na localização informada (busca parcial pelo nome)',
        ),
      ordenar: z
        .enum(['nome', 'mais_recentes', 'mais_antigos'])
        .optional()
        .default('nome')
        .describe(
          'Ordem dos resultados: por nome, ou pela data de cadastro (use mais_recentes para "último cadastrado/criado")',
        ),
      apenasMeus: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Somente os cadastrados pelo próprio usuário desta conversa (use em pedidos como "que eu criei", "meus itens")',
        ),
      buscaExata: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'true para o texto inteiro, ignorando maiúsculas (use em "chamado X", "com nome X", "igual a X"); false busca por trecho',
        ),
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({
      nome,
      status,
      categoria,
      localizacao,
      ordenar,
      apenasMeus,
      buscaExata,
      limite,
    }) => {
      await verificarPermissao(usuarioId, 'itens');
      const resultado = await buscarItens(
        {
          nome,
          status,
          categoria,
          localizacao,
          ordenar,
          apenasMeus,
          buscaExata,
          limite,
        },
        usuarioId,
      );
      return formatarResultado(
        'buscarItens',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarPatrimonios',
    'Busca unidades individuais de bens permanentes (patrimônio) por número de patrimônio, modelo, categoria, status ou localização. Use esta tool para perguntas sobre uma unidade específica, como "onde está o patrimônio X" ou "quais notebooks estão emprestados/em manutenção". O nome do modelo nem sempre contém o tipo do equipamento (ex: "MacBook Air M2" é um notebook): para perguntas por tipo de equipamento, filtre pela categoria correspondente (use buscarCategorias se não souber o nome) e selecione você mesmo os modelos do tipo pedido, excluindo da resposta as unidades da categoria que são de outro tipo.',
    {
      numeroPatrimonio: z
        .string()
        .optional()
        .describe('Filtrar por número de patrimônio (busca parcial)'),
      modelo: z
        .string()
        .optional()
        .describe(
          'Filtrar por trecho do nome do modelo (busca textual parcial, ex: "Inspiron", "MacBook"). Não use para tipo de equipamento; para isso, use categoria',
        ),
      status: z
        .enum(['Disponível', 'Emprestado', 'Manutenção', 'Baixado'])
        .optional()
        .describe('Filtrar pelo status da unidade'),
      localizacao: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da localização (busca parcial)'),
      categoria: z
        .string()
        .optional()
        .describe(
          'Filtrar pelo nome da categoria (busca parcial, ex: "Computadores")',
        ),
      ordenar: z
        .enum(['numero_patrimonio', 'mais_recentes', 'mais_antigos'])
        .optional()
        .default('numero_patrimonio')
        .describe(
          'Ordem dos resultados: por número de patrimônio, ou pela data de cadastro (use mais_recentes para "último cadastrado/criado")',
        ),
      apenasMeus: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Somente os cadastrados pelo próprio usuário desta conversa (use em pedidos como "que eu criei", "meus itens")',
        ),
      buscaExata: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'true para o texto inteiro, ignorando maiúsculas (use em "chamado X", "com nome X", "igual a X"); false busca por trecho',
        ),
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({
      numeroPatrimonio,
      modelo,
      status,
      localizacao,
      categoria,
      ordenar,
      apenasMeus,
      buscaExata,
      limite,
    }) => {
      await verificarPermissao(usuarioId, 'patrimonios');
      const resultado = await buscarPatrimonios(
        {
          numeroPatrimonio,
          modelo,
          status,
          localizacao,
          categoria,
          ordenar,
          apenasMeus,
          buscaExata,
          limite,
        },
        usuarioId,
      );
      return formatarResultado(
        'buscarPatrimonios',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarEstoque',
    'Busca registros de quantidade em estoque por item ou localização',
    {
      itemId: z.string().optional().describe('ID do item para filtrar'),
      itemNome: z
        .string()
        .optional()
        .describe('Filtrar pelo nome do item (busca parcial)'),
      localizacaoId: z
        .string()
        .optional()
        .describe('ID da localização para filtrar'),
      localizacaoNome: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da localização (busca parcial)'),
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({ itemId, itemNome, localizacaoId, localizacaoNome, limite }) => {
      await verificarPermissao(usuarioId, 'estoques');
      const resultado = await buscarEstoque(
        { itemId, itemNome, localizacaoId, localizacaoNome, limite },
        usuarioId,
      );
      return formatarResultado(
        'buscarEstoque',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarMovimentacoes',
    'Busca movimentações (entradas e saídas) de estoque com filtros de tipo, data e item',
    {
      tipo: z
        .enum(['entrada', 'saida'])
        .optional()
        .describe(
          "Tipo de movimentação — use exatamente 'entrada' ou 'saida' (minúsculas)",
        ),
      dataInicio: z
        .string()
        .optional()
        .describe(
          'Data de início no formato YYYY-MM-DD (ex: 2026-01-01); sem hora, vale desde o começo do dia no fuso do usuário',
        ),
      dataFim: z
        .string()
        .optional()
        .describe(
          'Data de fim no formato YYYY-MM-DD (ex: 2026-12-31); sem hora, inclui o dia inteiro no fuso do usuário',
        ),
      itemNome: z
        .string()
        .optional()
        .describe('Filtrar por nome do item (busca parcial)'),
      localizacao: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da localização (busca parcial)'),
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({ tipo, dataInicio, dataFim, itemNome, localizacao, limite }) => {
      await verificarPermissao(usuarioId, 'movimentacoes');
      const resultado = await buscarMovimentacoes(
        { tipo, dataInicio, dataFim, itemNome, localizacao, limite },
        usuarioId,
      );
      return formatarResultado(
        'buscarMovimentacoes',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarEmprestimos',
    'Busca empréstimos com status calculado (Ativo, Devolvido, Atrasado). Um empréstimo é de item de consumo do almoxarifado (campo "item" preenchido) OU de uma unidade de patrimônio (campo "tipo_controle" = "unidade", identificada por número de patrimônio) — o campo "item" no retorno já vem resolvido para os dois casos, nunca use "Não informado" ou similar se ele vier nulo.',
    {
      status: z
        .enum(['Ativo', 'Devolvido', 'Atrasado'])
        .optional()
        .describe('Filtrar pelo status do empréstimo'),
      solicitanteNome: z
        .string()
        .optional()
        .describe('Filtrar pelo nome do solicitante (busca parcial)'),
      itemNome: z
        .string()
        .optional()
        .describe(
          'Filtrar por nome do item de consumo emprestado (busca parcial)',
        ),
      numeroPatrimonio: z
        .string()
        .optional()
        .describe(
          'Filtrar por número da unidade de patrimônio emprestada (busca parcial)',
        ),
      localizacao: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da localização (busca parcial)'),
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({
      status,
      solicitanteNome,
      itemNome,
      numeroPatrimonio,
      localizacao,
      limite,
    }) => {
      await verificarPermissao(usuarioId, 'emprestimos');
      const resultado = await buscarEmprestimos(
        {
          status,
          solicitanteNome,
          itemNome,
          numeroPatrimonio,
          localizacao,
          limite,
        },
        usuarioId,
      );
      return formatarResultado(
        'buscarEmprestimos',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'verificarItensAbaixoMinimo',
    'Retorna todos os itens de consumo (almoxarifado) com quantidade abaixo ou igual ao estoque mínimo definido, ordenados pelo maior déficit. Itens sem estoque mínimo (0) ficam de fora; para itens zerados em geral, use buscarItens com status "Indisponível".',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens');
      const resultado = await verificarItensAbaixoMinimo({}, usuarioId);
      return formatarResultado(
        'verificarItensAbaixoMinimo',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'itensPrioritariosCompra',
    'Retorna itens de consumo (almoxarifado) com status "Baixo Estoque" ou "Indisponível", ranqueados por prioridade de compra. Para cada item: deficit = estoque_minimo - quantidade_atual; saidas_30_dias = soma das quantidades que saíram do estoque (movimentações do tipo "saida") nos últimos 30 dias — é volume de unidades, não número de movimentações; score_prioridade = deficit × (1 + saidas_30_dias). Lista ordenada por score_prioridade decrescente.',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens', 'movimentacoes');
      const resultado = await itensPrioritariosCompra({}, usuarioId);
      return formatarResultado(
        'itensPrioritariosCompra',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarCategorias',
    'Lista as categorias cadastradas com a contagem completa, feita no banco: `itens_ativos` nas de consumo e `unidades_patrimonio_ativas` nas permanentes. Use para comparar ou contar por categoria, em vez de somar uma lista de itens ou patrimônios (que vem limitada).',
    {
      tipo: z
        .enum(['consumo', 'permanente'])
        .optional()
        .describe(
          '"consumo": categorias de itens de almoxarifado. "permanente": categorias de bens de patrimônio.',
        ),
      nome: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da categoria (busca parcial)'),
    },
    async ({ tipo, nome }) => {
      await verificarPermissao(usuarioId, 'categorias');
      const resultado = await buscarCategorias({ tipo, nome }, usuarioId);
      return formatarResultado(
        'buscarCategorias',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarLocalizacoes',
    'Lista locais de armazenamento (prateleiras, depósitos, laboratórios, etc.)',
    {
      nome: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da localização (busca parcial)'),
    },
    async ({ nome }) => {
      await verificarPermissao(usuarioId, 'localizacoes');
      const resultado = await buscarLocalizacoes({ nome }, usuarioId);
      return formatarResultado(
        'buscarLocalizacoes',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarFornecedores',
    'Lista fornecedores cadastrados com filtro opcional por nome',
    {
      nome: z
        .string()
        .optional()
        .describe('Filtrar por nome do fornecedor (busca parcial)'),
    },
    async ({ nome }) => {
      await verificarPermissao(usuarioId, 'fornecedores');
      const resultado = await buscarFornecedores({ nome }, usuarioId);
      return formatarResultado(
        'buscarFornecedores',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'resumoEstoque',
    'Retorna um resumo estatístico geral (os cartões das abas Almoxarifado, Patrimônio e Empréstimos dos Relatórios): total de itens, quantos estão em estoque, baixo estoque, indisponíveis, empréstimos em aberto (emprestimos_ativos, inclui os atrasados), emprestimos_no_prazo (o cartão "Ativos" da tela), emprestimos_atrasados, emprestimos_devolvidos e a contagem de unidades de patrimônio. total_unidades_patrimonio é o total real (inclui as baixadas); unidades_patrimonio_em_uso = disponíveis + emprestadas + em manutenção (exclui as baixadas); unidades_baixadas vem separado.',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens', 'emprestimos');
      const resultado = await resumoEstoque({}, usuarioId);
      return formatarResultado(
        'resumoEstoque',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'resumoMovimentacoes',
    'Totais de movimentações no período e filtros informados. total_movimentacoes, entradas e saidas (número de lançamentos) são os cartões da aba Movimentações dos Relatórios; quantidade_entrada e quantidade_saida somam as unidades; saldo = quantidade_entrada − quantidade_saida (variação de unidades, não aparece na tela). O saldo é a variação de unidades no período, não o estoque atual: negativo quer dizer que saiu mais do que entrou. Sem datas, considera todo o histórico; a tela de Relatórios abre por padrão com os últimos 30 dias (dataInicio = hoje − 29 dias, dataFim = hoje). Use esta ferramenta, e não buscarMovimentacoes, para totais e saldo.',
    {
      tipo: z
        .enum(['entrada', 'saida'])
        .optional()
        .describe("Filtrar por tipo: 'entrada' ou 'saida'"),
      dataInicio: z
        .string()
        .optional()
        .describe(
          'Data de início no formato YYYY-MM-DD; sem hora, vale desde o começo do dia no fuso do usuário',
        ),
      dataFim: z
        .string()
        .optional()
        .describe(
          'Data de fim no formato YYYY-MM-DD; sem hora, inclui o dia inteiro no fuso do usuário',
        ),
      itemNome: z
        .string()
        .optional()
        .describe('Filtrar por nome do item (busca parcial)'),
      localizacao: z
        .string()
        .optional()
        .describe('Filtrar pelo nome da localização (busca parcial)'),
    },
    async ({ tipo, dataInicio, dataFim, itemNome, localizacao }) => {
      await verificarPermissao(usuarioId, 'movimentacoes');
      const resultado = await resumoMovimentacoes(
        { tipo, dataInicio, dataFim, itemNome, localizacao },
        usuarioId,
      );
      return formatarResultado(
        'resumoMovimentacoes',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'tendenciaMensal',
    'Série mensal da aba Tendência dos Relatórios: para cada mês (YYYY-MM, no fuso do usuário), entradas e saidas (lançamentos), quantidade_entrada e quantidade_saida (unidades), emprestimos (saídas de empréstimo no mês) e devolucoes (empréstimos totalmente devolvidos no mês). Use meses (1 a 24, padrão 12) ou um período com dataInicio/dataFim.',
    {
      meses: z
        .number()
        .int()
        .min(1)
        .max(24)
        .optional()
        .describe(
          'Últimos N meses, contando o atual (a tela oferece 6, 12 ou 24)',
        ),
      dataInicio: z
        .string()
        .optional()
        .describe('Início do período no formato YYYY-MM-DD'),
      dataFim: z
        .string()
        .optional()
        .describe('Fim do período no formato YYYY-MM-DD'),
    },
    async ({ meses, dataInicio, dataFim }) => {
      await verificarPermissao(usuarioId, 'movimentacoes', 'emprestimos');
      const resultado = await tendenciaMensal(
        { meses, dataInicio, dataFim },
        usuarioId,
      );
      return formatarResultado(
        'tendenciaMensal',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'historicoPatrimonio',
    'Retorna o histórico de eventos (cadastro, empréstimo, devolução, manutenção, transferência, baixa, reativação) de uma unidade de patrimônio pelo número de patrimônio.',
    {
      numeroPatrimonio: z
        .string()
        .describe('Número da unidade de patrimônio (busca exata)'),
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({ numeroPatrimonio, limite }) => {
      await verificarPermissao(usuarioId, 'patrimonios');
      const resultado = await historicoPatrimonio(
        { numeroPatrimonio, limite },
        usuarioId,
      );
      return formatarResultado(
        'historicoPatrimonio',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  server.tool(
    'buscarUsuarios',
    'Lista usuários cadastrados no sistema (nome, e-mail, status, grupos). `ativo: false` = convite ainda não aceito; usuários excluídos não aparecem. Só acessível a quem tem permissão de administração de usuários.',
    {
      nome: z
        .string()
        .optional()
        .describe('Filtrar pelo nome do usuário (busca parcial)'),
      email: z
        .string()
        .optional()
        .describe('Filtrar pelo e-mail do usuário (busca parcial)'),
      ativo: z
        .boolean()
        .optional()
        .describe('Filtrar por usuários ativos/inativos'),
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({ nome, email, ativo, limite }) => {
      await verificarPermissao(usuarioId, 'usuarios');
      const resultado = await buscarUsuarios(
        { nome, email, ativo, limite },
        usuarioId,
      );
      return formatarResultado(
        'buscarUsuarios',
        resultado,
        await fusoDoUsuario(usuarioId),
      );
    },
  );

  return server;
}
