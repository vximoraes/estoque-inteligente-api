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
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Máximo de resultados'),
    },
    async ({ nome, status, categoria, localizacao, limite }) => {
      await verificarPermissao(usuarioId, 'itens');
      const resultado = await buscarItens(
        { nome, status, categoria, localizacao, limite },
        usuarioId,
      );
      return formatarResultado('buscarItens', resultado);
    },
  );

  server.tool(
    'buscarPatrimonios',
    'Busca unidades individuais de bens permanentes (patrimônio) por número de patrimônio, modelo, status ou localização. Use esta tool para perguntas sobre uma unidade específica, como "onde está o patrimônio X" ou "quais notebooks estão emprestados/em manutenção".',
    {
      numeroPatrimonio: z
        .string()
        .optional()
        .describe('Filtrar por número de patrimônio (busca parcial)'),
      modelo: z
        .string()
        .optional()
        .describe(
          'Filtrar pelo modelo da unidade (busca parcial, ex: "notebook")',
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
        .describe('Filtrar pelo nome da categoria (busca parcial)'),
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
      limite,
    }) => {
      await verificarPermissao(usuarioId, 'patrimonios');
      const resultado = await buscarPatrimonios(
        { numeroPatrimonio, modelo, status, localizacao, categoria, limite },
        usuarioId,
      );
      return formatarResultado('buscarPatrimonios', resultado);
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
      return formatarResultado('buscarEstoque', resultado);
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
        .describe('Data de início no formato ISO 8601 (ex: 2026-01-01)'),
      dataFim: z
        .string()
        .optional()
        .describe('Data de fim no formato ISO 8601 (ex: 2026-12-31)'),
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
      return formatarResultado('buscarMovimentacoes', resultado);
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
      return formatarResultado('buscarEmprestimos', resultado);
    },
  );

  server.tool(
    'verificarItensAbaixoMinimo',
    'Retorna todos os itens de consumo (almoxarifado) com quantidade abaixo ou igual ao estoque mínimo definido, ordenados pelo maior déficit.',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens');
      const resultado = await verificarItensAbaixoMinimo({}, usuarioId);
      return formatarResultado('verificarItensAbaixoMinimo', resultado);
    },
  );

  server.tool(
    'itensPrioritariosCompra',
    'Retorna itens de consumo (almoxarifado) abaixo do estoque mínimo ou indisponíveis, cruzados com a quantidade de saídas nos últimos 30 dias, ranqueados por prioridade de compra (déficit de estoque × frequência de saída).',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens', 'movimentacoes');
      const resultado = await itensPrioritariosCompra({}, usuarioId);
      return formatarResultado('itensPrioritariosCompra', resultado);
    },
  );

  server.tool(
    'buscarCategorias',
    'Lista todas as categorias de itens cadastradas no sistema',
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
      return formatarResultado('buscarCategorias', resultado);
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
      return formatarResultado('buscarLocalizacoes', resultado);
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
      return formatarResultado('buscarFornecedores', resultado);
    },
  );

  server.tool(
    'resumoEstoque',
    'Retorna um resumo estatístico geral: total de itens, quantos estão em estoque, baixo estoque, indisponíveis, empréstimos ativos/atrasados, e a contagem de unidades de patrimônio (disponíveis, emprestadas, em manutenção)',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens', 'emprestimos');
      const resultado = await resumoEstoque({}, usuarioId);
      return formatarResultado('resumoEstoque', resultado);
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
      return formatarResultado('historicoPatrimonio', resultado);
    },
  );

  server.tool(
    'buscarUsuarios',
    'Lista usuários cadastrados no sistema (nome, e-mail, status, grupos). Só acessível a quem tem permissão de administração de usuários.',
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
      return formatarResultado('buscarUsuarios', resultado);
    },
  );

  return server;
}
