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

const EstoqueDetalhes = registry.register(
  'EstoqueDetalhes',
  z.object({
    _id: objectIdField,
    quantidade: z.number().int().openapi({ example: 150 }),
    item: objectIdField,
    localizacao: objectIdField,
    usuario: objectIdField,
    ...timestampFields,
  }),
);

registry.register(
  'EstoqueListagem',
  z.object({ data: z.array(EstoqueDetalhes), ...paginationMetaFields }),
);

registerPaths({
  '/estoques': {
    get: {
      tags: ['Estoque'],
      summary: 'Listar todos os estoques',
      description: `
            **Funcionalidade:**
            - Permitir ao usuário autenticado listar todos os seus estoques com paginação e filtros.

            **Regras de negócio:**
            - Apenas estoques do usuário autenticado são retornados.
            - Suporte a filtros por item, localização e quantidade.
            - Resultados paginados com limite máximo de 100 itens por página.

            **Casos de uso:** Visualização geral do estoque, busca por filtros específicos.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'item',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtrar por ID do item',
        },
        {
          name: 'localizacao',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtrar por ID da localização',
        },
        {
          name: 'quantidade',
          in: 'query',
          required: false,
          schema: { type: 'integer' },
          description: 'Filtrar por quantidade específica',
        },
        {
          name: 'categoria',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtrar por ID da categoria do item',
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: ['Indisponível', 'Baixo Estoque', 'Em Estoque'],
          },
          description: 'Filtrar por status do item',
        },
        {
          name: 'nome',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtrar por nome do item (busca parcial)',
        },
        {
          name: 'ordenar',
          in: 'query',
          required: false,
          schema: { type: 'string', example: 'quantidade:desc' },
          description:
            "Ordenação no formato 'campo:asc' ou 'campo:desc'. Campos aceitos: quantidade, createdAt.",
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/EstoqueListagem'),
        401: commonResponses[401]!(),
        403: commonResponses[403]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/estoques/item/{itemId}': {
    get: {
      tags: ['Estoque'],
      summary: 'Listar estoques de um item específico',
      description: `
            **Funcionalidade:**
            - Permitir ao usuário autenticado listar todos os estoques que contêm um item específico.

            **Casos de uso:** Verificar em quais localizações um item específico está armazenado e suas quantidades.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'itemId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID do item para buscar estoques',
        },
        {
          name: 'localizacao',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtrar por ID da localização',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/EstoqueListagem'),
        401: commonResponses[401]!(),
        403: commonResponses[403]!(),
        404: commonResponses[404]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/estoques/{id}': {
    get: {
      tags: ['Estoque'],
      summary: 'Buscar estoque por ID',
      description: `
            **Funcionalidade:**
            - Permitir ao usuário autenticado buscar um estoque específico pelo seu ID.

            **Regras de negócio:**
            - Apenas estoques do usuário autenticado podem ser acessados.
            - Retorna erro 404 se o estoque não for encontrado.
            - Inclui dados completos do item e localização (populate).
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do estoque')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/EstoqueDetalhes'),
        401: commonResponses[401]!(),
        403: commonResponses[403]!(),
        404: commonResponses[404]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
