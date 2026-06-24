import express from 'express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import getSwaggerOptions from '../docs/config/head.js';
import logRoutes from '../middlewares/LogRoutesMiddleware.js';
import auth from '../modules/auth/authRoutes.js';
import usuarios from '../modules/usuario/usuarioRoutes.js';
import categorias from '../modules/categoria/categoriaRoutes.js';
import localizacoes from '../modules/localizacao/localizacaoRoutes.js';
import itens from '../modules/item/itemRoutes.js';
import estoques from '../modules/estoque/estoqueRoutes.js';
import fornecedores from '../modules/fornecedor/fornecedorRoutes.js';
import movimentacoes from '../modules/movimentacao/movimentacaoRoutes.js';
import notificacoes from '../modules/notificacao/notificacaoRoutes.js';
import orcamentos from '../modules/orcamento/orcamentoRoutes.js';
import emprestimos from '../modules/emprestimo/emprestimoRoutes.js';
import grupos from '../modules/grupo/grupoRoutes.js';
import rotas from '../modules/rota/rotaRoutes.js';
import mcpRoutes from './mcpRoutes.js';
import iaRoutes from '../modules/ia/iaRoutes.js';

import dotenv from 'dotenv';

dotenv.config();

const routes = (app) => {
  if (process.env.DEBUGLOG) {
    app.use(logRoutes);
  }

  app.get('/', (req, res) => {
    res.redirect('/docs');
  });

  const swaggerDocs = swaggerJsDoc(getSwaggerOptions());
  app.use(swaggerUI.serve);
  app.get('/docs', (req, res, next) => {
    swaggerUI.setup(swaggerDocs)(req, res, next);
  });

  app.use(mcpRoutes);

  app.use(
    express.json(),
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
    res.status(404).json({ message: 'Rota não encontrada' });
  });
};

export default routes;
