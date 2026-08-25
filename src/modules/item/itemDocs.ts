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
import { ItemSchema } from './ItemSchema.js';

const ItemDetalhes = registry.register(
  'ItemDetalhes',
  z.object({
    _id: objectIdField,
    nome: z.string().openapi({ example: 'Resistor 10k Ohm' }),
    tipo: z.enum(['consumo']).openapi({
      example: 'consumo',
      description:
        'Item de almoxarifado, controlado por quantidade agregada. Bens permanentes (patrimônio) são cadastrados direto em /patrimonios, sem passar por Item.',
    }),
    quantidade: z.number().int().openapi({ example: 150 }),
    quantidade_disponivel: z.number().int().openapi({
      example: 150,
      description: "Reflete 'quantidade' agregada por localização.",
    }),
    estoque_minimo: z.number().int().openapi({ example: 50 }),
    descricao: z
      .string()
      .optional()
      .openapi({ example: 'Resistor de precisão 1/4W 5%' }),
    imagem: z
      .string()
      .optional()
      .openapi({ example: 'https://storage/resistor.jpg' }),
    categoria: objectIdField,
    ativo: z.boolean().openapi({ example: true }),
    status: z
      .enum(['Indisponível', 'Baixo Estoque', 'Em Estoque'])
      .openapi({ example: 'Em Estoque' }),
    ...timestampFields,
  }),
);

registry.register(
  'ItemPost',
  ItemSchema.extend({
    estoque_minimo: z.number().int().min(0).openapi({ example: 50 }),
    categoria: objectIdField,
  }),
);

registry.register(
  'ItemPatch',
  ItemSchema.omit({ tipo: true })
    .partial()
    .extend({
      estoque_minimo: z
        .number()
        .int()
        .min(0)
        .optional()
        .openapi({ example: 75 }),
      categoria: objectIdField.optional(),
    }),
);

const ItemUploadFotoResposta = registry.register(
  'ItemUploadFotoResposta',
  z.object({
    data: z.object({
      etag: z.string().openapi({ example: '3e73f59102c83ab67c509a414c22279e' }),
      versionId: z.string().nullable().openapi({ example: null }),
    }),
    message: z.string().openapi({ example: 'Foto enviada com sucesso.' }),
    errors: z.array(z.unknown()).openapi({ example: [] }),
  }),
);

registry.register(
  'ItemListagem',
  z.object({ data: z.array(ItemDetalhes), ...paginationMetaFields }),
);

registerPaths({
  '/itens': {
    post: {
      tags: ['Itens'],
      summary: 'Cria um novo item',
      description: `
            + Caso de uso: Criação de novo item do estoque no sistema.

            + Regras de Negócio:
                - Campos obrigatórios: nome, categoria.
                - Campo 'tipo' é sempre 'consumo'. Imutável após a criação.
                - estoque_minimo é opcional (padrão 0) e não pode ser negativo.
                - Campo 'ativo' tem padrão true.
                - Campo 'status' é calculado automaticamente baseado na quantidade total e estoque_minimo.
                - Nome deve ser único no sistema.
                - Categoria deve existir no sistema.
                - Quantidade inicial é 0, atualizada automaticamente pelo estoque por localização.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **ItemDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Itens'],
      summary: 'Lista todos os itens',
      description: `
        + Caso de uso: Listagem de itens para gerenciamento e consulta.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.
            - Retorna itens populados com dados de categoria e localização.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **ItemListagem**.
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
          schema: { type: 'string', enum: ['consumo'] },
          description: 'Filtro por tipo de item',
        },
        {
          name: 'categoria',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por categoria (ObjectId)',
        },
        {
          name: 'ativo',
          in: 'query',
          required: false,
          schema: { type: 'boolean' },
          description: 'Filtro por status',
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: ['Indisponível', 'Baixo Estoque', 'Em Estoque'],
          },
          description: 'Filtro por status de estoque',
        },
        ...paginationQueryParams,
      ],
      responses: {
        200: commonResponses[200]!('#/components/schemas/ItemListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/itens/{id}': {
    get: {
      tags: ['Itens'],
      summary: 'Obtém detalhes de um item',
      description: `
            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência do item.
                - Retorna item populado com dados de categoria e localização.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **ItemDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do item')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Itens'],
      summary: 'Atualiza um item',
      description: `
            + Regras de Negócio:
                - Não permite alterar quantidade diretamente (apenas via movimentação).
                - Garantir unicidade do nome do item.
                - Verificar se o item existe antes de atualizar.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **ItemDetalhes**, refletindo as alterações.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do item')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        409: commonResponses[409]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/itens/{id}/inativar': {
    patch: {
      tags: ['Itens'],
      summary: 'Inativa um item',
      description: `
            + Caso de uso: Inativação de item preservando integridade referencial.

            + Regras de Negócio:
                - Verificar se o item existe antes de inativar.
                - Altera o campo 'ativo' para false.
                - Mantém todos os vínculos e histórico intactos.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **ItemDetalhes**, com ativo = false.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do item')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/itens/{id}/foto': {
    post: {
      tags: ['Itens'],
      summary: 'Faz upload da foto do item',
      description: `
            + Caso de uso: Upload de foto do item do estoque.

            + Regras de Negócio:
                - Item deve existir e estar ativo.
                - Arquivo deve ser uma imagem válida.
                - Usuário deve ter permissão para alterar itens.

            + Resultado Esperado:
                - HTTP 201 Created com dados do item atualizado incluindo caminho da foto.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do item')],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Arquivo de imagem do item',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Foto enviada com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ItemUploadFotoResposta' },
            },
          },
        },
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Itens'],
      summary: 'Deleta a foto do item',
      description: `
            + Regras de Negócio:
                - Item deve existir no sistema.
                - Remove o arquivo de imagem do MinIO/S3. Operação é irreversível.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do item')],
      responses: {
        200: commonResponses[200]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
