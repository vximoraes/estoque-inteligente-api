import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { CommonResponse, CustomError, HttpStatusCodes, messages } from '../../utils/helpers/index.js';
import { LoginSchema } from './LoginSchema.js';
import { UsuarioUpdateSchema } from '../usuario/UsuarioSchema.js';
import { UsuarioIdSchema } from '../usuario/UsuarioQuerySchema.js';
import { RequestAuthorizationSchema } from './RequestAuthorizationSchema.js';
import { EmailSchema } from './EmailSchema.js';
import AuthService from './AuthService.js';
import type { Request, Response } from 'express';

type VerifyAsync = (token: string, secret: string) => Promise<jwt.JwtPayload>;
const verifyAsync = promisify(jwt.verify) as unknown as VerifyAsync;

class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  login = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const validatedBody = LoginSchema.parse(body);
    const data = await this.service.login(validatedBody);
    return CommonResponse.success(res, data);
  };

  recuperaSenha = async (req: Request, res: Response) => {
    const validatedBody = EmailSchema.parse(req.body);
    const data = await this.service.recuperaSenha(validatedBody);
    return CommonResponse.success(res, data);
  };

  async atualizarSenhaToken(req: Request, res: Response) {
    const tokenRecuperacao =
      (req.query['token'] as string | undefined) ||
      (req.params['token'] as string | undefined) ||
      null;
    const senha = (req.body as Record<string, unknown>)['senha'] as string | null ?? null;

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

    const senhaSchema = UsuarioUpdateSchema.parse({ senha });
    await this.service.atualizarSenhaToken(tokenRecuperacao, senhaSchema);

    return CommonResponse.success(res, null, HttpStatusCodes.OK.code, 'Senha atualizada com sucesso.');
  }

  async atualizarSenhaCodigo(req: Request, res: Response) {
    const body = req.body as Record<string, unknown>;
    const codigo_recupera_senha = (body['codigo_recupera_senha'] as string | undefined) ?? null;
    const senha = (body['senha'] as string | undefined) ?? null;

    if (!codigo_recupera_senha) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: 'unauthorized',
        field: 'authentication',
        details: [],
        customMessage: 'Código de recuperação no body é obrigatório para troca da senha.',
      });
    }

    const senhaSchema = UsuarioUpdateSchema.parse({ senha });
    await this.service.atualizarSenhaCodigo(codigo_recupera_senha, senhaSchema);

    return CommonResponse.success(res, null, HttpStatusCodes.OK.code, 'Senha atualizada com sucesso.');
  }

  revoke = async (req: Request, res: Response) => {
    const id = (req.body as Record<string, unknown>)['id'] as string;
    const data = await this.service.revoke(id);
    return CommonResponse.success(res, null, 200, data.message);
  };

  refresh = async (req: Request, res: Response) => {
    const body = req.body as Record<string, string> | undefined;
    const token =
      body?.['refresh_token'] || req.headers.authorization?.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'invalidRefresh',
        field: 'Refresh',
        details: [],
        customMessage: 'Refresh token não informado.',
      });
    }

    let decoded: jwt.JwtPayload;

    try {
      decoded = await verifyAsync(token, process.env['JWT_SECRET_REFRESH_TOKEN'] ?? '');
    } catch (err) {
      const error = err as Error;
      if (error.name === 'TokenExpiredError') {
        throw new CustomError({
          statusCode: HttpStatusCodes.UNAUTHORIZED.code,
          errorType: 'tokenExpired',
          field: 'Refresh',
          details: [],
          customMessage: 'Refresh token expirado.',
        });
      }
      if (error.name === 'JsonWebTokenError') {
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

    const data = await this.service.refresh(decoded['id'] as string, token);
    return CommonResponse.success(res, data);
  };

  logout = async (req: Request, res: Response) => {
    const body = req.body as Record<string, string> | undefined;
    const token = body?.['access_token'] || req.headers.authorization?.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'invalidLogout',
        field: 'Logout',
        details: [],
        customMessage: HttpStatusCodes.BAD_REQUEST.message,
      });
    }

    const decoded = await verifyAsync(token, process.env['JWT_SECRET_ACCESS_TOKEN'] ?? '');

    if (!decoded || !decoded['id']) {
      throw new CustomError({
        statusCode: HttpStatusCodes.INVALID_TOKEN.code,
        errorType: 'notAuthorized',
        field: 'NotAuthorized',
        details: [],
        customMessage: HttpStatusCodes.INVALID_TOKEN.message,
      });
    }

    UsuarioIdSchema.parse(decoded['id']);
    await this.service.logout(decoded['id'] as string);

    return CommonResponse.success(res, null, 200, messages.success.default);
  };

  pass = async (req: Request, res: Response) => {
    const bodyrequest = req.body ?? {};
    const validatedBody = RequestAuthorizationSchema.parse(bodyrequest);

    const decoded = await verifyAsync(validatedBody.accesstoken, process.env['JWT_SECRET_ACCESS_TOKEN'] ?? '');

    UsuarioIdSchema.parse(decoded['id']);

    const now = Math.floor(Date.now() / 1000);
    const exp = decoded['exp'] ?? null;
    const iat = decoded['iat'] ?? null;
    const nbf = decoded['nbf'] ?? iat;
    const active = (exp ?? 0) > now;

    const clientId = decoded['client_id'] || decoded['id'] || decoded['aud'] || null;

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
