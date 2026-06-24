import itensSchemas from './itemDocsSchema.js';
import commonResponses from '../../docs/schemas/swaggerCommonResponses.js';
import { generateParameters } from '../../docs/paths/utils/generateParameters.js';

const itensRoutes = {
  '/itens': {
    post: {
      tags: ['Itens'],
      summary: 'Cria um novo item',
      description: `
            + Caso de uso: Criação de novo item do estoque no sistema.

            + Função de Negócio:
                - Permitir ao usuário autenticado criar um novo item do estoque com todas as informações necessárias.
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **ItemPost**, contendo dados do item.

            + Regras de Negócio:
                - Campos obrigatórios: nome, estoque_minimo, categoria.
                - estoque_minimo não pode ser negativo.
                - Campo 'ativo' tem padrão true.
                - Campo 'status' é calculado automaticamente baseado na quantidade total e estoque_minimo:
                  * 'Indisponível' quando quantidade = 0
                  * 'Baixo Estoque' quando quantidade > 0 e quantidade <= estoque_minimo
                  * 'Em Estoque' quando quantidade > estoque_minimo
                - Nome deve ser único no sistema.
                - Categoria deve existir no sistema.
                - Quantidade inicial é 0 (atualizada automaticamente baseada no estoque por localização).

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **ItemDetalhes**, contendo todos os dados do item criado.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ItemPost',
            },
          },
        },
      },
      responses: {
        201: commonResponses[201]('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        409: commonResponses[409](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },

    get: {
      tags: ['Itens'],
      summary: 'Lista todos os itens',
      description: `
        + Caso de uso: Listagem de itens para gerenciamento e consulta.

        + Função de Negócio:
            - Permitir à front-end, App Mobile e serviços server-to-server obter uma lista paginada de itens cadastrados.
            + Recebe como query parameters (opcionais):
                • filtros: nome, categoria, ativo, status, estoque_minimo, quantidade.
                • paginação: page (número da página), limite (quantidade de itens por página).

        + Regras de Negócio:
            - Validar formatos e valores dos filtros fornecidos.
            - Respeitar as permissões do usuário autenticado.
            - Aplicar paginação e retornar metadados: total de registros e total de páginas.
            - Limite máximo de 100 itens por página.
            - Retorna itens populados com dados de categoria e localização.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **ItemListagem**, contendo:
                • **data**: array de itens.
                • **dados de paginação**: totalDocs, limit, totalPages, page, pagingCounter, hasPrevPage, hasNextPage, prevPage, nextPage.
            `,
      security: [{ bearerAuth: [] }],
      parameters: generateParameters(itensSchemas.ItemFiltro).concat([
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Número da página',
        },
        {
          name: 'limite',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
          description: 'Quantidade de itens por página (máximo 100)',
        },
      ]),
      responses: {
        200: {
          description: 'Lista de itens retornada com sucesso',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ItemListagem',
              },
            },
          },
        },
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  '/itens/{id}': {
    get: {
      tags: ['Itens'],
      summary: 'Obtém detalhes de um item',
      description: `
            + Caso de uso: Consulta de detalhes de item específico.

            + Função de Negócio:
                - Permitir à front-end, App Mobile ou serviços obter todas as informações de um item cadastrado.
                + Recebe como path parameter:
                    - **id**: identificador do item (MongoDB ObjectId).

            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência do item.
                - Retorna item populado com dados de categoria e localização.
                - Checar permissões do solicitante para visualizar dados.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **ItemDetalhes**, contendo dados completos do item.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do item',
        },
      ],
      responses: {
        200: commonResponses[200]('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },

    patch: {
      tags: ['Itens'],
      summary: 'Atualiza um item',
      description: `
            + Caso de uso: Atualização parcial de dados do item.

            + Função de Negócio:
                - Permitir ao usuário autenticado modificar informações do item.
                + Recebe:
                    - **id** no path.
                    - No corpo, objeto conforme **ItemPutPatch** com os campos a alterar.

            + Regras de Negócio:
                - Permite atualização parcial de campos.
                - Não permite alterar quantidade diretamente (apenas via movimentação).
                - Garantir unicidade do nome do item.
                - Verificar se o item existe antes de atualizar.
                - Validar se categoria e localização existem (se informados).

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **ItemDetalhes**, refletindo as alterações.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do item',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ItemPutPatch',
            },
          },
        },
      },
      responses: {
        200: commonResponses[200]('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        409: commonResponses[409](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  '/itens/{id}/inativar': {
    patch: {
      tags: ['Itens'],
      summary: 'Inativa um item',
      description: `
            + Caso de uso: Inativação de item preservando integridade referencial.

            + Função de Negócio:
                - Permitir ao usuário autenticado inativar um item sem removê-lo fisicamente.
                - Substitui a remoção física para manter histórico e integridade referencial.
                + Recebe como path parameter:
                    - **id**: identificador do item.

            + Regras de Negócio:
                - Verificar se o item existe antes de inativar.
                - Altera o campo 'ativo' para false.
                - Mantém todos os vínculos e histórico intactos.
                - Registrar log de auditoria sobre a operação.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **ItemDetalhes**, com ativo = false.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do item',
        },
      ],
      responses: {
        200: commonResponses[200]('#/components/schemas/ItemDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  '/itens/{id}/foto': {
    post: {
      tags: ['Itens'],
      summary: 'Faz upload da foto do item',
      description: `
            + Caso de uso: Upload de foto do item do estoque.

            + Função de Negócio:
                - Permitir ao usuário autenticado fazer upload de uma foto do item para facilitar identificação visual.
                + Recebe como path parameter:
                    - **id**: identificador do item (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - Arquivo de imagem via multipart/form-data no campo 'file'.

            + Regras de Negócio:
                - Item deve existir e estar ativo.
                - Arquivo deve ser uma imagem válida (formatos aceitos pelo multer).
                - Tamanho do arquivo deve respeitar os limites configurados.
                - Usuário deve ter permissão para alterar itens.

            + Resultado Esperado:
                - HTTP 201 Created com dados do item atualizado incluindo caminho da foto.
                - Em caso de item inexistente, retorna erro 404.
                - Em caso de arquivo inválido, retorna erro 400.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do item',
        },
      ],
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
              schema: {
                $ref: '#/components/schemas/ItemUploadFotoResposta',
              },
            },
          },
        },
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    delete: {
      tags: ['Itens'],
      summary: 'Deleta a foto do item',
      description: `
            + Caso de uso: Remoção da foto do item do estoque.

            + Função de Negócio:
                - Permitir ao usuário autenticado remover a foto de um item do sistema de armazenamento.
                + Recebe como path parameter:
                    - **id**: identificador do item (MongoDB ObjectId).

            + Regras de Negócio:
                - Item deve existir no sistema.
                - Remove o arquivo de imagem do MinIO/S3.
                - Usuário deve ter permissão para alterar itens.
                - Operação é irreversível.

            + Resultado Esperado:
                - HTTP 200 OK - Foto deletada com sucesso.
                - Em caso de item inexistente, retorna erro 404.
                - Em caso de erro no serviço de armazenamento, retorna erro 500.
            `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do item',
        },
      ],
      responses: {
        200: commonResponses[200](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
};

export default itensRoutes;
