import express from 'express';
import rateLimit from 'express-rate-limit';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import IAController from '../controllers/IAController.js';

const router = express.Router();

const iaMensagemRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.user_id ?? req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    code: 429,
    message: 'Limite de mensagens atingido. Aguarde 1 minuto e tente novamente.',
    data: null,
    errors: [],
  },
});

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
    iaMensagemRateLimiter,
    IAController.enviarMensagem.bind(IAController),
  );

export default router;
