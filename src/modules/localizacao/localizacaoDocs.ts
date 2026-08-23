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
  LocalizacaoSchema,
  LocalizacaoUpdateSchema,
} from './LocalizacaoSchema.js';

const LocalizacaoDetalhes = registry.register(
  'LocalizacaoDetalhes',
  z.object({
    _id: objectIdField,
    nome: z.string().openapi({ example: 'Estante A - Prateleira 1' }),
    ativo: z.boolean().openapi({ example: true }),
    descricao: z
      .string()
      .optional()
      .openapi({ example: 'Prateleira próxima à entrada do almoxarifado' }),
    ...timestampFields,
  }),
);

registry.register(
  'LocalizacaoListagem',
  z.object({ data: z.array(LocalizacaoDetalhes), ...paginationMetaFields }),
);
registry.register('LocalizacaoPost', LocalizacaoSchema);
registry.register('LocalizacaoPatch', LocalizacaoUpdateSchema);

registerPaths({
  '/localizacoes': {
    post: {
      tags: ['Localização'],
      summary: 'Cria uma nova localização',
      description: `
            + Caso de uso: Criação de nova localização no sistema.

            + Regras de Negócio:
                - Campo obrigatório: nome (mínimo 3 caracteres).
                - Campo 'ativo' tem padrão true.
                - Nome deve ser único no sistema.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **LocalizacaoDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LocalizacaoPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/LocalizacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Localização'],
      summary: 'Lista todas as localizações',
      description: `
        + Caso de uso: Listagem de localizações para gerenciamento e consulta.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **LocalizacaoListagem**.
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
        200: commonResponses[200]!('#/components/schemas/LocalizacaoListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/localizacoes/{id}': {
    get: {
      tags: ['Localização'],
      summary: 'Obtém detalhes de uma localização',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da localização')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/LocalizacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Localização'],
      summary: 'Atualiza uma localização',
      description: `
            + Regras de Negócio:
                - Garantir unicidade do nome da localização.
                - Verificar se a localização existe antes de atualizar.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da localização')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LocalizacaoPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/LocalizacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

  },

  '/localizacoes/{id}/inativar': {
    patch: {
      tags: ['Localização'],
      summary: 'Inativa uma localização (exclusão lógica)',
      description: `
            + Regras de Negócio:
                - Verificar se a localização existe antes de inativar.
                - Não permitir inativação se há itens em estoque vinculados à localização.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da localização')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/LocalizacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
