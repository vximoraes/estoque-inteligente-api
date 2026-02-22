import authSchemas from "../schemas/authSchema.js";
import usuariosSchemas from "../schemas/usuariosSchema.js";
import categoriasSchemas from "../schemas/categoriaSchema.js";
import itemsSchemas from "../schemas/itemSchema.js";
import fornecedoresSchemas from "../schemas/fornecedorSchema.js";
import localizacoesSchemas from "../schemas/localizacaoSchema.js";
import estoquesSchemas from "../schemas/estoqueSchema.js";
import movimentacoesSchemas from "../schemas/movimentacaoSchema.js";
import notificacoesSchemas from "../schemas/notificacaoSchema.js";
import orcamentosSchemas from "../schemas/orcamentoSchema.js";
import gruposSchemas from "../schemas/grupoSchema.js";
import rotasSchemas from "../schemas/rotaSchema.js";
import usuariosPaths from "../paths/usuarios.js";
import authPaths from "../paths/auth.js";
import categoriasPaths from "../paths/categoria.js";
import itemsPaths from "../paths/item.js";
import fornecedoresPaths from "../paths/fornecedor.js";
import localizacoesPaths from "../paths/localizacao.js";
import estoquesPaths from "../paths/estoque.js";
import movimentacoesPaths from "../paths/movimentacao.js";
import notificacoesPaths from "../paths/notificacao.js";
import orcamentosPaths from "../paths/orcamento.js";
import gruposPaths from "../paths/grupo.js";
import rotasPaths from "../paths/rota.js";

// Função para definir as URLs do servidor dependendo do ambiente
const getServersInCorrectOrder = () => {
    const PORT = process.env.PORT
    const devUrl = { url: process.env.SWAGGER_DEV_URL || `http://localhost:${PORT}` };

    if (process.env.NODE_ENV === "production") return [devUrl];
    else return [devUrl];
};

// Função para obter as opções do Swagger
const getSwaggerOptions = () => {
    return {
        swaggerDefinition: {
            openapi: "3.0.0",
            info: {
                title: "API Estoque Inteligente",
                version: "1.0.0",
                description: "API para gestão de estoque inteligente \n\nÉ necessário autenticar com token JWT antes de utilizar a maioria das rotas. Faça isso na rota /login com um email e senha válido. Esta API conta com refresh token, que pode ser obtido na rota /refresh, e com logout, que pode ser feito na rota /logout. Para revogação de acesso use a rota /revoke. Para mais informações, acesse a documentação.",
                contact: {
                    name: "Equipe de Desenvolvimento",
                    email: "dev@estoque-inteligente.com",
                },
            },
            servers: getServersInCorrectOrder(),
            tags: [
                {
                    name: "Auth",
                    description: "Rotas para autenticação e autorização"
                },
                {
                    name: "Usuários",
                    description: "Rotas para gestão de usuários"
                },
                {
                    name: "Items",
                    description: "Rotas para gestão de itens do estoque"
                },
                {
                    name: "Categorias",
                    description: "Rotas para gestão de categorias"
                },
                {
                    name: "Fornecedores",
                    description: "Rotas para gestão de fornecedores"
                },
                {
                    name: "Localização",
                    description: "Rotas para gestão de localização"
                },
                {
                    name: "Estoque",
                    description: "Rotas para gestão de estoque"
                },
                {
                    name: "Movimentação",
                    description: "Rotas para gestão de movimentações"
                },
                {
                    name: "Orçamentos",
                    description: "Rotas para gestão de orçamentos"
                },
                {
                    name: "Notificações",
                    description: "Rotas para gestão de notificações"
                },
                {
                    name: "Grupos",
                    description: "Rotas para gestão de grupos e permissões"
                },
                {
                    name: "Rotas",
                    description: "Rotas para gestão de rotas de acesso do sistema"
                }
            ],
            paths: {
                ...authPaths,
                ...usuariosPaths,
                ...categoriasPaths,
                ...itemsPaths,
                ...fornecedoresPaths,
                ...localizacoesPaths,
                ...estoquesPaths,
                ...movimentacoesPaths,
                ...notificacoesPaths,
                ...orcamentosPaths,
                ...gruposPaths,
                ...rotasPaths,
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT"
                    }
                },
                schemas: {
                    ...authSchemas,
                    ...usuariosSchemas,
                    ...categoriasSchemas,
                    ...itemsSchemas,
                    ...fornecedoresSchemas,
                    ...localizacoesSchemas,
                    ...estoquesSchemas,
                    ...movimentacoesSchemas,
                    ...notificacoesSchemas,
                    ...orcamentosSchemas,
                    ...gruposSchemas,
                    ...rotasSchemas,
                }
            },
            security: [{
                bearerAuth: []
            }]
        },
        apis: ["./src/routes/*.js"]
    };
};

export default getSwaggerOptions;