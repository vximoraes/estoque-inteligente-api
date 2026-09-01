import express from 'express';
import AuthMiddleware from '../../middlewares/authMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import EstoqueController from './EstoqueController.js';
import { asyncWrapper } from '../../utils/helpers/index.js';

const router = express.Router();

const estoqueController = new EstoqueController();

router
  .get(
    '/estoques',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(estoqueController.listar.bind(estoqueController)),
  )
  .get(
    '/estoques/item/:itemId',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(estoqueController.listarPorItem.bind(estoqueController)),
  )
  .get(
    '/estoques/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(estoqueController.buscarPorId.bind(estoqueController)),
  );

export default router;
