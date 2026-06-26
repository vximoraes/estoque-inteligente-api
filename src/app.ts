import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import dotenv from 'dotenv';
import setupMinio from './config/setupMinio.js';
import errorHandler from './utils/helpers/errorHandler.js';
import logger from './utils/logger.js';
import CommonResponse from './utils/helpers/CommonResponse.js';
import DbConnect from './config/DbConnect.js';
import getSwaggerOptions from './docs/config/head.js';
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

dotenv.config();

const app = express();

await DbConnect.conectar();
await setupMinio();
iniciarJobEmprestimosAtrasados();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.DEBUGLOG) {
  app.use(logRoutes);
}

app.get('/', (req, res) => res.redirect('/docs'));

const swaggerDocs = swaggerJsDoc(getSwaggerOptions());
app.use(swaggerUI.serve);
app.get('/docs', (req, res, next) => swaggerUI.setup(swaggerDocs)(req, res, next));

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
