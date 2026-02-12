import gruposSchemas from "../schemas/grupoSchema.js";
import commonResponses from "../schemas/swaggerCommonResponses.js";
import { generateParameters } from "./utils/generateParameters.js";

const gruposRoutes = {
    "/grupos": {
        post: {
            tags: ["Grupos"],
            summary: "Cria um novo grupo",
            description: `
            + Caso de uso: Criação de novo grupo para organização de usuários e permissões.
            
            + Função de Negócio:
                - Permitir ao usuário autenticado criar um novo grupo para organizar permissões de acesso.
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **GrupoPost**, contendo nome, descrição e permissões opcionais.

            + Regras de Negócio:
                - Nome é obrigatório e deve ter no mínimo 3 caracteres.
                - Nome deve ser único no sistema.
                - Campo 'ativo' tem padrão true.
                - Permissões são opcionais na criação.
                - Em caso de duplicidade ou erro de validação, retorna erro apropriado.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **GrupoDetalhes**, contendo todos os dados do grupo criado.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/GrupoPost"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/GrupoDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        
        get: {
            tags: ["Grupos"],
            summary: "Lista todos os grupos",
            description: `
        + Caso de uso: Listagem de grupos para gerenciamento e consulta.
        
        + Função de Negócio:
            - Permitir à front-end, App Mobile e serviços server-to-server obter uma lista paginada de grupos cadastrados.
            + Recebe como query parameters (opcionais):
                • filtros: nome, ativo.  
                • paginação: page (número da página), limite (quantidade de itens por página).

        + Regras de Negócio:
            - Validar formatos e valores dos filtros fornecidos.  
            - Respeitar as permissões do usuário autenticado.  
            - Aplicar paginação e retornar metadados: total de registros e total de páginas.

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **GrupoListagem**, contendo:
                • **docs**: array de grupos.  
                • **dados de paginação**: totalDocs, limit, totalPages, page, pagingCounter, hasPrevPage, hasNextPage, prevPage, nextPage.
            `,
            security: [{ bearerAuth: [] }],
            parameters: generateParameters(gruposSchemas.GrupoFiltro),
            responses: {
                200: {
                    description: "Lista de grupos retornada com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/GrupoListagem"
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
    "/grupos/{id}": {
        get: {
            tags: ["Grupos"],
            summary: "Obtém detalhes de um grupo",
            description: `
            + Caso de uso: Consulta de detalhes de grupo específico.
            
            + Função de Negócio:
                - Permitir à front-end, App Mobile ou serviços obter todas as informações de um grupo cadastrado.
                + Recebe como path parameter:
                    - **id**: identificador do grupo (MongoDB ObjectId).

            + Regras de Negócio:
                - Validação do formato do ID.
                - Verificar existência do grupo e seu status (ativo/inativo).  
                - Checar permissões do solicitante para visualizar dados.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **GrupoDetalhes**, contendo dados completos do grupo.
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
                    description: "ID do grupo"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/GrupoDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },

        patch: {
            tags: ["Grupos"],
            summary: "Atualiza um grupo",
            description: `
            + Caso de uso: Atualização parcial de dados do grupo.
            
            + Função de Negócio:
                - Permitir ao usuário autorizado modificar os campos desejados do grupo.
                + Recebe:
                    - **id** no path.  
                    - No corpo, objeto conforme **GrupoPutPatch** com os campos a alterar.

            + Regras de Negócio:
                - Garantir unicidade de campos como nome.  
                - Aplicar imediatamente alterações críticas (ex.: desativação).  
                - Impedir alterações inconsistentes com regras de negócio.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **GrupoDetalhes**, refletindo as alterações.
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
                    description: "ID do grupo"
                }
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/GrupoPutPatch"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/GrupoDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },

        put: {
            tags: ["Grupos"],
            summary: "Substitui um grupo",
            description: `
            + Caso de uso: Substituição completa de dados do grupo.
            
            + Função de Negócio:
                - Permitir ao usuário autorizado substituir completamente os dados do grupo.
                + Recebe:
                    - **id** no path.  
                    - No corpo, objeto conforme **GrupoPutPatch** com todos os campos.

            + Regras de Negócio:
                - Garantir unicidade de campos como nome.  
                - Aplicar imediatamente alterações críticas (ex.: desativação).  
                - Campos não informados assumem valores padrão.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **GrupoDetalhes**, refletindo as alterações.
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
                    description: "ID do grupo"
                }
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/GrupoPutPatch"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/GrupoDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },

        delete: {
            tags: ["Grupos"],
            summary: "Deleta um grupo",
            description: `
            + Caso de uso: Exclusão de grupo do sistema.
            
            + Função de Negócio:
                - Permitir ao usuário autorizado remover ou inativar um grupo sem afetar integridade de dados.
                + Recebe como path parameter:
                    - **id**: identificador do grupo.

            + Regras de Negócio:
                - Verificar impedimentos por relacionamento (usuários vinculados) antes de excluir.  
                - Registrar log de auditoria sobre a operação.  
                - Garantir que não haja vínculos críticos pendentes.

            + Resultado Esperado:
                - HTTP 200 OK - grupo excluído com sucesso.
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
                    description: "ID do grupo"
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
    },
    "/grupos/{id}/rotas": {
        post: {
            tags: ["Grupos"],
            summary: "Adiciona permissão (rota) ao grupo",
            description: `
            + Caso de uso: Adicionar uma permissão específica a um grupo existente.
            
            + Função de Negócio:
                - Permitir ao usuário autorizado adicionar novas permissões a um grupo.
                + Recebe como path parameter:
                    - **id**: identificador do grupo (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **PermissaoSchema** com dados da permissão.

            + Regras de Negócio:
                - Grupo deve existir.
                - Rota deve existir no cadastro de rotas do sistema.
                - Não permite permissões duplicadas (mesma rota + dominio).
                - Comportamento idempotente (não adiciona se já existe).

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **GrupoDetalhes**, contendo grupo atualizado com a nova permissão.
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
                    description: "ID do grupo"
                }
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/PermissaoSchema"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/GrupoDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default gruposRoutes;