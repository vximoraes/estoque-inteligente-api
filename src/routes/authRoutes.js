import express from 'express';
import rateLimit from 'express-rate-limit';
import AuthController from '../controllers/AuthController.js';
import UsuarioController from '../controllers/UsuarioController.js';
import { asyncWrapper } from '../utils/helpers/index.js';

const router = express.Router();

const authController = new AuthController();
const usuarioController = new UsuarioController();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    code: 429,
    message: 'Muitas tentativas. Tente novamente em 15 minutos.',
    data: null,
    errors: [],
  },
});

router
  .post('/login', loginRateLimiter, asyncWrapper(authController.login.bind(authController)))
  .post(
    '/recover',
    loginRateLimiter,
    asyncWrapper(authController.recuperaSenha.bind(authController)),
  )
  .post(
    '/redefinir-senha',
    asyncWrapper(authController.atualizarSenhaToken.bind(authController)),
  )
  .post(
    '/ativar-conta',
    asyncWrapper(usuarioController.ativarConta.bind(usuarioController)),
  )
  .post('/logout', asyncWrapper(authController.logout.bind(authController)))
  .post('/revoke', asyncWrapper(authController.revoke.bind(authController)))
  .post('/refresh', asyncWrapper(authController.refresh.bind(authController)))
  .post('/introspect', asyncWrapper(authController.pass.bind(authController)));

export default router;
