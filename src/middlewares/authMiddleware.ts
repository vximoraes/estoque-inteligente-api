import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response, NextFunction } from 'express';
import AuthenticationError from '../utils/errors/AuthenticationError.js';
import { getAuth } from '../config/auth.js';
import type { AuthenticatedRequest } from '../utils/types.js';

async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.id) {
      return next(
        new AuthenticationError(
          'Sessão inválida ou expirada. Faça login novamente.',
        ),
      );
    }

    (req as AuthenticatedRequest).user_id = session.user.id;
    next();
  } catch (err) {
    next(new AuthenticationError('Erro ao validar sessão.'));
  }
}

export default authMiddleware;
