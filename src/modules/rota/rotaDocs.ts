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
import { RotaSchema, RotaUpdateSchema } from './RotaSchema.js';

const RotaDetalhes = registry.register(
  'RotaDetalhes',
  z.object({
    _id: objectIdField,
    rota: z.string().openapi({ example: '/itens' }),
    dominio: z.string().openapi({ example: 'localhost' }),
    ativo: z.boolean().openapi({ example: true }),
    buscar: z.boolean().openapi({ example: true }),
    enviar: z.boolean().openapi({ example: false }),
    substituir: z.boolean().openapi({ example: false }),
    modificar: z.boolean().openapi({ example: false }),
    excluir: z.boolean().openapi({ example: false }),
    ...timestampFields,
  }),
);

registry.register(
  'RotaListagem',
  z.object({ data: z.array(RotaDetalhes), ...paginationMetaFields }),
);
registry.register('RotaPost', RotaSchema);
registry.register('RotaPatch', RotaUpdateSchema);

registerPaths({
  '/rotas': {
    post: {
      tags: ['Rotas'],
      summary: 'Cria uma nova rota',
      description: `
            + Caso de uso: Criação de nova rota de acesso no sistema para controle de permissões.

            + Regras de Negócio:
                - Rota é obrigatória e deve ter no mínimo 1 caractere.
                - Dominio é obrigatório.
                - Combinação rota + dominio deve ser única no sistema.
                - Campo 'ativo' tem padrão true.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **RotaDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RotaPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/RotaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Rotas'],
      summary: 'Lista todas as rotas',
      description: `
        + Caso de uso: Listagem de rotas para gerenciamento e consulta.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **RotaListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'rota',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por rota',
        },
        {
          name: 'dominio',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por domínio',
        },
        {
          name: 'ativo',
          in: 'query',
          required: false,
          schema: { type: 'boolean' },
          description: 'Filtro por status',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/RotaListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/rotas/{id}': {
    get: {
      tags: ['Rotas'],
      summary: 'Obtém detalhes de uma rota',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da rota')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/RotaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Rotas'],
      summary: 'Atualiza uma rota',
      description: `
            + Caso de uso: Atualização parcial de dados da rota.

            + Regras de Negócio:
                - Garantir unicidade da combinação rota + dominio.
                - Aplicar imediatamente alterações críticas (ex.: desativação).

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **RotaDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da rota')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RotaPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/RotaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    put: {
      tags: ['Rotas'],
      summary: 'Substitui uma rota',
      description: `
            + Caso de uso: Substituição completa de dados da rota.

            + Regras de Negócio:
                - Garantir unicidade da combinação rota + dominio.
                - Campos não informados assumem valores padrão.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **RotaDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da rota')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RotaPost' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/RotaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Rotas'],
      summary: 'Deleta uma rota',
      description: `
            + Caso de uso: Exclusão de rota do sistema.

            + Regras de Negócio:
                - Verificar impedimentos por relacionamento (permissões vinculadas) antes de excluir.

            + Resultado Esperado:
                - HTTP 200 OK - rota excluída com sucesso.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da rota')],
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
});
