import orcamentosSchemas from '../schemas/orcamentoSchema.js';
import commonResponses from '../schemas/swaggerCommonResponses.js';
import { generateParameters } from './utils/generateParameters.js';

const orcamentosRoutes = {
  '/orcamentos': {
    post: {
      tags: ['Orçamentos'],
      summary: 'Cria um novo orçamento',
      description: `
            + Caso de uso: Criar um novo orçamento com itens e seus respectivos valores.
            
            + Função de Negócio:
                - Permitir ao usuário criar orçamentos para projetos específicos.
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **OrcamentoPost**, contendo dados do orçamento e itens.

            + Regras de Negócio:
                - Campos obrigatórios: nome, item_orcamento (array).
                - Protocolo é gerado automaticamente pelo sistema (UUID).
                - Valor total é calculado automaticamente baseado nos itens.
                - Cada item deve ter: nome, fornecedor, quantidade, valor_unitario.
                - Subtotal de cada item é calculado automaticamente.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **OrcamentoDetalhes**, contendo todos os dados do orçamento criado.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/OrcamentoPost',
            },
          },
        },
      },
      responses: {
        201: commonResponses[201]('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },

    get: {
      tags: ['Orçamentos'],
      summary: 'Lista todos os orçamentos',
      description: `
        + Caso de uso: Listagem de orçamentos para consulta e controle.
        
        + Função de Negócio:
            - Permitir à front-end, App Mobile e serviços server-to-server obter uma lista paginada de orçamentos.
            + Recebe como query parameters (opcionais):
                • filtros: nome, protocolo, valor.  
                • paginação: page (número da página), limite (quantidade de itens por página).

        + Regras de Negócio:
            - Validar formatos e valores dos filtros fornecidos.  
            - Respeitar as permissões do usuário autenticado.  
            - Aplicar paginação e retornar metadados: total de registros e total de páginas.
            - Limite máximo de 100 itens por página.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **OrcamentoListagem**, contendo:
                • **data**: array de orçamentos.  
                • **dados de paginação**: totalDocs, limit, totalPages, page, pagingCounter, hasPrevPage, hasNextPage, prevPage, nextPage.
            `,
      security: [{ bearerAuth: [] }],
      parameters: generateParameters(orcamentosSchemas.OrcamentoFiltro).concat([
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
          description: 'Lista de orçamentos retornada com sucesso',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/OrcamentoListagem',
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
  '/orcamentos/{id}': {
    get: {
      tags: ['Orçamentos'],
      summary: 'Obtém detalhes de um orçamento',
      description: `
            + Caso de uso: Consulta de detalhes de orçamento específico.
            
            + Função de Negócio:
                - Permitir à front-end, App Mobile ou serviços obter todas as informações de um orçamento.
                + Recebe como path parameter:
                    - **id**: identificador do orçamento (MongoDB ObjectId).

            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência do orçamento.  
                - Retorna orçamento com todos os itens e cálculos.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **OrcamentoDetalhes**, contendo dados completos do orçamento.
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
          description: 'ID do orçamento',
        },
      ],
      responses: {
        200: commonResponses[200]('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    patch: {
      tags: ['Orçamentos'],
      summary: 'Atualiza um orçamento',
      description: `
            + Caso de uso: Atualizar informações básicas de um orçamento.
            
            + Função de Negócio:
                - Permitir ao usuário atualizar nome e descrição do orçamento.
                + Recebe como path parameter:
                    - **id**: identificador do orçamento (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **OrcamentoUpdate** com campos a serem atualizados.

            + Regras de Negócio:
                - Permite atualização parcial de nome e descrição.
                - Não permite alterar itens diretamente (usar rotas específicas).
                - Valor total permanece baseado nos itens existentes.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **OrcamentoDetalhes**, contendo dados atualizados.
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
          description: 'ID do orçamento',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/OrcamentoUpdate',
            },
          },
        },
      },
      responses: {
        200: commonResponses[200]('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    delete: {
      tags: ['Orçamentos'],
      summary: 'Remove um orçamento',
      description: `
            + Caso de uso: Remover orçamento do sistema.
            
            + Função de Negócio:
                - Permitir ao usuário remover orçamentos desnecessários.
                + Recebe como path parameter:
                    - **id**: identificador do orçamento (MongoDB ObjectId).

            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência do orçamento.
                - Remove orçamento e todos os itens associados.

            + Resultado Esperado:
                - HTTP 200 OK com confirmação de remoção.
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
          description: 'ID do orçamento',
        },
      ],
      responses: {
        200: commonResponses[200](),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  '/orcamentos/{orcamentoId}/itens': {
    get: {
      tags: ['Orçamentos'],
      summary: 'Lista itens de um orçamento',
      description: `
            + Caso de uso: Listar todos os itens de um orçamento específico.
            
            + Função de Negócio:
                - Permitir ao usuário visualizar todos os itens de um orçamento.
                + Recebe como path parameter:
                    - **orcamentoId**: identificador do orçamento (MongoDB ObjectId).

            + Regras de Negócio:
                - Orçamento deve existir.
                - Retorna lista completa de itens com seus detalhes.

            + Resultado Esperado:
                - HTTP 200 OK com array de itens do orçamento.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'orcamentoId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do orçamento',
        },
      ],
      responses: {
        200: {
          description: 'Itens do orçamento retornados com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ItemOrcamento',
                    },
                  },
                  message: {
                    type: 'string',
                    example: 'Itens do orçamento listados com sucesso',
                  },
                  errors: {
                    type: 'array',
                    example: [],
                  },
                },
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
    post: {
      tags: ['Orçamentos'],
      summary: 'Adiciona item ao orçamento',
      description: `
            + Caso de uso: Adicionar novo item a um orçamento existente.
            
            + Função de Negócio:
                - Permitir ao usuário adicionar itens a orçamentos.
                + Recebe como path parameter:
                    - **orcamentoId**: identificador do orçamento (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **ItemOrcamento** com dados do item.

            + Regras de Negócio:
                - Orçamento deve existir.
                - Subtotal é calculado automaticamente.
                - Valor total do orçamento é recalculado.
                - Cada item recebe um _id único.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **OrcamentoDetalhes**, contendo orçamento atualizado.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'orcamentoId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do orçamento',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ItemOrcamento',
            },
          },
        },
      },
      responses: {
        201: commonResponses[201]('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  '/orcamentos/{orcamentoId}/itens/{id}': {
    patch: {
      tags: ['Orçamentos'],
      summary: 'Atualiza item do orçamento',
      description: `
            + Caso de uso: Atualizar item específico de um orçamento.
            
            + Função de Negócio:
                - Permitir ao usuário atualizar dados de um item do orçamento.
                + Recebe como path parameters:
                    - **orcamentoId**: identificador do orçamento (MongoDB ObjectId).
                    - **id**: identificador do item (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **ItemOrcamentoUpdate** com dados atualizados.

            + Regras de Negócio:
                - Orçamento e item devem existir.
                - Subtotal é recalculado automaticamente.
                - Valor total do orçamento é recalculado.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **OrcamentoDetalhes**, contendo orçamento atualizado.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'orcamentoId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do orçamento',
        },
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
              $ref: '#/components/schemas/ItemOrcamentoUpdate',
            },
          },
        },
      },
      responses: {
        200: commonResponses[200]('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    delete: {
      tags: ['Orçamentos'],
      summary: 'Remove item do orçamento',
      description: `
            + Caso de uso: Remover item específico de um orçamento.
            
            + Função de Negócio:
                - Permitir ao usuário remover itens desnecessários do orçamento.
                + Recebe como path parameters:
                    - **orcamentoId**: identificador do orçamento (MongoDB ObjectId).
                    - **id**: identificador do item (MongoDB ObjectId).

            + Regras de Negócio:
                - Orçamento e item devem existir.
                - Valor total do orçamento é recalculado após remoção.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **OrcamentoDetalhes**, contendo orçamento atualizado.
        `,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'orcamentoId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do orçamento',
        },
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
        200: commonResponses[200]('#/components/schemas/OrcamentoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
};

export default orcamentosRoutes;
