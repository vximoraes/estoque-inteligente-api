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
import { UsuarioSchema, UsuarioUpdateSchema } from './UsuarioSchema.js';

const UsuarioDetalhes = registry.register(
  'UsuarioDetalhes',
  z.object({
    _id: objectIdField,
    nome: z.string().openapi({ example: 'João Silva' }),
    email: z.string().email().openapi({ example: 'joao@email.com' }),
    ativo: z.boolean().openapi({ example: true }),
    grupos: z.array(objectIdField).openapi({ example: [] }),
    fotoPerfil: z
      .string()
      .optional()
      .openapi({ example: 'https://storage/foto.jpg' }),
    ...timestampFields,
  }),
);

const UsuarioUploadFotoResposta = registry.register(
  'UsuarioUploadFotoResposta',
  z.object({
    data: z.object({
      etag: z.string().openapi({ example: '3e73f59102c83ab67c509a414c22279e' }),
      versionId: z.string().nullable().openapi({ example: null }),
    }),
    message: z.string().openapi({ example: 'Foto atualizada com sucesso.' }),
    errors: z.array(z.unknown()).openapi({ example: [] }),
  }),
);

registry.register(
  'UsuarioListagem',
  z.object({ data: z.array(UsuarioDetalhes), ...paginationMetaFields }),
);
registry.register('UsuarioPost', UsuarioSchema);
registry.register('UsuarioPatch', UsuarioUpdateSchema);

registerPaths({
  '/usuarios': {
    post: {
      tags: ['Usuários'],
      summary: 'Cria um novo usuário',
      description: `
            + Caso de uso: Criação de novo usuário no sistema.

            + Função de Negócio:
                - Permitir ao perfil administrador inserir um novo usuário com todos os dados obrigatórios.

            + Regras de Negócio:
                - Validação de campos obrigatórios (nome, email, senha).
                - Verificação de unicidade para email.
                - Definição de status inicial (ativo: false por padrão).
                - Em caso de duplicidade ou erro de validação, retorna erro apropriado.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **UsuarioDetalhes**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UsuarioPost' },
          },
        },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/UsuarioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    get: {
      tags: ['Usuários'],
      summary: 'Lista todos os usuários',
      description: `
        + Caso de uso: Listagem de usuários para gerenciamento e consulta.

        + Regras de Negócio:
            - Aplicar paginação. Limite máximo de 100 itens por página.
            - Respeitar as permissões do usuário autenticado.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **UsuarioListagem**.
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
          name: 'email',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filtro por email',
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
        200: commonResponses[200]!('#/components/schemas/UsuarioListagem'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/usuarios/{id}': {
    get: {
      tags: ['Usuários'],
      summary: 'Obtém detalhes de um usuário',
      description: `
            + Caso de uso: Consulta de detalhes de usuário específico.

            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência do usuário e seu status (ativo/inativo).
                - Checar permissões do solicitante para visualizar dados sensíveis.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **UsuarioDetalhes**.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do usuário')],
      responses: {
        200: commonResponses[200]!('#/components/schemas/UsuarioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    patch: {
      tags: ['Usuários'],
      summary: 'Atualiza um usuário',
      description: `
            + Caso de uso: Atualização parcial de dados do usuário.

            + Regras de Negócio:
                - Aplicar imediatamente alterações críticas (ex.: desativação inibe login).
                - Impedir alterações inconsistentes com regras de negócio.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **UsuarioDetalhes**, refletindo as alterações.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do usuário')],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UsuarioPatch' },
          },
        },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/UsuarioDetalhes'),
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Usuários'],
      summary: 'Deleta um usuário',
      description: `
            + Regras de Negócio:
                - Verificar impedimentos por relacionamento antes de excluir.
                - Registrar log de auditoria sobre a operação.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do usuário')],
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

  '/usuarios/{id}/foto': {
    put: {
      tags: ['Usuários'],
      summary: 'Faz upload da foto do usuário',
      description: `
            + Caso de uso: Upload de foto de perfil do usuário.

            + Regras de Negócio:
                - Usuário deve existir e estar ativo.
                - Arquivo deve ser uma imagem válida. Tamanho máximo: 5 MB.
                - Imagem é comprimida automaticamente antes do armazenamento.

            + Resultado Esperado:
                - HTTP 201 Created com dados do upload (etag, versionId).
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do usuário')],
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
                  description:
                    'Arquivo de imagem para foto de perfil (máx 5 MB)',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Foto atualizada com sucesso',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UsuarioUploadFotoResposta',
              },
            },
          },
        },
        400: commonResponses[400]!(),
        401: commonResponses[401]!(),
        404: commonResponses[404]!(),
        413: commonResponses[413]!(),
        498: commonResponses[498]!(),
        500: commonResponses[500]!(),
      },
    },

    delete: {
      tags: ['Usuários'],
      summary: 'Deleta a foto do usuário',
      description: `
            + Regras de Negócio:
                - Usuário deve existir no sistema.
                - Remove o arquivo de imagem do MinIO/S3. Operação é irreversível.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [idPathParam('ID do usuário')],
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
