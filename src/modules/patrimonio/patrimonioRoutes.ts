import express from 'express';
import AuthMiddleware from '../../middlewares/AuthMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import PatrimonioController from './PatrimonioController.js';
import { asyncWrapper } from '../../utils/helpers/index.js';

const router = express.Router();

const patrimonioController = new PatrimonioController();

router
  .get(
    '/patrimonios',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(patrimonioController.listar.bind(patrimonioController)),
  )
  .get(
    '/patrimonios/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(patrimonioController.listar.bind(patrimonioController)),
  )
  .get(
    '/patrimonios/:id/eventos',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(patrimonioController.buscarEventos.bind(patrimonioController)),
  )
  .post(
    '/patrimonios',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(patrimonioController.criar.bind(patrimonioController)),
  )
  .post(
    '/patrimonios/lote',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(patrimonioController.criarLote.bind(patrimonioController)),
  )
  .patch(
    '/patrimonios/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(patrimonioController.atualizar.bind(patrimonioController)),
  )
  .patch(
    '/patrimonios/:id/status',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(
      patrimonioController.atualizarStatus.bind(patrimonioController),
    ),
  )
  .patch(
    '/patrimonios/:id/localizacao',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(
      patrimonioController.atualizarLocalizacao.bind(patrimonioController),
    ),
  )
  .patch(
    '/patrimonios/:id/inativar',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(patrimonioController.inativar.bind(patrimonioController)),
  );

export default router;
