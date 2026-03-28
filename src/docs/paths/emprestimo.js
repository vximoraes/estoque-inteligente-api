import emprestimosSchemas from '../schemas/emprestimoSchema.js';
import commonResponses from '../schemas/swaggerCommonResponses.js';
import { generateParameters } from './utils/generateParameters.js';

const emprestimosRoutes = {
  '/emprestimos': {
    post: {
      tags: ['Emprestimos'],
      summary: 'Registra um novo emprestimo de item',
      description: `
            + Caso de uso: Registrar emprestimo de um item de uma localizacao especifica.

            + Regras de Negocio:
                - Campos obrigatorios: item, localizacao, quantidade_emprestada, solicitante_nome, data_prevista_devolucao.
                - Deve haver saldo de estoque suficiente na localizacao informada.
                - O sistema gera automaticamente uma movimentacao de saida para reduzir o estoque.
                - Devolucao parcial e total sao tratadas em endpoint dedicado.

            + Resultado Esperado:
                - HTTP 201 Created com os dados do emprestimo e status calculado.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/EmprestimoPost',
            },
          },
        },
      },
      responses: {
        201: commonResponses[201]('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    get: {
      tags: ['Emprestimos'],
      summary: 'Lista emprestimos com filtros e paginacao',
      description: `
            + Caso de uso: Consultar emprestimos para acompanhamento de status e atrasos.

            + Regras de Negocio:
                - Permite filtros por item, localizacao, solicitante e intervalo de datas.
                - Permite listar apenas abertos e/ou atrasados.
                - Status e calculado em tempo real com base nas datas e quantidade em aberto.
                - Limite maximo de 100 itens por pagina.
            `,
      security: [{ bearerAuth: [] }],
      parameters: generateParameters(
        emprestimosSchemas.EmprestimoFiltro,
      ).concat([
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Numero da pagina',
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
          description: 'Quantidade de itens por pagina (maximo 100)',
        },
      ]),
      responses: {
        200: {
          description: 'Lista de emprestimos retornada com sucesso',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/EmprestimoListagem',
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
  '/emprestimos/{id}': {
    get: {
      tags: ['Emprestimos'],
      summary: 'Consulta emprestimo por id',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do emprestimo',
        },
      ],
      responses: {
        200: commonResponses[200]('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
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
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID do emprestimo',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/DevolucaoEmprestimoPost',
            },
          },
        },
      },
      responses: {
        200: commonResponses[200]('#/components/schemas/EmprestimoDetalhes'),
        400: commonResponses[400](),
        401: commonResponses[401](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
};

export default emprestimosRoutes;
