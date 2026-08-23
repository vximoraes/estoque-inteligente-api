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
  PatrimonioSchema,
  PatrimonioLoteSchema,
  PatrimonioUpdateSchema,
  PatrimonioStatusSchema,
  PatrimonioLocalizacaoSchema,
} from './PatrimonioSchema.js';

const STATUS_ENUM = ['Disponível', 'Emprestado', 'Manutenção', 'Baixado'];

const PatrimonioDetalhes = registry.register(
  'PatrimonioDetalhes',
  z.object({
    _id: objectIdField,
    item: objectIdField,
    numero_patrimonio: z.string().openapi({ example: 'NB-0001' }),
    localizacao: objectIdField,
    status: z.enum(STATUS_ENUM as [string, ...string[]]).openapi({
      example: 'Disponível',
    }),
    data_aquisicao: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T10:30:00.000Z' }),
    observacoes: z.string().optional().openapi({ example: 'Nota fiscal 4521' }),
    ativo: z.boolean().openapi({ example: true }),
    ...timestampFields,
  }),
);

const PatrimonioEventoDetalhes = registry.register(
  'PatrimonioEventoDetalhes',
  z.object({
    _id: objectIdField,
    patrimonio: objectIdField,
    item: objectIdField,
    tipo: z
      .enum([
        'cadastro',
        'emprestimo',
        'devolucao',
        'manutencao_entrada',
        'manutencao_saida',
        'transferencia',
        'baixa',
        'reativacao',
      ])
      .openapi({ example: 'cadastro' }),
    status_anterior: z.string().nullable().openapi({ example: null }),
    status_novo: z.string().openapi({ example: 'Disponível' }),
    localizacao_anterior: objectIdField.optional(),
    localizacao_nova: objectIdField.optional(),
    emprestimo: objectIdField.optional(),
    data_hora: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T10:30:00.000Z' }),
    observacoes: z.string().optional(),
    usuario: objectIdField,
  }),
);

registry.register('PatrimonioPost', PatrimonioSchema);
registry.register('PatrimonioLotePost', PatrimonioLoteSchema);
registry.register('PatrimonioPatch', PatrimonioUpdateSchema);
registry.register('PatrimonioStatusPatch', PatrimonioStatusSchema);
registry.register('PatrimonioLocalizacaoPatch', PatrimonioLocalizacaoSchema);

registry.register(
  'PatrimonioListagem',
  z.object({ data: z.array(PatrimonioDetalhes), ...paginationMetaFields }),
);
registry.register(
  'PatrimonioEventoListagem',
  z.object({
    data: z.array(PatrimonioEventoDetalhes),
    ...paginationMetaFields,
  }),
);

const filtrosListagem = [
  {
    name: 'item',
    in: 'query',
    required: false,
    schema: { type: 'string' },
    description: 'Filtrar por ID do item (modelo)',
  },
  {
    name: 'status',
    in: 'query',
    required: false,
    schema: { type: 'string', enum: STATUS_ENUM },
    description: 'Filtrar por status da unidade',
  },
  {
    name: 'localizacao',
    in: 'query',
    required: false,
    schema: { type: 'string' },
    description: 'Filtrar por ID da localização',
  },
  {
    name: 'numero_patrimonio',
    in: 'query',
    required: false,
    schema: { type: 'string' },
    description: 'Busca parcial por número de patrimônio',
  },
  {
    name: 'busca',
    in: 'query',
    required: false,
    schema: { type: 'string' },
    description: 'Alias de numero_patrimonio para busca livre',
  },
  {
    name: 'ativo',
    in: 'query',
    required: false,
    schema: { type: 'boolean' },
    description: 'Filtro por status de ativação (padrão: true)',
  },
  ...paginationQueryParams,
];

registerPaths({
  '/patrimonios': {
    post: {
      tags: ['Patrimônio'],
      summary: 'Cadastra uma unidade de patrimônio',
      description: `
            + Caso de uso: Cadastro individual de um bem permanente (ex.: um notebook específico), vinculado a um item do tipo 'permanente'.

            + Regras de Negócio:
                - O item referenciado deve existir e ter 'tipo' igual a 'permanente'.
                - A localização referenciada deve existir.
                - Número de patrimônio deve ser único entre unidades ativas.
                - Status inicial é sempre 'Disponível'.
                - Gera um PatrimonioEvento do tipo 'cadastro'.
                - Recalcula 'quantidade' e 'quantidade_disponivel' do Item associado.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **PatrimonioDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PatrimonioPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/PatrimonioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Patrimônio'],
      summary: 'Lista unidades de patrimônio',
      description: `
        + Caso de uso: Listagem paginada das unidades individuais de bens permanentes.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.
            - Retorna unidades populadas com item e localização.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **PatrimonioListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: filtrosListagem,
      responses: {
        200: commonResponses[200]!('#/components/schemas/PatrimonioListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/patrimonios/lote': {
    post: {
      tags: ['Patrimônio'],
      summary: 'Cadastra várias unidades de patrimônio de uma vez',
      description: `
            + Caso de uso: Cadastro em lote de N unidades do mesmo modelo (ex.: 10 notebooks recém-comprados), evitando o cadastro unidade a unidade.

            + Regras de Negócio:
                - Mesmas validações de item/localização do cadastro individual.
                - Numeração sequencial: \`{prefixo}-{numero_inicial..numero_inicial+quantidade-1}\`, com 4 dígitos (ex.: NB-0001, NB-0002).
                - Quantidade entre 1 e 500 por chamada.
                - Gera um PatrimonioEvento 'cadastro' por unidade criada.

            + Resultado Esperado:
                - HTTP 201 Created com a lista das unidades criadas.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PatrimonioLotePost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/PatrimonioListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/patrimonios/{id}': {
    get: {
      tags: ['Patrimônio'],
      summary: 'Obtém detalhes de uma unidade de patrimônio',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do patrimônio')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/PatrimonioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Patrimônio'],
      summary: 'Atualiza metadados de uma unidade de patrimônio',
      description: `
            + Regras de Negócio:
                - Só altera 'numero_patrimonio', 'observacoes' e 'data_aquisicao'.
                - 'status' e 'localizacao' NÃO podem ser alterados por esta rota — use /patrimonios/{id}/status e /patrimonios/{id}/localizacao.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **PatrimonioDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do patrimônio')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PatrimonioPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/PatrimonioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/patrimonios/{id}/eventos': {
    get: {
      tags: ['Patrimônio'],
      summary: 'Histórico de eventos de uma unidade de patrimônio',
      description: `
            + Caso de uso: Consultar o histórico completo de transições de status e localização de uma unidade (ledger imutável).

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **PatrimonioEventoListagem**, mais recente primeiro.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do patrimônio'), ...paginationQueryParams],
      responses: {
        200: commonResponses[200]!(
          '#/components/schemas/PatrimonioEventoListagem',
        ),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/patrimonios/{id}/status': {
    patch: {
      tags: ['Patrimônio'],
      summary: 'Transiciona o status de uma unidade de patrimônio',
      description: `
            + Caso de uso: Enviar para manutenção, retornar da manutenção, dar baixa ou reativar uma unidade.

            + Regras de Negócio (máquina de estados):
                - Disponível ↔ Manutenção: livre.
                - Disponível ou Manutenção → Baixado: livre.
                - Baixado → Disponível: livre (reativação).
                - Emprestado → qualquer status: proibido (400) — devolva o empréstimo primeiro.
                - 'Emprestado' nunca é um destino válido nesta rota — a transição Disponível→Emprestado só ocorre pelo fluxo de empréstimo, com update condicional atômico para evitar concorrência.
                - Gera um PatrimonioEvento correspondente à transição.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **PatrimonioDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do patrimônio')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PatrimonioStatusPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/PatrimonioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/patrimonios/{id}/localizacao': {
    patch: {
      tags: ['Patrimônio'],
      summary: 'Transfere uma unidade de patrimônio de localização',
      description: `
            + Regras de Negócio:
                - Bloqueado se a unidade estiver com status 'Emprestado' (localização é decidida pelo fluxo de empréstimo/devolução nesse caso).
                - Gera um PatrimonioEvento do tipo 'transferencia'.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **PatrimonioDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do patrimônio')],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/PatrimonioLocalizacaoPatch',
            },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/PatrimonioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/patrimonios/{id}/inativar': {
    patch: {
      tags: ['Patrimônio'],
      summary: 'Inativa uma unidade de patrimônio (soft delete)',
      description: `
            + Regras de Negócio:
                - Distinto de dar baixa: 'ativo:false' é erro de cadastro (o número de patrimônio pode ser reaproveitado); 'Baixado' é fim de vida útil do bem.
                - Bloqueado se a unidade estiver com status 'Emprestado'.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **PatrimonioDetalhes**, com ativo = false.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do patrimônio')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/PatrimonioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
