const rotasSchemas = {
    RotaPost: {
        type: "object",
        required: ["rota", "dominio"],
        properties: {
            rota: {
                type: "string",
                minLength: 1,
                maxLength: 200,
                description: "Nome/caminho da rota",
                example: "/usuarios"
            },
            dominio: {
                type: "string",
                maxLength: 200,
                description: "Domínio da aplicação",
                example: "http://localhost:3000"
            },
            descricao: {
                type: "string",
                maxLength: 500,
                description: "Descrição da rota",
                example: "Rota para gerenciamento de usuários"
            },
            ativo: {
                type: "boolean",
                default: true,
                description: "Status da rota",
                example: true
            }
        },
        additionalProperties: false
    },

    RotaPutPatch: {
        type: "object",
        properties: {
            rota: {
                type: "string",
                minLength: 1,
                maxLength: 200,
                description: "Nome/caminho da rota",
                example: "/usuarios"
            },
            dominio: {
                type: "string",
                maxLength: 200,
                description: "Domínio da aplicação",
                example: "http://localhost:3000"
            },
            descricao: {
                type: "string",
                maxLength: 500,
                description: "Descrição da rota",
                example: "Rota para gerenciamento de usuários"
            },
            ativo: {
                type: "boolean",
                description: "Status da rota",
                example: true
            }
        },
        additionalProperties: false
    },

    RotaDetalhes: {
        type: "object",
        properties: {
            _id: {
                type: "string",
                description: "ID único da rota",
                example: "507f1f77bcf86cd799439011"
            },
            rota: {
                type: "string",
                description: "Nome/caminho da rota",
                example: "/usuarios"
            },
            dominio: {
                type: "string",
                description: "Domínio da aplicação",
                example: "http://localhost:3000"
            },
            descricao: {
                type: "string",
                description: "Descrição da rota",
                example: "Rota para gerenciamento de usuários"
            },
            ativo: {
                type: "boolean",
                description: "Status da rota",
                example: true
            },
            data_criacao: {
                type: "string",
                format: "date-time",
                description: "Data de criação da rota",
                example: "2024-01-15T10:30:00Z"
            },
            data_atualizacao: {
                type: "string",
                format: "date-time",
                description: "Data de última atualização da rota",
                example: "2024-01-15T10:30:00Z"
            }
        }
    },

    RotaListagem: {
        type: "object",
        properties: {
            data: {
                type: "object",
                properties: {
                    docs: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/RotaDetalhes"
                        }
                    },
                    totalDocs: {
                        type: "integer",
                        example: 50
                    },
                    limit: {
                        type: "integer",
                        example: 10
                    },
                    totalPages: {
                        type: "integer",
                        example: 5
                    },
                    page: {
                        type: "integer",
                        example: 1
                    },
                    pagingCounter: {
                        type: "integer",
                        example: 1
                    },
                    hasPrevPage: {
                        type: "boolean",
                        example: false
                    },
                    hasNextPage: {
                        type: "boolean",
                        example: true
                    },
                    prevPage: {
                        type: "integer",
                        nullable: true,
                        example: null
                    },
                    nextPage: {
                        type: "integer",
                        nullable: true,
                        example: 2
                    }
                }
            },
            message: {
                type: "string",
                example: "Rotas listadas com sucesso"
            },
            errors: {
                type: "array",
                example: []
            }
        }
    },

    RotaFiltro: {
        type: "object",
        properties: {
            rota: {
                type: "string",
                description: "Filtrar por nome da rota",
                example: "/usuarios"
            },
            dominio: {
                type: "string",
                description: "Filtrar por domínio",
                example: "localhost"
            },
            ativo: {
                type: "boolean",
                description: "Filtrar por status ativo/inativo",
                example: true
            },
            page: {
                type: "integer",
                minimum: 1,
                default: 1,
                description: "Número da página",
                example: 1
            },
            limite: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 10,
                description: "Limite de itens por página",
                example: 10
            }
        }
    }
};

export default rotasSchemas;