import express from 'express';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';
import AuthPermission from '../middlewares/AuthPermission.js';
import EmprestimoController from '../controllers/EmprestimoController.js';
import { asyncWrapper } from '../utils/helpers/index.js';

const router = express.Router();

const emprestimoController = new EmprestimoController();

router
  .get(
    '/emprestimos',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(emprestimoController.listar.bind(emprestimoController)),
  )
  .get(
    '/emprestimos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(emprestimoController.listar.bind(emprestimoController)),
  )
  .post(
    '/emprestimos',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(emprestimoController.criar.bind(emprestimoController)),
  )
  .patch(
    '/emprestimos/:id/devolver',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(emprestimoController.devolver.bind(emprestimoController)),
  );

export default router;
