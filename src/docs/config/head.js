import authSchemas from '../schemas/authSchema.js';
import usuariosSchemas from '../../modules/usuario/usuarioDocsSchema.js';
import categoriasSchemas from '../../modules/categoria/categoriaDocsSchema.js';
import itensSchemas from '../../modules/item/itemDocsSchema.js';
import fornecedoresSchemas from '../../modules/fornecedor/fornecedorDocsSchema.js';
import localizacoesSchemas from '../../modules/localizacao/localizacaoDocsSchema.js';
import estoquesSchemas from '../../modules/estoque/estoqueDocsSchema.js';
import movimentacoesSchemas from '../../modules/movimentacao/movimentacaoDocsSchema.js';
import notificacoesSchemas from '../../modules/notificacao/notificacaoDocsSchema.js';
import orcamentosSchemas from '../../modules/orcamento/orcamentoDocsSchema.js';
import emprestimosSchemas from '../../modules/emprestimo/emprestimoDocsSchema.js';
import gruposSchemas from '../../modules/grupo/grupoDocsSchema.js';
import rotasSchemas from '../../modules/rota/rotaDocsSchema.js';
import usuariosPaths from '../../modules/usuario/usuarioDocs.js';
import authPaths from '../paths/auth.js';
import categoriasPaths from '../../modules/categoria/categoriaDocs.js';
import itensPaths from '../../modules/item/itemDocs.js';
import fornecedoresPaths from '../../modules/fornecedor/fornecedorDocs.js';
import localizacoesPaths from '../../modules/localizacao/localizacaoDocs.js';
import estoquesPaths from '../../modules/estoque/estoqueDocs.js';
import movimentacoesPaths from '../../modules/movimentacao/movimentacaoDocs.js';
import notificacoesPaths from '../../modules/notificacao/notificacaoDocs.js';
import orcamentosPaths from '../../modules/orcamento/orcamentoDocs.js';
import emprestimosPaths from '../../modules/emprestimo/emprestimosDocs.js';
import gruposPaths from '../../modules/grupo/grupoDocs.js';
import rotasPaths from '../../modules/rota/rotaDocs.js';

// Função para definir as URLs do servidor dependendo do ambiente
const getServersInCorrectOrder = () => {
  const PORT = process.env.PORT;
  const devUrl = {
    url: process.env.SWAGGER_DEV_URL || `http://localhost:${PORT}`,
  };

  if (process.env.NODE_ENV === 'production') return [devUrl];
  else return [devUrl];
};

// Função para obter as opções do Swagger
const getSwaggerOptions = () => {
  return {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'API Estoque Inteligente',
        version: '1.0.0',
        description:
          'API para gestão de estoque inteligente \n\nÉ necessário autenticar com token JWT antes de utilizar a maioria das rotas. Faça isso na rota /login com um email e senha válido. Esta API conta com refresh token, que pode ser obtido na rota /refresh, e com logout, que pode ser feito na rota /logout. Para revogação de acesso use a rota /revoke. Para mais informações, acesse a documentação.',
        contact: {
          name: 'Equipe de Desenvolvimento',
          email: 'dev@estoque-inteligente.com',
        },
      },
      servers: getServersInCorrectOrder(),
      tags: [
        {
          name: 'Auth',
          description: 'Rotas para autenticação e autorização',
        },
        {
          name: 'Usuários',
          description: 'Rotas para gestão de usuários',
        },
        {
          name: 'Itens',
          description: 'Rotas para gestão de itens do estoque',
        },
        {
          name: 'Categorias',
          description: 'Rotas para gestão de categorias',
        },
        {
          name: 'Fornecedores',
          description: 'Rotas para gestão de fornecedores',
        },
        {
          name: 'Localização',
          description: 'Rotas para gestão de localização',
        },
        {
          name: 'Estoque',
          description: 'Rotas para gestão de estoque',
        },
        {
          name: 'Movimentação',
          description: 'Rotas para gestão de movimentações',
        },
        {
          name: 'Orçamentos',
          description: 'Rotas para gestão de orçamentos',
        },
        {
          name: 'Notificações',
          description: 'Rotas para gestão de notificações',
        },
        {
          name: 'Emprestimos',
          description: 'Rotas para gestão de emprestimos de itens',
        },
        {
          name: 'Grupos',
          description: 'Rotas para gestão de grupos e permissões',
        },
        {
          name: 'Rotas',
          description: 'Rotas para gestão de rotas de acesso do sistema',
        },
      ],
      paths: {
        ...authPaths,
        ...usuariosPaths,
        ...categoriasPaths,
        ...itensPaths,
        ...fornecedoresPaths,
        ...localizacoesPaths,
        ...estoquesPaths,
        ...movimentacoesPaths,
        ...notificacoesPaths,
        ...orcamentosPaths,
        ...emprestimosPaths,
        ...gruposPaths,
        ...rotasPaths,
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          ...authSchemas,
          ...usuariosSchemas,
          ...categoriasSchemas,
          ...itensSchemas,
          ...fornecedoresSchemas,
          ...localizacoesSchemas,
          ...estoquesSchemas,
          ...movimentacoesSchemas,
          ...notificacoesSchemas,
          ...orcamentosSchemas,
          ...emprestimosSchemas,
          ...gruposSchemas,
          ...rotasSchemas,
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ['./src/routes/*.js'],
  };
};

export default getSwaggerOptions;
