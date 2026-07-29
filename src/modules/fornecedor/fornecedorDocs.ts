import { z } from 'zod';
import { registry, registerPaths } from '../../utils/openapi/registry.js';
import { objectIdField, timestampFields, idPathParam, paginationMetaFields, paginationQueryParams } from '../../utils/openapi/commonSchemas.js';
import commonResponses from '../../utils/openapi/commonResponses.js';
import { FornecedorSchema, FornecedorUpdateSchema } from './FornecedorSchema.js';

const FornecedorDetalhes = registry.register(
  'FornecedorDetalhes',
  z.object({
    _id: objectIdField,
    nome: z.string().openapi({ example: 'TechComponents LTDA' }),
    ativo: z.boolean().openapi({ example: true }),
    url: z.string().optional().openapi({ example: 'https://www.techcomponents.com.br' }),
    contato: z.string().optional().openapi({ example: '(11) 98765-4321' }),
    descricao: z.string().optional().openapi({ example: 'Fornecedor especializado em itens eletrônicos' }),
    ...timestampFields,
  }),
);

registry.register('FornecedorListagem', z.object({ data: z.array(FornecedorDetalhes), ...paginationMetaFields }));
registry.register('FornecedorPost', FornecedorSchema);
registry.register('FornecedorPatch', FornecedorUpdateSchema);

registerPaths({
  '/fornecedores': {
    post: {
      tags: ['Fornecedores'],
      summary: 'Cria um novo fornecedor',
      description: `
            + Caso de uso: Criação de novo fornecedor no sistema.

            + Função de Negócio:
                - Permitir ao usuário autenticado criar um novo fornecedor para registrar movimentações de entrada.

            + Regras de Negócio:
                - Campo obrigatório: nome (mínimo 3 caracteres).
                - Campo 'ativo' tem padrão true.
                - Nome deve ser único no sistema.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **FornecedorDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/FornecedorPost' } } },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/FornecedorDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Fornecedores'],
      summary: 'Lista todos os fornecedores',
      description: `
        + Caso de uso: Listagem de fornecedores para gerenciamento e consulta.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **FornecedorListagem**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'nome', in: 'query', required: false, schema: { type: 'string' }, description: 'Filtro por nome' },
        { name: 'ativo', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Filtro por status' },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/FornecedorListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/fornecedores/{id}': {
    get: {
      tags: ['Fornecedores'],
      summary: 'Obtém detalhes de um fornecedor',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do fornecedor')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/FornecedorDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Fornecedores'],
      summary: 'Atualiza um fornecedor',
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do fornecedor')],
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/FornecedorPatch' } } },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/FornecedorDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Fornecedores'],
      summary: 'Deleta um fornecedor',
      description: `
            + Regras de Negócio:
                - Verificar se o fornecedor existe antes de excluir.
                - Não permitir exclusão se há movimentações vinculadas ao fornecedor.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do fornecedor')],
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
