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
import { GrupoSchema, GrupoUpdateSchema } from './GrupoSchema.js';
import { RotaSchema } from '../rota/RotaSchema.js';

const GrupoDetalhes = registry.register(
  'GrupoDetalhes',
  z.object({
    _id: objectIdField,
    nome: z.string().openapi({ example: 'Administradores' }),
    descricao: z
      .string()
      .openapi({ example: 'Grupo com acesso total ao sistema' }),
    ativo: z.boolean().openapi({ example: true }),
    permissoes: z.array(RotaSchema),
    ...timestampFields,
  }),
);

registry.register(
  'GrupoListagem',
  z.object({ data: z.array(GrupoDetalhes), ...paginationMetaFields }),
);
registry.register('GrupoPost', GrupoSchema);
registry.register('GrupoPatch', GrupoUpdateSchema);
registry.register('PermissaoSchema', RotaSchema);

registerPaths({
  '/grupos': {
    post: {
      tags: ['Grupos'],
      summary: 'Cria um novo grupo',
      description: `
            + Caso de uso: Criação de novo grupo para organização de usuários e permissões.

            + Regras de Negócio:
                - Nome é obrigatório e deve ter no mínimo 1 caractere.
                - Nome deve ser único no sistema.
                - Campo 'ativo' tem padrão true.
                - Permissões são opcionais na criação.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **GrupoDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GrupoPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/GrupoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Grupos'],
      summary: 'Lista todos os grupos',
      description: `
        + Caso de uso: Listagem de grupos para gerenciamento e consulta.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **GrupoListagem**.
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
          name: 'ativo',
          in: 'query',
          required: false,
          schema: { type: 'boolean' },
          description: 'Filtro por status',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/GrupoListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/grupos/{id}': {
    get: {
      tags: ['Grupos'],
      summary: 'Obtém detalhes de um grupo',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do grupo')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/GrupoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Grupos'],
      summary: 'Atualiza um grupo',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do grupo')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GrupoPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/GrupoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    put: {
      tags: ['Grupos'],
      summary: 'Substitui um grupo',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do grupo')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GrupoPost' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/GrupoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Grupos'],
      summary: 'Deleta um grupo',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do grupo')],
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

  '/grupos/{id}/rotas': {
    post: {
      tags: ['Grupos'],
      summary: 'Adiciona permissão (rota) ao grupo',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do grupo')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PermissaoSchema' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/GrupoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
