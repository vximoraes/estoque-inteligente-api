import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { apiReference } from '@scalar/express-api-reference';
import dotenv from 'dotenv';
import setupMinio from './config/setupMinio.js';
import errorHandler from './utils/helpers/errorHandler.js';
import logger from './utils/logger.js';
import CommonResponse from './utils/helpers/CommonResponse.js';
import DbConnect from './config/DbConnect.js';
import { generateSpec } from './utils/openapi/registry.js';
import logRoutes from './middlewares/LogRoutesMiddleware.js';
import { iniciarJobEmprestimosAtrasados } from './modules/emprestimo/EmprestimoAtrasadoJob.js';
import mcpRoutes from './libs/mcp/mcpRoutes.js';
import auth from './modules/auth/authRoutes.js';
import usuarios from './modules/usuario/usuarioRoutes.js';
import categorias from './modules/categoria/categoriaRoutes.js';
import localizacoes from './modules/localizacao/localizacaoRoutes.js';
import itens from './modules/item/itemRoutes.js';
import estoques from './modules/estoque/estoqueRoutes.js';
import fornecedores from './modules/fornecedor/fornecedorRoutes.js';
import movimentacoes from './modules/movimentacao/movimentacaoRoutes.js';
import notificacoes from './modules/notificacao/notificacaoRoutes.js';
import orcamentos from './modules/orcamento/orcamentoRoutes.js';
import emprestimos from './modules/emprestimo/emprestimoRoutes.js';
import grupos from './modules/grupo/grupoRoutes.js';
import rotas from './modules/rota/rotaRoutes.js';
import iaRoutes from './modules/ia/iaRoutes.js';
import './modules/auth/authDocs.js';
import './modules/usuario/usuarioDocs.js';
import './modules/categoria/categoriaDocs.js';
import './modules/localizacao/localizacaoDocs.js';
import './modules/item/itemDocs.js';
import './modules/estoque/estoqueDocs.js';
import './modules/fornecedor/fornecedorDocs.js';
import './modules/movimentacao/movimentacaoDocs.js';
import './modules/notificacao/notificacaoDocs.js';
import './modules/orcamento/orcamentoDocs.js';
import './modules/emprestimo/emprestimoDocs.js';
import './modules/grupo/grupoDocs.js';
import './modules/rota/rotaDocs.js';

dotenv.config();

const app = express();

await DbConnect.conectar();
await setupMinio();
iniciarJobEmprestimosAtrasados();

app.get('/', (req, res) => res.redirect('/docs'));
app.get('/openapi.json', (req, res) => res.json(generateSpec()));
app.use('/docs', apiReference({ url: '/openapi.json' }));

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.DEBUGLOG) {
  app.use(logRoutes);
}

app.use(mcpRoutes);

app.use(
  auth,
  usuarios,
  categorias,
  localizacoes,
  itens,
  estoques,
  fornecedores,
  movimentacoes,
  notificacoes,
  orcamentos,
  emprestimos,
  grupos,
  rotas,
  iaRoutes,
);

app.use((req, res) => {
  return CommonResponse.error(res, 404, 'resourceNotFound', null, [
    { message: 'Rota não encontrada.' },
  ]);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
});

app.use(errorHandler);

export default app;
