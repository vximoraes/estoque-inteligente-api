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
import { CategoriaSchema, CategoriaUpdateSchema } from './CategoriaSchema.js';

const CategoriaDetalhes = registry.register(
  'CategoriaDetalhes',
  z.object({
    _id: objectIdField,
    nome: z.string().openapi({ example: 'Eletrônicos' }),
    tipo: z
      .enum(['consumo', 'permanente'])
      .openapi({
        example: 'permanente',
        description:
          "'consumo': categoria de item de almoxarifado. 'permanente': categoria de bem de patrimônio.",
      }),
    ativo: z.boolean().openapi({ example: true }),
    descricao: z
      .string()
      .optional()
      .openapi({ example: 'Itens eletrônicos e periféricos' }),
    ...timestampFields,
  }),
);

const CategoriaListagem = registry.register(
  'CategoriaListagem',
  z.object({
    data: z.array(CategoriaDetalhes),
    ...paginationMetaFields,
  }),
);

registry.register('CategoriaPost', CategoriaSchema);
registry.register('CategoriaPatch', CategoriaUpdateSchema);

registerPaths({
  '/categorias': {
    post: {
      tags: ['Categorias'],
      summary: 'Cria uma nova categoria',
      description: `
            + Caso de uso: Criação de nova categoria de itens no sistema.

            + Função de Negócio:
                - Permitir ao usuário autenticado criar uma nova categoria para organizar itens do estoque.
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **CategoriaPost**, contendo o nome da categoria.

            + Regras de Negócio:
                - Nome é obrigatório e deve ter no mínimo 3 caracteres.
                - Nome deve ser único no sistema.
                - Em caso de duplicidade ou erro de validação, retorna erro apropriado.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **CategoriaDetalhes**, contendo todos os dados da categoria criada.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CategoriaPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/CategoriaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Categorias'],
      summary: 'Lista todas as categorias',
      description: `
        + Caso de uso: Listagem de categorias para gerenciamento e consulta.

        + Função de Negócio:
            - Permitir à front-end, App Mobile e serviços server-to-server obter uma lista paginada de categorias cadastradas.
            + Recebe como query parameters (opcionais):
                • filtros: nome.
                • paginação: page, limite.

        + Regras de Negócio:
            - Validar formatos e valores dos filtros fornecidos.
            - Respeitar as permissões do usuário autenticado.
            - Aplicar paginação e retornar metadados: total de registros e total de páginas.
            - Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **CategoriaListagem**.
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
          name: 'tipo',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['consumo', 'permanente'] },
          description:
            "Filtro por tipo: 'consumo' (almoxarifado) ou 'permanente' (patrimônio)",
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/CategoriaListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/categorias/{id}': {
    get: {
      tags: ['Categorias'],
      summary: 'Obtém detalhes de uma categoria',
      description: `
            + Caso de uso: Consulta de detalhes de categoria específica.

            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência da categoria.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **CategoriaDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da categoria')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/CategoriaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Categorias'],
      summary: 'Atualiza uma categoria',
      description: `
            + Caso de uso: Atualização parcial de dados da categoria.

            + Regras de Negócio:
                - Garantir unicidade do nome da categoria.
                - Verificar se a categoria existe antes de atualizar.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **CategoriaDetalhes**, refletindo as alterações.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da categoria')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CategoriaPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/CategoriaDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

  },

  '/categorias/{id}/inativar': {
    patch: {
      tags: ['Categorias'],
      summary: 'Inativa uma categoria (exclusão lógica)',
      description: `
            + Caso de uso: Inativação de categoria.

            + Regras de Negócio:
                - Verificar se a categoria existe antes de inativar.
                - Não permitir inativação se há itens vinculados à categoria.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **CategoriaDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID da categoria')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/CategoriaDetalhes'),
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
