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
import {
  OrcamentoSchema,
  OrcamentoUpdateSchema,
  ItemOrcamentoSchema,
} from './OrcamentoSchema.js';

const ItemOrcamentoDetalhes = registry.register(
  'ItemOrcamentoDetalhes',
  z.object({
    _id: objectIdField,
    item: objectIdField,
    nome: z.string().openapi({ example: 'Resistor 10k' }),
    fornecedor: objectIdField,
    quantidade: z.number().int().openapi({ example: 10 }),
    valor_unitario: z.number().openapi({ example: 0.5 }),
    subtotal: z.number().openapi({ example: 5.0 }),
  }),
);

const OrcamentoDetalhes = registry.register(
  'OrcamentoDetalhes',
  z.object({
    _id: objectIdField,
    nome: z.string().openapi({ example: 'Orçamento Sistema de Automação' }),
    descricao: z.string().optional().openapi({
      example: 'Orçamento para itens do sistema de automação residencial',
    }),
    total: z.number().openapi({ example: 15.5 }),
    itens: z.array(ItemOrcamentoDetalhes),
    usuario: objectIdField,
    ativo: z.boolean().openapi({ example: true }),
    ...timestampFields,
  }),
);

const itemOrcamentoDocsFields = {
  quantidade: z.number().int().min(1).openapi({ example: 10 }),
  valor_unitario: z.number().min(0).openapi({ example: 0.5 }),
  item: objectIdField,
  fornecedor: objectIdField,
};

registry.register(
  'OrcamentoListagem',
  z.object({ data: z.array(OrcamentoDetalhes), ...paginationMetaFields }),
);
registry.register(
  'OrcamentoPost',
  OrcamentoSchema.extend({
    itens: z.array(ItemOrcamentoSchema.extend(itemOrcamentoDocsFields)).min(1),
  }),
);
registry.register('OrcamentoPatch', OrcamentoUpdateSchema);
registry.register(
  'ItemOrcamentoPost',
  ItemOrcamentoSchema.extend(itemOrcamentoDocsFields),
);
registry.register(
  'ItemOrcamentoPatch',
  ItemOrcamentoSchema.extend(itemOrcamentoDocsFields).partial(),
);

registerPaths({
  '/orcamentos': {
    post: {
      tags: ['Orçamentos'],
      summary: 'Cria um novo orçamento',
      description: `
            + Caso de uso: Criar um novo orçamento com itens e seus respectivos valores.

            + Regras de Negócio:
                - Campos obrigatórios: nome, itens (array com ao menos 1 item).
                - Valor total é calculado automaticamente baseado nos itens.
                - Subtotal de cada item é calculado automaticamente.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **OrcamentoDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrcamentoPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Orçamentos'],
      summary: 'Lista todos os orçamentos',
      description: `
        + Caso de uso: Listagem de orçamentos para consulta e controle.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **OrcamentoListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'nome',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por nome',
        },
        {
          name: 'valorMin',
          in: 'query',
          required: false,
          schema: { type: 'number' },
          description: 'Filtro por valor total mínimo',
        },
        {
          name: 'valorMax',
          in: 'query',
          required: false,
          schema: { type: 'number' },
          description: 'Filtro por valor total máximo',
        },
        {
          name: 'dataInicio',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Filtro por data de criação inicial',
        },
        {
          name: 'dataFim',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Filtro por data de criação final',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/OrcamentoListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/orcamentos/{id}': {
    get: {
      tags: ['Orçamentos'],
      summary: 'Obtém detalhes de um orçamento',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do orçamento')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Orçamentos'],
      summary: 'Atualiza um orçamento',
      description: `
            + Regras de Negócio:
                - Permite atualização parcial de nome e descrição.
                - Não permite alterar itens diretamente (usar rotas específicas).
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do orçamento')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrcamentoPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Orçamentos'],
      summary: 'Remove um orçamento',
      description: `
            + Regras de Negócio:
                - Remove orçamento e todos os itens associados.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do orçamento')],
      responses: {
        200: commonResponses[200]!(),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/orcamentos/{orcamentoId}/itens': {
    post: {
      tags: ['Orçamentos'],
      summary: 'Adiciona item ao orçamento',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'orcamentoId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID do orçamento',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemOrcamentoPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/orcamentos/{orcamentoId}/itens/{id}': {
    patch: {
      tags: ['Orçamentos'],
      summary: 'Atualiza item do orçamento',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'orcamentoId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID do orçamento',
        },
        idPathParam('ID do item'),
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemOrcamentoPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Orçamentos'],
      summary: 'Remove item do orçamento',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'orcamentoId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID do orçamento',
        },
        idPathParam('ID do item'),
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
