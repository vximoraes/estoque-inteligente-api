import express from 'express';
import AuthMiddleware from '../../middlewares/authMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import MovimentacaoController from './MovimentacaoController.js';
import { asyncWrapper } from '../../utils/helpers/index.js';

const router = express.Router();

const movimentacaoController = new MovimentacaoController();

router
  .get(
    '/movimentacoes/resumo',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(movimentacaoController.resumo.bind(movimentacaoController)),
  )
  .get(
    '/movimentacoes/tendencia',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(movimentacaoController.tendencia.bind(movimentacaoController)),
  )
  .get(
    '/movimentacoes',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(movimentacaoController.listar.bind(movimentacaoController)),
  )
  .get(
    '/movimentacoes/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(movimentacaoController.listar.bind(movimentacaoController)),
  )
  .post(
    '/movimentacoes',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(movimentacaoController.criar.bind(movimentacaoController)),
  );

export default router;
