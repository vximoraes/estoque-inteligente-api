import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { apiReference } from '@scalar/express-api-reference';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import setupMinio from './config/setupMinio.js';
import errorHandler from './utils/helpers/errorHandler.js';
import logger from './utils/logger.js';
import CommonResponse from './utils/helpers/CommonResponse.js';
import DbConnect from './config/DbConnect.js';
import { initAuth } from './config/auth.js';
import { generateSpec } from './utils/openapi/registry.js';
import logRoutes from './middlewares/LogRoutesMiddleware.js';
import { iniciarJobEmprestimosAtrasados } from './modules/emprestimo/EmprestimoAtrasadoJob.js';
import mcpRoutes from './libs/mcp/mcpRoutes.js';
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
import './modules/ia/iaDocs.js';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

// Factory async em vez de top-level await: top-level await quebra o import do módulo sob Jest/Babel (CJS).
export async function bootstrap(): Promise<express.Express> {
  await DbConnect.conectar();
  const auth = initAuth();
  await setupMinio();
  iniciarJobEmprestimosAtrasados();

  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
  app.get('/', (req, res) => res.redirect('/docs'));
  app.get('/openapi.json', (req, res) => res.json(generateSpec()));
  app.use('/docs', apiReference({ url: '/openapi.json' }));

  app.use(helmet());
  app.use(
    cors({
      origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
      credentials: true,
    }),
  );
  app.use(compression());

  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (process.env.DEBUGLOG) {
    app.use(logRoutes);
  }

  app.use(mcpRoutes);

  app.use(
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
    logger.error({ promise, reason }, 'Unhandled Rejection at:');
  });

  process.on('uncaughtException', (error) => {
    logger.error(error, 'Uncaught Exception thrown:');
  });

  app.use(errorHandler);

  return app;
}
