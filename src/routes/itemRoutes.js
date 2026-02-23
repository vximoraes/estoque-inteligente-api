import express from 'express';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';
import AuthPermission from '../middlewares/AuthPermission.js';
import ItemController from '../controllers/ItemController.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import upload from '../config/MulterConfig.js';

const router = express.Router();

const itemController = new ItemController();

router
  .get(
    '/itens',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(itemController.listar.bind(itemController)),
  )
  .get(
    '/itens/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(itemController.listar.bind(itemController)),
  )
  .post(
    '/itens',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(itemController.criar.bind(itemController)),
  )
  .patch(
    '/itens/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(itemController.atualizar.bind(itemController)),
  )
  .patch(
    '/itens/:id/inativar',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(itemController.inativar.bind(itemController)),
  )
  .put(
    '/itens/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(itemController.atualizar.bind(itemController)),
  )
  .post(
    '/itens/:id/foto',
    AuthMiddleware,
    AuthPermission,
    upload.single('file'),
    asyncWrapper(itemController.uploadFoto.bind(itemController)),
  )
  .delete(
    '/itens/:id/foto',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(itemController.deletarFoto.bind(itemController)),
  );

export default router;
