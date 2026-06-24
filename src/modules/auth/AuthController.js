import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import {
  CommonResponse,
  CustomError,
  HttpStatusCodes,
  messages,
} from '../../utils/helpers/index.js';
import { LoginSchema } from '../../utils/validators/schemas/zod/LoginSchema.js';
import { UsuarioUpdateSchema } from '../usuario/UsuarioSchema.js';
import { UsuarioIdSchema } from '../usuario/UsuarioQuerySchema.js';
import { RequestAuthorizationSchema } from '../../utils/validators/schemas/zod/querys/RequestAuthorizationSchema.js';
import { EmailSchema } from '../../utils/validators/schemas/zod/EmailSchema.js';

import AuthService from './AuthService.js';

class AuthController {
  constructor() {
    this.service = new AuthService();
  }

  login = async (req, res) => {
    const body = req.body || {};
    const validatedBody = LoginSchema.parse(body);
    const data = await this.service.login(validatedBody);
    return CommonResponse.success(res, data);
  };

  recuperaSenha = async (req, res) => {
    const validatedBody = EmailSchema.parse(req.body);
    const data = await this.service.recuperaSenha(validatedBody);
    return CommonResponse.success(res, data);
  };

  async atualizarSenhaToken(req, res, next) {
    const tokenRecuperacao = req.query.token || req.params.token || null;
    const senha = req.body.senha || null;

    if (!tokenRecuperacao) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: 'unauthorized',
        field: 'authentication',
        details: [],
        customMessage:
          'Token de recuperação na URL como parâmetro ou query é obrigatório para troca da senha.',
      });
    }

    const senhaSchema = UsuarioUpdateSchema.parse({ senha: senha });

    await this.service.atualizarSenhaToken(tokenRecuperacao, senhaSchema);

    return CommonResponse.success(
      res,
      null,
      HttpStatusCodes.OK.code,
      'Senha atualizada com sucesso.',
      { message: 'Senha atualizada com sucesso via token de recuperação.' },
    );
  }

  async atualizarSenhaCodigo(req, res, next) {
    const codigo_recupera_senha = req.body.codigo_recupera_senha || null;
    const senha = req.body.senha || null;

    if (!codigo_recupera_senha) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: 'unauthorized',
        field: 'authentication',
        details: [],
        customMessage:
          'Código de recuperação no body é obrigatório para troca da senha.',
      });
    }

    const senhaSchema = UsuarioUpdateSchema.parse({ senha });

    await this.service.atualizarSenhaCodigo(codigo_recupera_senha, senhaSchema);

    return CommonResponse.success(
      res,
      null,
      HttpStatusCodes.OK.code,
      'Senha atualizada com sucesso.',
      { message: 'Senha atualizada com sucesso via código de recuperação.' },
    );
  }

  revoke = async (req, res) => {
    const id = req.body.id;
    const data = await this.service.revoke(id);
    return CommonResponse.success(res, null, 200, data.message);
  };

  refresh = async (req, res) => {
    const token =
      (req.body && req.body.refresh_token) ||
      req.headers.authorization?.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'invalidRefresh',
        field: 'Refresh',
        details: [],
        customMessage: 'Refresh token não informado.',
      });
    }

    let decoded;

    try {
      decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET_REFRESH_TOKEN,
      );
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new CustomError({
          statusCode: HttpStatusCodes.UNAUTHORIZED.code,
          errorType: 'tokenExpired',
          field: 'Refresh',
          details: [],
          customMessage: 'Refresh token expirado.',
        });
      }
      if (err.name === 'JsonWebTokenError') {
        throw new CustomError({
          statusCode: HttpStatusCodes.UNAUTHORIZED.code,
          errorType: 'invalidToken',
          field: 'Refresh',
          details: [],
          customMessage: 'Refresh token inválido.',
        });
      }
      throw err;
    }

    const data = await this.service.refresh(decoded.id, token);
    return CommonResponse.success(res, data);
  };

  logout = async (req, res) => {
    const token =
      (req.body && req.body.access_token) ||
      req.headers.authorization?.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'invalidLogout',
        field: 'Logout',
        details: [],
        customMessage: HttpStatusCodes.BAD_REQUEST.message,
      });
    }

    const decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET_ACCESS_TOKEN,
    );

    if (!decoded || !decoded.id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.INVALID_TOKEN.code,
        errorType: 'notAuthorized',
        field: 'NotAuthorized',
        details: [],
        customMessage: HttpStatusCodes.INVALID_TOKEN.message,
      });
    }

    UsuarioIdSchema.parse(decoded.id);

    const data = await this.service.logout(decoded.id, token);

    return CommonResponse.success(res, null, messages.success.logout);
  };

  pass = async (req, res) => {
    const bodyrequest = req.body || {};
    const validatedBody = RequestAuthorizationSchema.parse(bodyrequest);

    const decoded =
      await promisify(jwt.verify)(
        validatedBody.accesstoken,
        process.env.JWT_SECRET_ACCESS_TOKEN,
      );

    UsuarioIdSchema.parse(decoded.id);

    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.exp ?? null;
    const iat = decoded.iat ?? null;
    const nbf = decoded.nbf ?? iat;
    const active = exp > now;

    const clientId = decoded.client_id || decoded.id || decoded.aud || null;

    const introspection = {
      active,
      client_id: clientId,
      token_type: 'Bearer',
      exp,
      iat,
      nbf,
    };

    return CommonResponse.success(
      res,
      introspection,
      HttpStatusCodes.OK.code,
      messages.authorized.default,
    );
  };
}

export default AuthController;
