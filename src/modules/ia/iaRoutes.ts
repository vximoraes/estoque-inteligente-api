import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import AuthMiddleware from '../../middlewares/AuthMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import { asyncWrapper } from '../../utils/helpers/index.js';
import IAController from './IAController.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

const router = express.Router();

function porUsuario(req: express.Request): string {
  const authReq = req as AuthenticatedRequest;
  return authReq.user_id ?? ipKeyGenerator(req.ip ?? 'unknown');
}

const iaMensagemRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: porUsuario,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    code: 429,
    message:
      'Limite de mensagens atingido. Aguarde 1 minuto e tente novamente.',
    data: null,
    errors: [],
  },
});

const iaConversasRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: porUsuario,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    code: 429,
    message:
      'Limite de requisições atingido. Aguarde 1 minuto e tente novamente.',
    data: null,
    errors: [],
  },
});

router
  .post(
    '/ia/conversas',
    AuthMiddleware,
    AuthPermission,
    iaConversasRateLimiter,
    asyncWrapper(IAController.criarConversa.bind(IAController)),
  )
  .get(
    '/ia/conversas',
    AuthMiddleware,
    AuthPermission,
    iaConversasRateLimiter,
    asyncWrapper(IAController.listarConversas.bind(IAController)),
  )
  .get(
    '/ia/conversas/:id',
    AuthMiddleware,
    AuthPermission,
    iaConversasRateLimiter,
    asyncWrapper(IAController.obterConversa.bind(IAController)),
  )
  .delete(
    '/ia/conversas/:id',
    AuthMiddleware,
    AuthPermission,
    iaConversasRateLimiter,
    asyncWrapper(IAController.deletarConversa.bind(IAController)),
  )
  .post(
    '/ia/conversas/:id/mensagens',
    AuthMiddleware,
    AuthPermission,
    iaMensagemRateLimiter,
    asyncWrapper(IAController.enviarMensagem.bind(IAController)),
  );

export default router;
