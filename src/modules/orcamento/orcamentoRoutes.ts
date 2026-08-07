import express from 'express';
import AuthMiddleware from '../../middlewares/AuthMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import OrcamentoController from './OrcamentoController.js';
import { asyncWrapper } from '../../utils/helpers/index.js';

const router = express.Router();

const orcamentoController = new OrcamentoController();

router
  .get(
    '/orcamentos',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.listar.bind(orcamentoController)),
  )
  .get(
    '/orcamentos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.listar.bind(orcamentoController)),
  )
  .post(
    '/orcamentos',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.criar.bind(orcamentoController)),
  )
  .patch(
    '/orcamentos/:id/inativar',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.inativar.bind(orcamentoController)),
  )
  .patch(
    '/orcamentos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.atualizar.bind(orcamentoController)),
  )
  .post(
    '/orcamentos/:orcamentoId/itens',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.adicionarItem.bind(orcamentoController)),
  )
  .patch(
    '/orcamentos/:orcamentoId/itens/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.atualizarItem.bind(orcamentoController)),
  )
  .delete(
    '/orcamentos/:orcamentoId/itens/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(orcamentoController.removerItem.bind(orcamentoController)),
  );

export default router;
