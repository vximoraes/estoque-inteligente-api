import express from 'express';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import IAController from '../controllers/IAController.js';

const router = express.Router();

router
  .post('/ia/conversas', AuthMiddleware, asyncWrapper(IAController.criarConversa.bind(IAController)))
  .get('/ia/conversas', AuthMiddleware, asyncWrapper(IAController.listarConversas.bind(IAController)))
  .get(
    '/ia/conversas/:id',
    AuthMiddleware,
    asyncWrapper(IAController.obterConversa.bind(IAController)),
  )
  .delete(
    '/ia/conversas/:id',
    AuthMiddleware,
    asyncWrapper(IAController.deletarConversa.bind(IAController)),
  )
  .post(
    '/ia/conversas/:id/mensagens',
    AuthMiddleware,
    IAController.enviarMensagem.bind(IAController),
  );

export default router;
