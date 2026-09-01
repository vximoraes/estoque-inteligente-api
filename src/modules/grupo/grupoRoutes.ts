import express from 'express';
import AuthMiddleware from '../../middlewares/authMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import GrupoController from './GrupoController.js';
import { asyncWrapper } from '../../utils/helpers/index.js';

const router = express.Router();

const grupoController = new GrupoController();

router
  .get(
    '/grupos',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(grupoController.listar.bind(grupoController)),
  )
  .get(
    '/grupos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(grupoController.listar.bind(grupoController)),
  )
  .post(
    '/grupos',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(grupoController.criar.bind(grupoController)),
  )
  .post(
    '/grupos/:id/rotas',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(grupoController.adicionarRota.bind(grupoController)),
  )
  .patch(
    '/grupos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(grupoController.atualizar.bind(grupoController)),
  )
  .put(
    '/grupos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(grupoController.atualizar.bind(grupoController)),
  )
  .delete(
    '/grupos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(grupoController.deletar.bind(grupoController)),
  );

export default router;
