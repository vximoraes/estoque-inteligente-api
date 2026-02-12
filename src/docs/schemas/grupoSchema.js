const gruposSchemas = {
    GrupoPost: {
        type: "object",
        required: ["nome"],
        properties: {
            nome: {
                type: "string",
                minLength: 3,
                maxLength: 100,
                description: "Nome do grupo",
                example: "Administradores"
            },
            descricao: {
                type: "string",
                maxLength: 500,
                description: "Descrição do grupo",
                example: "Grupo com permissões administrativas"
            },
            ativo: {
                type: "boolean",
                default: true,
                description: "Status do grupo",
                example: true
            },
            permissoes: {
                type: "array",
                items: {
                    $ref: "#/components/schemas/PermissaoSchema"
                },
                description: "Lista de permissões do grupo",
                default: []
            }
        },
        additionalProperties: false
    },

    GrupoPutPatch: {
        type: "object",
        properties: {
            nome: {
                type: "string",
                minLength: 3,
                maxLength: 100,
                description: "Nome do grupo",
                example: "Administradores"
            },
            descricao: {
                type: "string",
                maxLength: 500,
                description: "Descrição do grupo",
                example: "Grupo com permissões administrativas"
            },
            ativo: {
                type: "boolean",
                description: "Status do grupo",
                example: true
            },
            permissoes: {
                type: "array",
                items: {
                    $ref: "#/components/schemas/PermissaoSchema"
                },
                description: "Lista de permissões do grupo"
            }
        },
        additionalProperties: false
    },

    GrupoDetalhes: {
        type: "object",
        properties: {
            _id: {
                type: "string",
                description: "ID único do grupo",
                example: "507f1f77bcf86cd799439011"
            },
            nome: {
                type: "string",
                description: "Nome do grupo",
                example: "Administradores"
            },
            descricao: {
                type: "string",
                description: "Descrição do grupo",
                example: "Grupo com permissões administrativas"
            },
            ativo: {
                type: "boolean",
                description: "Status do grupo",
                example: true
            },
            permissoes: {
                type: "array",
                items: {
                    $ref: "#/components/schemas/PermissaoSchema"
                },
                description: "Lista de permissões do grupo"
            },
            data_criacao: {
                type: "string",
                format: "date-time",
                description: "Data de criação do grupo",
                example: "2024-01-15T10:30:00Z"
            },
            data_atualizacao: {
                type: "string",
                format: "date-time",
                description: "Data de última atualização do grupo",
                example: "2024-01-15T10:30:00Z"
            }
        }
    },

    GrupoListagem: {
        type: "object",
        properties: {
            data: {
                type: "object",
                properties: {
                    docs: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/GrupoDetalhes"
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
                example: "Grupos listados com sucesso"
            },
            errors: {
                type: "array",
                example: []
            }
        }
    },

    GrupoFiltro: {
        type: "object",
        properties: {
            nome: {
                type: "string",
                description: "Filtrar por nome do grupo",
                example: "Admin"
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
    },

    PermissaoSchema: {
        type: "object",
        required: ["rota", "dominio"],
        properties: {
            rota: {
                type: "string",
                description: "Nome da rota",
                example: "/usuarios"
            },
            dominio: {
                type: "string",
                description: "Domínio da aplicação",
                example: "http://localhost:3000"
            },
            ativo: {
                type: "boolean",
                default: true,
                description: "Status da permissão",
                example: true
            },
            buscar: {
                type: "boolean",
                default: false,
                description: "Permissão para buscar/listar",
                example: true
            },
            enviar: {
                type: "boolean",
                default: false,
                description: "Permissão para criar",
                example: false
            },
            substituir: {
                type: "boolean",
                default: false,
                description: "Permissão para substituir (PUT)",
                example: false
            },
            modificar: {
                type: "boolean",
                default: false,
                description: "Permissão para modificar (PATCH)",
                example: false
            },
            excluir: {
                type: "boolean",
                default: false,
                description: "Permissão para excluir",
                example: false
            }
        },
        additionalProperties: false
    }
};

export default gruposSchemas;