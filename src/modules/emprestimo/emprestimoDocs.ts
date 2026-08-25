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
  DevolucaoEmprestimoSchema,
  AtualizarEmprestimoSchema,
} from './EmprestimoSchema.js';

const dateTimeNullableField = z
  .string()
  .datetime()
  .nullable()
  .optional()
  .openapi({ example: '2024-02-15T10:30:00.000Z' });
const quantidadeIntField = (min: number, example: number) =>
  z.number().int().min(min).openapi({ example });

const EmprestimoDetalhes = registry.register(
  'EmprestimoDetalhes',
  z.object({
    _id: objectIdField,
    item: objectIdField.nullable().optional().openapi({
      description:
        "Preenchido apenas quando 'tipo_controle' é 'quantidade' — referencia o item de consumo/almoxarifado emprestado.",
    }),
    localizacao: objectIdField,
    patrimonio: objectIdField.nullable().optional().openapi({
      description:
        "Preenchido apenas quando 'tipo_controle' é 'unidade' — referencia a unidade patrimonial emprestada.",
    }),
    tipo_controle: z.enum(['quantidade', 'unidade']).openapi({
      example: 'quantidade',
      description:
        "'quantidade': empréstimo de item de consumo/almoxarifado. 'unidade': empréstimo de uma unidade patrimonial específica (sempre quantidade 1).",
    }),
    quantidade_emprestada: quantidadeIntField(1, 5),
    quantidade_devolvida: quantidadeIntField(0, 0),
    quantidade_em_aberto: quantidadeIntField(0, 5),
    solicitante_nome: z.string().openapi({ example: 'João Silva' }),
    solicitante_email: z
      .string()
      .email()
      .optional()
      .openapi({ example: 'joao@exemplo.com' }),
    data_prevista_devolucao: z
      .string()
      .datetime()
      .nullable()
      .openapi({ example: '2024-02-15T10:30:00.000Z' }),
    data_devolucao: z.string().datetime().nullable(),
    observacoes_emprestimo: z
      .string()
      .optional()
      .openapi({ example: 'Empréstimo para laboratório' }),
    observacoes_devolucao: z.string().optional(),
    status: z
      .enum(['aberto', 'devolvido', 'atrasado'])
      .openapi({ example: 'aberto' }),
    usuario: objectIdField,
    ...timestampFields,
  }),
);

// Não deriva de `EmprestimoSchema` via `.extend` porque o Zod exige uma
// obrigatoriedade condicional (`item`/`localizacao`/`quantidade_emprestada`
// só quando `patrimonio` não é enviado) via `.superRefine`, que devolve um
// `ZodEffects` sem `.extend`. O shape documentado aqui precisa ficar em
// sincronia manual com `EmprestimoSchema.ts` — a obrigatoriedade real de cada
// campo é decidida em runtime pelo schema real, não por este documento.
registry.register(
  'EmprestimoPost',
  z.object({
    item: objectIdField.optional().openapi({
      description:
        "Obrigatório para empréstimo por quantidade (quando 'patrimonio' não é enviado). Ignorado para empréstimo de unidade patrimonial.",
    }),
    localizacao: objectIdField.optional().openapi({
      description:
        'Obrigatório para empréstimo por quantidade. Para empréstimo de unidade, a localização real da unidade é usada, e este campo é ignorado.',
    }),
    patrimonio: objectIdField.optional().openapi({
      description:
        'Id da unidade patrimonial a emprestar (endpoint GET /patrimonios). Presente = empréstimo de unidade; ausente = empréstimo por quantidade (requer item/localizacao/quantidade_emprestada).',
    }),
    quantidade_emprestada: quantidadeIntField(1, 5).optional().openapi({
      description:
        'Obrigatório para empréstimo por quantidade. Para empréstimo de unidade é sempre 1, decidido pelo Service.',
    }),
    solicitante_nome: z.string().openapi({ example: 'João Silva' }),
    solicitante_email: z
      .string()
      .email()
      .optional()
      .openapi({ example: 'joao@exemplo.com' }),
    data_saida: dateTimeNullableField,
    data_prevista_devolucao: dateTimeNullableField,
    observacoes_emprestimo: z
      .string()
      .optional()
      .openapi({ example: 'Empréstimo para laboratório' }),
  }),
);

registry.register(
  'DevolucaoEmprestimoPost',
  DevolucaoEmprestimoSchema.extend({
    quantidade_devolvida: quantidadeIntField(1, 3),
  }),
);

registry.register(
  'AtualizarEmprestimoPost',
  AtualizarEmprestimoSchema.extend({
    data_prevista_devolucao: dateTimeNullableField,
  }),
);

registry.register(
  'EmprestimoListagem',
  z.object({ data: z.array(EmprestimoDetalhes), ...paginationMetaFields }),
);

registerPaths({
  '/emprestimos': {
    post: {
      tags: ['Emprestimos'],
      summary: 'Registra um novo emprestimo de item',
      description: `
            + Caso de uso: Registrar emprestimo de um item de uma localizacao especifica.

            + Regras de Negocio:
                - Campo sempre obrigatorio: solicitante_nome.
                - Empréstimo por quantidade (item de consumo): sem 'patrimonio' no payload. Exige item, localizacao e quantidade_emprestada. Deve haver saldo de estoque suficiente na localizacao informada; o sistema gera automaticamente uma movimentacao de saida para reduzir o estoque. Devolucao parcial e total sao tratadas em endpoint dedicado.
                - Empréstimo de unidade patrimonial: o campo 'patrimonio' é obrigatório (id de uma unidade com status 'Disponível'); 'item', 'quantidade_emprestada' e 'localizacao' são ignorados e sobrescritos (sempre 1 unidade, na localização real da unidade). Não gera movimentacao — a unidade transiciona atomicamente para 'Emprestado' (409 se outra requisição já pegou a unidade).

            + Resultado Esperado:
                - HTTP 201 Created com os dados do emprestimo e status calculado.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/EmprestimoPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Emprestimos'],
      summary: 'Lista emprestimos com filtros e paginacao',
      description: `
            + Caso de uso: Consultar emprestimos para acompanhamento de status e atrasos.

            + Regras de Negocio:
                - Permite filtros por item, localizacao, solicitante e intervalo de datas.
                - Status e calculado em tempo real com base nas datas e quantidade em aberto.
                - Limite maximo de 100 itens por pagina.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'item',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID do item',
        },
        {
          name: 'localizacao',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por ID da localização',
        },
        {
          name: 'solicitante_nome',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por nome do solicitante',
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['aberto', 'devolvido', 'atrasado'] },
          description: 'Filtro por status',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/EmprestimoListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/emprestimos/{id}': {
    get: {
      tags: ['Emprestimos'],
      summary: 'Consulta emprestimo por id',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do emprestimo')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Emprestimos'],
      summary: 'Atualiza dados de um emprestimo',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do emprestimo')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AtualizarEmprestimoPost' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/emprestimos/{id}/devolver': {
    patch: {
      tags: ['Emprestimos'],
      summary: 'Registra devolucao parcial ou total de emprestimo',
      description: `
            + Caso de uso: Registrar devolucao de itens emprestados.

            + Regras de Negocio:
                - Quantidade devolvida deve ser maior que zero e menor ou igual ao saldo em aberto.
                - O sistema gera automaticamente uma movimentacao de entrada para repor o estoque.
                - Quando quantidade em aberto chega a zero, o emprestimo e marcado como devolvido.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do emprestimo')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/DevolucaoEmprestimoPost' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/emprestimos/{id}/desfazer-devolucao': {
    patch: {
      tags: ['Emprestimos'],
      summary: 'Desfaz a devolucao registrada de um emprestimo',
      description: `
            + Caso de uso: Reverter uma devolucao registrada por engano.

            + Regras de Negocio:
                - So pode ser desfeita se houver quantidade devolvida registrada.
                - O sistema gera automaticamente uma movimentacao de saida para remover novamente o estoque reposto.
                - Zera a quantidade devolvida, restaura a quantidade em aberto e limpa a data/observacoes de devolucao.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do emprestimo')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
