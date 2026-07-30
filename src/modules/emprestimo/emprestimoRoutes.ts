import express from 'express';
import AuthMiddleware from '../../middlewares/AuthMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import EmprestimoController from './EmprestimoController.js';
import { asyncWrapper } from '../../utils/helpers/index.js';

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
  )
  .patch(
    '/emprestimos/:id/desfazer-devolucao',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(
      emprestimoController.desfazerDevolucao.bind(emprestimoController),
    ),
  )
  .put(
    '/emprestimos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(emprestimoController.atualizar.bind(emprestimoController)),
  )
  .delete(
    '/emprestimos/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(emprestimoController.excluir.bind(emprestimoController)),
  );

export default router;
