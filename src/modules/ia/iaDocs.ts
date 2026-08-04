import { z } from 'zod';
import { registry, registerPaths } from '../../utils/openapi/registry.js';
import {
  objectIdField,
  idPathParam,
  paginationMetaFields,
  paginationQueryParams,
} from '../../utils/openapi/commonSchemas.js';
import commonResponses from '../../utils/openapi/commonResponses.js';
import { EnviarMensagemSchema, CriarConversaSchema } from './IASchema.js';

const Mensagem = z.object({
  role: z.enum(['user', 'assistant']).openapi({ example: 'user' }),
  content: z
    .string()
    .openapi({ example: 'Quais itens estão abaixo do mínimo?' }),
  timestamp: z
    .string()
    .datetime()
    .openapi({ example: '2026-01-15T10:30:00.000Z' }),
});

const ConversaResumo = registry.register(
  'ConversaResumo',
  z.object({
    _id: objectIdField,
    titulo: z.string().openapi({ example: 'Itens abaixo do estoque mínimo' }),
    criada_em: z
      .string()
      .datetime()
      .openapi({ example: '2026-01-15T10:30:00.000Z' }),
    atualizada_em: z
      .string()
      .datetime()
      .openapi({ example: '2026-01-15T10:31:00.000Z' }),
  }),
);

registry.register(
  'ConversaDetalhes',
  z.object({
    _id: objectIdField,
    usuario: objectIdField,
    titulo: z.string().openapi({ example: 'Itens abaixo do estoque mínimo' }),
    mensagens: z.array(Mensagem),
    criada_em: z
      .string()
      .datetime()
      .openapi({ example: '2026-01-15T10:30:00.000Z' }),
    atualizada_em: z
      .string()
      .datetime()
      .openapi({ example: '2026-01-15T10:31:00.000Z' }),
  }),
);

registry.register(
  'ConversaListagem',
  z.object({
    docs: z.array(ConversaResumo),
    ...paginationMetaFields,
  }),
);

registry.register('IACriarConversa', CriarConversaSchema);
registry.register('IAEnviarMensagem', EnviarMensagemSchema);

registerPaths({
  '/ia/conversas': {
    post: {
      tags: ['IA'],
      summary: 'Cria uma nova conversa com o assistente de IA',
      description: `
            + Caso de uso: Início de uma nova conversa no chat do assistente de estoque.

            + Função de Negócio:
                - Cria uma conversa vazia (ou com o título derivado da primeira mensagem).
                - O agente de IA só é acionado ao enviar a primeira mensagem (POST .../mensagens).

            + Regras de Negócio:
                - mensagem_inicial (opcional) é sanitizada (caracteres de controle removidos) e truncada em 60 caracteres para compor o título.
                - Sem mensagem_inicial, o título padrão é "Nova conversa".

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **ConversaDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/IACriarConversa' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/ConversaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        429: commonResponses[429]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['IA'],
      summary: 'Lista as conversas do usuário autenticado',
      description: `
        + Caso de uso: Histórico de conversas do assistente de IA para o usuário logado.

        + Regras de Negócio:
            - Retorna apenas conversas do próprio usuário autenticado.
            - Paginado, limite máximo de 50 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **ConversaListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [...paginationQueryParams],
      responses: {
        200: commonResponses[200]!('#/components/schemas/ConversaListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/ia/conversas/{id}': {
    get: {
      tags: ['IA'],
      summary: 'Obtém uma conversa com o histórico completo de mensagens',
      description: `
            + Caso de uso: Reabrir uma conversa existente para continuar o chat.

            + Regras de Negócio:
                - Validação do formato do ID.
                - Conversa deve pertencer ao usuário autenticado.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **ConversaDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da conversa')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/ConversaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['IA'],
      summary: 'Exclui uma conversa',
      description: `
            + Caso de uso: Remoção definitiva de uma conversa do histórico.

            + Regras de Negócio:
                - Conversa deve pertencer ao usuário autenticado.
                - Exclusão da conversa não afeta o registro de consumo de tokens já contabilizado (coleção separada).

            + Resultado Esperado:
                - HTTP 204 No Content.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da conversa')],
      responses: {
        204: commonResponses[204]!(),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/ia/conversas/{id}/mensagens': {
    post: {
      tags: ['IA'],
      summary:
        'Envia uma mensagem ao assistente e recebe a resposta via streaming (SSE)',
      description: `
            + Caso de uso: Turno de conversa com o agente de IA sobre dados do estoque.

            + Função de Negócio:
                - Resposta transmitida via Server-Sent Events (Content-Type: text/event-stream), eventos { type: 'token' | 'done' | 'error', ... }.
                - O agente só acessa dados através de ferramentas MCP somente-leitura, respeitando o RBAC do usuário autenticado.

            + Regras de Negócio:
                - Mensagem limitada a 2000 caracteres, sanitizada (caracteres de controle removidos).
                - Conversa limitada a 100 mensagens.
                - Sujeita a rate limit (15 mensagens/minuto), cota diária de tokens por usuário e limite de streams simultâneos por usuário.

            + Resultado Esperado:
                - HTTP 200 OK com stream SSE. Erros de negócio (limite atingido, conversa não encontrada) retornam o envelope padrão antes de iniciar o stream.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da conversa')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/IAEnviarMensagem' },
          },
        },
      },
      responses: {
        200: {
          description: 'Stream SSE com a resposta do assistente',
          content: { 'text/event-stream': { schema: { type: 'string' } } },
        },
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        422: commonResponses[422]!(),
        429: commonResponses[429]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
