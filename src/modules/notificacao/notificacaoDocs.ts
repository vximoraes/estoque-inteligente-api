import { z } from 'zod';
import { registry, registerPaths } from '../../utils/openapi/registry.js';
import {
  objectIdField,
  idPathParam,
  paginationMetaFields,
  paginationQueryParams,
} from '../../utils/openapi/commonSchemas.js';
import commonResponses from '../../utils/openapi/commonResponses.js';
import { NotificacaoSchema } from './NotificacaoSchema.js';

const NotificacaoDetalhes = registry.register(
  'NotificacaoDetalhes',
  z.object({
    _id: objectIdField,
    mensagem: z
      .string()
      .openapi({ example: 'Estoque baixo do item Resistor 10k' }),
    data_hora: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T10:30:00.000Z' }),
    visualizada: z.boolean().openapi({ example: false }),
    dataLeitura: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T11:00:00.000Z' }),
    ativo: z.boolean().openapi({ example: true }),
    usuario: objectIdField,
  }),
);

registry.register(
  'NotificacaoPost',
  NotificacaoSchema.pick({ mensagem: true }),
);

registry.register(
  'NotificacaoListagem',
  z.object({ data: z.array(NotificacaoDetalhes), ...paginationMetaFields }),
);

registerPaths({
  '/notificacoes': {
    post: {
      tags: ['Notificações'],
      summary: 'Cria uma nova notificação',
      description: `
            + Caso de uso: Criar uma nova notificação para um usuário.

            + Regras de Negócio:
                - Campos obrigatórios: mensagem.
                - Campo 'usuario': obtido automaticamente do contexto de autenticação.
                - Campo 'visualizada': padrão false.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **NotificacaoDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/NotificacaoPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/NotificacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Notificações'],
      summary: 'Lista todas as notificações',
      description: `
        + Caso de uso: Listar notificações para controle e consulta.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **NotificacaoListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'usuario',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID do usuário',
        },
        {
          name: 'visualizada',
          in: 'query',
          required: false,
          schema: { type: 'boolean' },
          description: 'Filtro por status de visualização',
        },
        {
          name: 'mensagem',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por texto da mensagem',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/NotificacaoListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/notificacoes/{id}': {
    get: {
      tags: ['Notificações'],
      summary: 'Obtém detalhes de uma notificação',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da notificação')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/NotificacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/notificacoes/{id}/visualizar': {
    patch: {
      tags: ['Notificações'],
      summary: 'Marca uma notificação como visualizada',
      description: `
            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência da notificação.
                - Atualizar campo visualizada para true.
                - Registrar data/hora da visualização.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **NotificacaoDetalhes**, contendo dados atualizados da notificação.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da notificação')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/NotificacaoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
