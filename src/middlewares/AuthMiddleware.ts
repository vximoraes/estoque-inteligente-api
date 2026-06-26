import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import type { Request, Response, NextFunction } from 'express';
import AuthenticationError from '../utils/errors/AuthenticationError.js';
import TokenExpiredError from '../utils/errors/TokenExpiredError.js';
import { CustomError } from '../utils/helpers/index.js';
import AuthService from '../modules/auth/AuthService.js';
import type { AuthenticatedRequest } from '../utils/types.js';

type VerifyAsync = (token: string, secret: string) => Promise<jwt.JwtPayload>;
const verifyAsync = promisify(jwt.verify) as unknown as VerifyAsync;

class AuthMiddleware {
  private service: AuthService;
  handle: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  constructor() {
    this.service = new AuthService();
    this.handle = this._handle.bind(this);
  }

  _getTokenAndSecret(req: Request): { token: string; secret: string } {
    const authHeader = req.headers?.authorization ?? null;
    if (authHeader) {
      const parts = authHeader.split(' ');
      const token = (parts.length === 2 ? parts[1] : parts[0]) as string;
      return {
        token,
        secret: process.env['JWT_SECRET_ACCESS_TOKEN'] ?? '',
      };
    }

    const queryToken = (req.query as Record<string, string | undefined>)['token'];
    if (queryToken) {
      return {
        token: queryToken,
        secret: process.env['JWT_SECRET_PASSWORD_RECOVERY'] ?? '',
      };
    }

    throw new AuthenticationError('Token não informado!');
  }

  async _handle(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, secret } = this._getTokenAndSecret(req);

      const decoded = await verifyAsync(token, secret);

      if (!decoded) {
        throw new TokenExpiredError('Token JWT expirado, tente novamente.');
      }

      if (secret === process.env['JWT_SECRET_ACCESS_TOKEN']) {
        const tokenData = await this.service.carregatokens(decoded['id'] as string, token);

        const data = tokenData?.data as unknown as Record<string, unknown> | undefined;
        if (!data?.['refreshtoken']) {
          throw new CustomError({
            statusCode: 401,
            errorType: 'unauthorized',
            field: 'Token',
            details: [],
            customMessage: 'Refresh token inválido, autentique-se novamente!',
          });
        }
      }

      (req as AuthenticatedRequest).user_id = decoded['id'] as string;
      next();
    } catch (err) {
      const error = err as Error;
      if (error.name === 'JsonWebTokenError') {
        return next(new AuthenticationError('Token JWT inválido!'));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new TokenExpiredError('Token JWT expirado, faça login novamente.'));
      }
      return next(err);
    }
  }
}

export default new AuthMiddleware().handle;
