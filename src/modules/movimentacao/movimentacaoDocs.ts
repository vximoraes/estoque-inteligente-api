import { z } from 'zod';
import { registry, registerPaths } from '../../utils/openapi/registry.js';
import {
  objectIdField,
  timestampFields,
  idPathParam,
  paginationMetaFields,
  paginationQueryParams,
} from '../../utils/openapi/commonSchemas.js';
import commonResponses from '../../utils/openapi/commonResponses.js';

const MovimentacaoDetalhes = registry.register(
  'MovimentacaoDetalhes',
  z.object({
    _id: objectIdField,
    tipo: z.enum(['entrada', 'saida']).openapi({ example: 'entrada' }),
    data_hora: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T10:30:00.000Z' }),
    quantidade: z.number().int().openapi({ example: 10 }),
    item: objectIdField,
    localizacao: objectIdField,
    usuario: objectIdField,
    ...timestampFields,
  }),
);

const MovimentacaoPost = registry.register(
  'MovimentacaoPost',
  z.object({
    tipo: z.enum(['entrada', 'saida']).openapi({ example: 'entrada' }),
    quantidade: z.number().int().min(0).openapi({ example: 10 }),
    item: objectIdField,
    localizacao: objectIdField,
    fornecedor: objectIdField
      .optional()
      .openapi({ description: 'Obrigatório para tipo entrada' }),
  }),
);

registry.register(
  'MovimentacaoListagem',
  z.object({ data: z.array(MovimentacaoDetalhes), ...paginationMetaFields }),
);

registry.register(
  'MovimentacaoResumo',
  z.object({
    total_movimentacoes: z.number().int().openapi({ example: 128 }),
    entradas: z.number().int().openapi({ example: 74 }),
    saidas: z.number().int().openapi({ example: 54 }),
    quantidade_entrada: z.number().int().openapi({ example: 940 }),
    quantidade_saida: z.number().int().openapi({ example: 612 }),
    saldo: z.number().int().openapi({ example: 328 }),
  }),
);

const MovimentacaoTendenciaPonto = registry.register(
  'MovimentacaoTendenciaPonto',
  z.object({
    mes: z.string().openapi({ example: '2026-04' }),
    entradas: z.number().int().openapi({ example: 12 }),
    saidas: z.number().int().openapi({ example: 9 }),
    quantidade_entrada: z.number().int().openapi({ example: 210 }),
    quantidade_saida: z.number().int().openapi({ example: 140 }),
  }),
);

registry.register(
  'MovimentacaoTendenciaListagem',
  z.object({ data: z.array(MovimentacaoTendenciaPonto) }),
);

registerPaths({
  '/movimentacoes': {
    post: {
      tags: ['Movimentação'],
      summary: 'Registra uma nova movimentação',
      description: `
            + Caso de uso: Registrar movimentação de um item (entrada ou saída).

            + Regras de Negócio:
                - Campos obrigatórios: item, tipo (entrada/saida), quantidade.
                - Para entrada: fornecedor é obrigatório e deve existir.
                - Para saída: fornecedor não é necessário.
                - Não permite quantidade negativa ou maior que o estoque disponível (para saída).
                - Atualiza a quantidade do item automaticamente.
                - Data/hora é gerada automaticamente pelo sistema.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **MovimentacaoDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MovimentacaoPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/MovimentacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Movimentação'],
      summary: 'Lista todas as movimentações',
      description: `
        + Caso de uso: Listagem de movimentações para controle de estoque e auditoria.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.
            - Retorna movimentações populadas com dados de item e fornecedor.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **MovimentacaoListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'tipo',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['entrada', 'saida'] },
          description: 'Filtro por tipo',
        },
        {
          name: 'data',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Filtro por data (YYYY-MM-DD)',
        },
        {
          name: 'item',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID do item',
        },
        {
          name: 'fornecedor',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID do fornecedor',
        },
        {
          name: 'data_inicio',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Início do período (YYYY-MM-DD)',
        },
        {
          name: 'data_fim',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Fim do período (YYYY-MM-DD)',
        },
        {
          name: 'localizacao',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID ou nome da localização',
        },
        {
          name: 'ordenar',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description:
            'Ordenação no formato campo:asc|desc (data_hora, quantidade, createdAt)',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/MovimentacaoListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/movimentacoes/resumo': {
    get: {
      tags: ['Movimentação'],
      summary: 'Resumo agregado de movimentações (relatório)',
      description: `
        + Caso de uso: StatCards do relatório de Movimentações por Período.

        + Regras de Negócio:
            - Aplica os mesmos filtros de \`GET /movimentacoes\` (tipo, período, item, localização).
            - Agrega no banco, não pagina.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **MovimentacaoResumo**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'tipo',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['entrada', 'saida'] },
          description: 'Filtro por tipo',
        },
        {
          name: 'data_inicio',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Início do período (YYYY-MM-DD)',
        },
        {
          name: 'data_fim',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Fim do período (YYYY-MM-DD)',
        },
        {
          name: 'item',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID ou nome do item',
        },
        {
          name: 'localizacao',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID ou nome da localização',
        },
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/MovimentacaoResumo'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/movimentacoes/tendencia': {
    get: {
      tags: ['Movimentação'],
      summary: 'Série mensal de entradas/saídas (relatório de Tendência)',
      description: `
        + Caso de uso: Gráfico de tendência do relatório de Movimentações.

        + Regras de Negócio:
            - \`data_inicio\`/\`data_fim\` (período personalizado) têm prioridade sobre \`meses\` quando ambos são enviados.
            - Sem \`data_inicio\`/\`data_fim\`: \`meses\` aceita 6, 12 ou 24 (default 12), contados a partir de hoje.
            - Meses sem movimentação vêm preenchidos com zero.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **MovimentacaoTendenciaListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'meses',
          in: 'query',
          required: false,
          schema: { type: 'integer', enum: [6, 12, 24], default: 12 },
          description:
            'Tamanho da janela em meses (ignorado se data_inicio/data_fim forem enviados)',
        },
        {
          name: 'data_inicio',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Início do período personalizado (YYYY-MM-DD)',
        },
        {
          name: 'data_fim',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Fim do período personalizado (YYYY-MM-DD)',
        },
      ],
      responses: {
        200: commonResponses[200]!(
          '#/components/schemas/MovimentacaoTendenciaListagem',
        ),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/movimentacoes/{id}': {
    get: {
      tags: ['Movimentação'],
      summary: 'Obtém detalhes de uma movimentação',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da movimentação')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/MovimentacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
