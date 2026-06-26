import { z } from 'zod';
import { registry, registerPaths } from '../../utils/openapi/registry.js';
import { objectIdField, timestampFields, idPathParam, paginationMetaFields, paginationQueryParams } from '../../utils/openapi/commonSchemas.js';
import commonResponses from '../../utils/openapi/commonResponses.js';
import { EmprestimoSchema, DevolucaoEmprestimoSchema, AtualizarEmprestimoSchema } from './EmprestimoSchema.js';

const dateTimeNullableField = z.string().datetime().nullable().optional().openapi({ example: '2024-02-15T10:30:00.000Z' });
const quantidadeIntField = (min: number, example: number) => z.number().int().min(min).openapi({ example });

const EmprestimoDetalhes = registry.register(
  'EmprestimoDetalhes',
  z.object({
    _id: objectIdField,
    item: objectIdField,
    localizacao: objectIdField,
    quantidade_emprestada: quantidadeIntField(1, 5),
    quantidade_devolvida: quantidadeIntField(0, 0),
    quantidade_em_aberto: quantidadeIntField(0, 5),
    solicitante_nome: z.string().openapi({ example: 'João Silva' }),
    solicitante_email: z.string().email().optional().openapi({ example: 'joao@exemplo.com' }),
    data_prevista_devolucao: z.string().datetime().nullable().openapi({ example: '2024-02-15T10:30:00.000Z' }),
    data_devolucao: z.string().datetime().nullable(),
    observacoes_emprestimo: z.string().optional().openapi({ example: 'Empréstimo para laboratório' }),
    observacoes_devolucao: z.string().optional(),
    status: z.enum(['aberto', 'devolvido', 'atrasado']).openapi({ example: 'aberto' }),
    usuario: objectIdField,
    ...timestampFields,
  }),
);

registry.register('EmprestimoPost', EmprestimoSchema.extend({
  item: objectIdField,
  localizacao: objectIdField,
  quantidade_emprestada: quantidadeIntField(1, 5),
  data_prevista_devolucao: dateTimeNullableField,
}));

registry.register('DevolucaoEmprestimoPost', DevolucaoEmprestimoSchema.extend({
  quantidade_devolvida: quantidadeIntField(1, 3),
}));

registry.register('AtualizarEmprestimoPost', AtualizarEmprestimoSchema.extend({
  data_prevista_devolucao: dateTimeNullableField,
}));

registry.register('EmprestimoListagem', z.object({ data: z.array(EmprestimoDetalhes), ...paginationMetaFields }));

registerPaths({
  '/emprestimos': {
    post: {
      tags: ['Emprestimos'],
      summary: 'Registra um novo emprestimo de item',
      description: `
            + Caso de uso: Registrar emprestimo de um item de uma localizacao especifica.

            + Regras de Negocio:
                - Campos obrigatorios: item, localizacao, quantidade_emprestada, solicitante_nome.
                - Deve haver saldo de estoque suficiente na localizacao informada.
                - O sistema gera automaticamente uma movimentacao de saida para reduzir o estoque.
                - Devolucao parcial e total sao tratadas em endpoint dedicado.

            + Resultado Esperado:
                - HTTP 201 Created com os dados do emprestimo e status calculado.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/EmprestimoPost' } } },
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
        { name: 'item', in: 'query', required: false, schema: { type: 'string' }, description: 'Filtro por ID do item' },
        { name: 'localizacao', in: 'query', required: false, schema: { type: 'string' }, description: 'Filtro por ID da localização' },
        { name: 'solicitante_nome', in: 'query', required: false, schema: { type: 'string' }, description: 'Filtro por nome do solicitante' },
        { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['aberto', 'devolvido', 'atrasado'] }, description: 'Filtro por status' },
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
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarEmprestimoPost' } } },
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
        content: { 'application/json': { schema: { $ref: '#/components/schemas/DevolucaoEmprestimoPost' } } },
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
});
