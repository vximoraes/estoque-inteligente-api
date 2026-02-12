import rotasSchemas from "../schemas/rotaSchema.js";
import commonResponses from "../schemas/swaggerCommonResponses.js";
import { generateParameters } from "./utils/generateParameters.js";

const rotasRoutes = {
    "/rotas": {
        post: {
            tags: ["Rotas"],
            summary: "Cria uma nova rota",
            description: `
            + Caso de uso: Criação de nova rota de acesso no sistema para controle de permissões.
            
            + Função de Negócio:
                - Permitir ao usuário autenticado criar uma nova rota para controle de permissões de acesso.
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **RotaPost**, contendo rota, dominio e descrição opcional.

            + Regras de Negócio:
                - Rota é obrigatória e deve ter no mínimo 1 caractere.
                - Dominio é obrigatório.
                - Combinação rota + dominio deve ser única no sistema.
                - Campo 'ativo' tem padrão true.
                - Em caso de duplicidade ou erro de validação, retorna erro apropriado.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **RotaDetalhes**, contendo todos os dados da rota criada.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/RotaPost"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/RotaDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        
        get: {
            tags: ["Rotas"],
            summary: "Lista todas as rotas",
            description: `
        + Caso de uso: Listagem de rotas para gerenciamento e consulta.
        
        + Função de Negócio:
            - Permitir à front-end, App Mobile e serviços server-to-server obter uma lista paginada de rotas cadastradas.
            + Recebe como query parameters (opcionais):
                • filtros: rota, dominio, ativo.  
                • paginação: page (número da página), limite (quantidade de itens por página).

        + Regras de Negócio:
            - Validar formatos e valores dos filtros fornecidos.  
            - Respeitar as permissões do usuário autenticado.  
            - Aplicar paginação e retornar metadados: total de registros e total de páginas.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **RotaListagem**, contendo:
                • **docs**: array de rotas.  
                • **dados de paginação**: totalDocs, limit, totalPages, page, pagingCounter, hasPrevPage, hasNextPage, prevPage, nextPage.
            `,
            security: [{ bearerAuth: [] }],
            parameters: generateParameters(rotasSchemas.RotaFiltro),
            responses: {
                200: {
                    description: "Lista de rotas retornada com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/RotaListagem"
                            }
                        }
                    }
                },
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
    },
    "/rotas/{id}": {
        get: {
            tags: ["Rotas"],
            summary: "Obtém detalhes de uma rota",
            description: `
            + Caso de uso: Consulta de detalhes de rota específica.
            
            + Função de Negócio:
                - Permitir à front-end, App Mobile ou serviços obter todas as informações de uma rota cadastrada.
                + Recebe como path parameter:
                    - **id**: identificador da rota (MongoDB ObjectId).

            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência da rota e seu status (ativo/inativo).  
                - Checar permissões do solicitante para visualizar dados.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **RotaDetalhes**, contendo dados completos da rota.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                    },
                    description: "ID da rota"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/RotaDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },

        patch: {
            tags: ["Rotas"],
            summary: "Atualiza uma rota",
            description: `
            + Caso de uso: Atualização parcial de dados da rota.
            
            + Função de Negócio:
                - Permitir ao usuário autorizado modificar os campos desejados da rota.
                + Recebe:
                    - **id** no path.  
                    - No corpo, objeto conforme **RotaPutPatch** com os campos a alterar.

            + Regras de Negócio:
                - Garantir unicidade da combinação rota + dominio.  
                - Aplicar imediatamente alterações críticas (ex.: desativação).  
                - Impedir alterações inconsistentes com regras de negócio.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **RotaDetalhes**, refletindo as alterações.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                    },
                    description: "ID da rota"
                }
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/RotaPutPatch"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/RotaDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },

        put: {
            tags: ["Rotas"],
            summary: "Substitui uma rota",
            description: `
            + Caso de uso: Substituição completa de dados da rota.
            
            + Função de Negócio:
                - Permitir ao usuário autorizado substituir completamente os dados da rota.
                + Recebe:
                    - **id** no path.  
                    - No corpo, objeto conforme **RotaPutPatch** com todos os campos.

            + Regras de Negócio:
                - Garantir unicidade da combinação rota + dominio.  
                - Aplicar imediatamente alterações críticas (ex.: desativação).  
                - Campos não informados assumem valores padrão.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **RotaDetalhes**, refletindo as alterações.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                    },
                    description: "ID da rota"
                }
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/RotaPutPatch"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/RotaDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },

        delete: {
            tags: ["Rotas"],
            summary: "Deleta uma rota",
            description: `
            + Caso de uso: Exclusão de rota do sistema.
            
            + Função de Negócio:
                - Permitir ao usuário autorizado remover uma rota sem afetar integridade de dados.
                + Recebe como path parameter:
                    - **id**: identificador da rota.

            + Regras de Negócio:
                - Verificar impedimentos por relacionamento (permissões vinculadas) antes de excluir.  
                - Registrar log de auditoria sobre a operação.  
                - Garantir que não haja vínculos críticos pendentes.

            + Resultado Esperado:
                - HTTP 200 OK - rota excluída com sucesso.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                    },
                    description: "ID da rota"
                }
            ],
            responses: {
                200: commonResponses[200](),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default rotasRoutes;