import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buscarItens } from './tools/buscarItens.js';
import { buscarEstoque } from './tools/buscarEstoque.js';
import { buscarMovimentacoes } from './tools/buscarMovimentacoes.js';
import { buscarEmprestimos } from './tools/buscarEmprestimos.js';
import { buscarOrcamentos } from './tools/buscarOrcamentos.js';
import { verificarItensAbaixoMinimo } from './tools/verificarItensAbaixoMinimo.js';
import { buscarCategorias } from './tools/buscarCategorias.js';
import { buscarLocalizacoes } from './tools/buscarLocalizacoes.js';
import { buscarFornecedores } from './tools/buscarFornecedores.js';
import { resumoEstoque } from './tools/resumoEstoque.js';
import PermissionService from '../../utils/services/PermissionService.js';
import { DOMINIO_PADRAO } from '../../config/RbacConfig.js';

const permissionService = new PermissionService();

async function verificarPermissao(usuarioId: string, ...rotas: string[]): Promise<void> {
  for (const rota of rotas) {
    const permitido = await permissionService.hasPermission(usuarioId, rota, DOMINIO_PADRAO, 'buscar');
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
    'Busca itens do inventário com filtros opcionais de nome e status',
    {
      nome: z.string().optional().describe('Filtrar por nome do item (busca parcial)'),
      status: z
        .enum(['Em Estoque', 'Baixo Estoque', 'Indisponível'])
        .optional()
        .describe('Filtrar pelo status do item'),
      limite: z.number().int().min(1).max(50).optional().default(20).describe('Máximo de resultados'),
    },
    async ({ nome, status, limite }) => {
      await verificarPermissao(usuarioId, 'itens');
      const resultado = await buscarItens({ nome, status, limite }, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'buscarEstoque',
    'Busca registros de quantidade em estoque por item ou localização',
    {
      itemId: z.string().optional().describe('ID do item para filtrar'),
      localizacaoId: z.string().optional().describe('ID da localização para filtrar'),
      limite: z.number().int().min(1).max(50).optional().default(20).describe('Máximo de resultados'),
    },
    async ({ itemId, localizacaoId, limite }) => {
      await verificarPermissao(usuarioId, 'estoques');
      const resultado = await buscarEstoque({ itemId, localizacaoId, limite }, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'buscarMovimentacoes',
    'Busca movimentações (entradas e saídas) de estoque com filtros de tipo, data e item',
    {
      tipo: z
        .enum(['entrada', 'saida'])
        .optional()
        .describe("Tipo de movimentação — use exatamente 'entrada' ou 'saida' (minúsculas)"),
      dataInicio: z.string().optional().describe('Data de início no formato ISO 8601 (ex: 2026-01-01)'),
      dataFim: z.string().optional().describe('Data de fim no formato ISO 8601 (ex: 2026-12-31)'),
      itemNome: z.string().optional().describe('Filtrar por nome do item (busca parcial)'),
      limite: z.number().int().min(1).max(50).optional().default(20).describe('Máximo de resultados'),
    },
    async ({ tipo, dataInicio, dataFim, itemNome, limite }) => {
      await verificarPermissao(usuarioId, 'movimentacoes');
      const resultado = await buscarMovimentacoes(
        { tipo, dataInicio, dataFim, itemNome, limite },
        usuarioId,
      );
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'buscarEmprestimos',
    'Busca empréstimos de itens com status calculado (Ativo, Devolvido, Atrasado)',
    {
      status: z
        .enum(['Ativo', 'Devolvido', 'Atrasado'])
        .optional()
        .describe('Filtrar pelo status do empréstimo'),
      solicitanteNome: z
        .string()
        .optional()
        .describe('Filtrar pelo nome do solicitante (busca parcial)'),
      limite: z.number().int().min(1).max(50).optional().default(20).describe('Máximo de resultados'),
    },
    async ({ status, solicitanteNome, limite }) => {
      await verificarPermissao(usuarioId, 'emprestimos');
      const resultado = await buscarEmprestimos({ status, solicitanteNome, limite }, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'buscarOrcamentos',
    'Busca orçamentos com itens e fornecedores associados',
    {
      nome: z.string().optional().describe('Filtrar por nome do orçamento (busca parcial)'),
      limite: z.number().int().min(1).max(50).optional().default(20).describe('Máximo de resultados'),
    },
    async ({ nome, limite }) => {
      await verificarPermissao(usuarioId, 'orcamentos');
      const resultado = await buscarOrcamentos({ nome, limite }, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'verificarItensAbaixoMinimo',
    'Retorna todos os itens com quantidade abaixo ou igual ao estoque mínimo definido, ordenados pelo maior déficit',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens');
      const resultado = await verificarItensAbaixoMinimo({}, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'buscarCategorias',
    'Lista todas as categorias de itens cadastradas no sistema',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'categorias');
      const resultado = await buscarCategorias({}, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'buscarLocalizacoes',
    'Lista todos os locais de armazenamento (prateleiras, depósitos, laboratórios, etc.)',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'localizacoes');
      const resultado = await buscarLocalizacoes({}, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'buscarFornecedores',
    'Lista fornecedores cadastrados com filtro opcional por nome',
    {
      nome: z.string().optional().describe('Filtrar por nome do fornecedor (busca parcial)'),
    },
    async ({ nome }) => {
      await verificarPermissao(usuarioId, 'fornecedores');
      const resultado = await buscarFornecedores({ nome }, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  server.tool(
    'resumoEstoque',
    'Retorna um resumo estatístico geral: total de itens, quantos estão em estoque, baixo estoque, indisponíveis e empréstimos ativos/atrasados',
    {},
    async () => {
      await verificarPermissao(usuarioId, 'itens', 'emprestimos');
      const resultado = await resumoEstoque({}, usuarioId);
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    },
  );

  return server;
}
