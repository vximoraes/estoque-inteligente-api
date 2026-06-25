import express from 'express';
import AuthMiddleware from '../../middlewares/AuthMiddleware.js';
import AuthPermission from '../../middlewares/AuthPermission.js';
import NotificacaoController from './NotificacaoController.js';
import { asyncWrapper } from '../../utils/helpers/index.js';
import SSEService from '../../utils/services/SSEService.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

const router = express.Router();

const notificacaoController = new NotificacaoController();

router.get('/notificacoes/stream', AuthMiddleware, (req, res) => {
  const authReq = req as AuthenticatedRequest;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.socket?.setNoDelay(true);
  res.flushHeaders();

  res.write(
    `event: connected\ndata: ${JSON.stringify({ message: 'Conectado ao stream de notificações' })}\n\n`,
  );

  SSEService.addClient(authReq.user_id, res);

  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

router
  .get(
    '/notificacoes',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(notificacaoController.listar.bind(notificacaoController)),
  )
  .get(
    '/notificacoes/:id',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(notificacaoController.buscarPorId.bind(notificacaoController)),
  )
  .post(
    '/notificacoes',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(notificacaoController.criar.bind(notificacaoController)),
  )
  .patch(
    '/notificacoes/visualizar-todas',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(
      notificacaoController.marcarTodasComoVisualizadas.bind(notificacaoController),
    ),
  )
  .patch(
    '/notificacoes/:id/visualizar',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(
      notificacaoController.marcarComoVisualizada.bind(notificacaoController),
    ),
  )
  .patch(
    '/notificacoes/:id/inativar',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(notificacaoController.inativar.bind(notificacaoController)),
  )
  .put(
    '/notificacoes/:id/visualizar',
    AuthMiddleware,
    AuthPermission,
    asyncWrapper(
      notificacaoController.marcarComoVisualizada.bind(notificacaoController),
    ),
  );

export default router;
