export default {
    "/estoques": {
        get: {
            summary: "Listar todos os estoques",
            description: `
            **Funcionalidade:**
            - Permitir ao usuário autenticado listar todos os seus estoques com paginação e filtros.
            
            **Regras de negócio:**
            - Apenas estoques do usuário autenticado são retornados.
            - Suporte a filtros por componente, localização e quantidade.
            - Resultados paginados com limite máximo de 100 itens por página.
            - Ordenação padrão por data de criação (mais recentes primeiro).
            
            **Filtros disponíveis:**
            - componente: ObjectId do componente
            - localizacao: ObjectId da localização  
            - quantidade: Quantidade específica em estoque
            - page: Página atual (padrão: 1)
            - limite: Limite de itens por página (máximo: 100, padrão: 10)
            
            **Casos de uso:** Visualização geral do estoque, busca por filtros específicos.
            `,
            tags: ["Estoque"],
            security: [{ "Bearer": [] }],
            parameters: [
                {
                    name: "componente",
                    in: "query",
                    schema: { type: "string", format: "objectid" },
                    description: "Filtrar por ID do componente"
                },
                {
                    name: "localizacao", 
                    in: "query",
                    schema: { type: "string", format: "objectid" },
                    description: "Filtrar por ID da localização"
                },
                {
                    name: "quantidade",
                    in: "query", 
                    schema: { type: "string" },
                    description: "Filtrar por quantidade específica"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "string" },
                    description: "Número da página (padrão: 1)"
                },
                {
                    name: "limite",
                    in: "query", 
                    schema: { type: "string" },
                    description: "Limite de itens por página (máximo: 100, padrão: 10)"
                }
            ],
            responses: {
                200: {
                    description: "Lista de estoques retornada com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: {
                                        type: "object",
                                        properties: {
                                            docs: {
                                                type: "array",
                                                items: { $ref: "#/components/schemas/EstoqueCompleto" }
                                            },
                                            totalDocs: { type: "number" },
                                            limit: { type: "number" },
                                            totalPages: { type: "number" },
                                            page: { type: "number" },
                                            pagingCounter: { type: "number" },
                                            hasPrevPage: { type: "boolean" },
                                            hasNextPage: { type: "boolean" },
                                            prevPage: { type: "number", nullable: true },
                                            nextPage: { type: "number", nullable: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalServerError" }
            }
        }
    },
    "/estoques/componente/{componenteId}": {
        get: {
            summary: "Listar estoques de um componente específico",
            description: `
            **Funcionalidade:**
            - Permitir ao usuário autenticado listar todos os estoques que contêm um componente específico.
            
            **Regras de negócio:**
            - Apenas estoques do usuário autenticado são retornados.
            - Filtrados automaticamente pelo componenteId fornecido na URL.
            - Suporte a filtros adicionais por localização e quantidade.
            - Resultados paginados com limite máximo de 100 itens por página.
            - Ordenação padrão por data de criação (mais recentes primeiro).
            
            **Filtros adicionais disponíveis:**
            - localizacao: ObjectId da localização
            - quantidade: Quantidade específica em estoque
            - page: Página atual (padrão: 1)
            - limite: Limite de itens por página (máximo: 100, padrão: 10)
            
            **Casos de uso:** Verificar em quais localizações um componente específico está armazenado e suas quantidades.
            `,
            tags: ["Estoque"],
            security: [{ "Bearer": [] }],
            parameters: [
                {
                    name: "componenteId",
                    in: "path",
                    required: true,
                    schema: { type: "string", format: "objectid" },
                    description: "ID do componente para buscar estoques"
                },
                {
                    name: "localizacao",
                    in: "query",
                    schema: { type: "string", format: "objectid" },
                    description: "Filtrar por ID da localização"
                },
                {
                    name: "quantidade",
                    in: "query",
                    schema: { type: "string" },
                    description: "Filtrar por quantidade específica"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "string" },
                    description: "Número da página (padrão: 1)"
                },
                {
                    name: "limite",
                    in: "query",
                    schema: { type: "string" },
                    description: "Limite de itens por página (máximo: 100, padrão: 10)"
                }
            ],
            responses: {
                200: {
                    description: "Estoques do componente retornados com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: {
                                        type: "object",
                                        properties: {
                                            docs: {
                                                type: "array",
                                                items: { $ref: "#/components/schemas/EstoqueCompleto" }
                                            },
                                            totalDocs: { type: "number" },
                                            limit: { type: "number" },
                                            totalPages: { type: "number" },
                                            page: { type: "number" },
                                            pagingCounter: { type: "number" },
                                            hasPrevPage: { type: "boolean" },
                                            hasNextPage: { type: "boolean" },
                                            prevPage: { type: "number", nullable: true },
                                            nextPage: { type: "number", nullable: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalServerError" }
            }
        }
    },
    "/estoques/{id}": {
        get: {
            summary: "Buscar estoque por ID",
            description: `
            **Funcionalidade:**
            - Permitir ao usuário autenticado buscar um estoque específico pelo seu ID.
            
            **Regras de negócio:**
            - Apenas estoques do usuário autenticado podem ser acessados.
            - Retorna erro 404 se o estoque não for encontrado ou não pertencer ao usuário.
            - Inclui dados completos do componente e localização (populate).
            
            **Casos de uso:** Visualizar detalhes específicos de um estoque, verificar dados para edição.
            `,
            tags: ["Estoque"],
            security: [{ "Bearer": [] }],
            parameters: [
                {
                    name: "id",
                    in: "path", 
                    required: true,
                    schema: { type: "string", format: "objectid" },
                    description: "ID do estoque a ser buscado"
                }
            ],
            responses: {
                200: {
                    description: "Estoque encontrado com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: { $ref: "#/components/schemas/EstoqueCompleto" }
                                }
                            }
                        }
                    }
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalServerError" }
            }
        }
    }
};