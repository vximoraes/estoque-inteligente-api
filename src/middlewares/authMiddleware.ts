import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response, NextFunction } from 'express';
import AuthenticationError from '../utils/errors/AuthenticationError.js';
import { getAuth } from '../config/auth.js';
import type { AuthenticatedRequest } from '../utils/types.js';
import { resolverFuso } from '../utils/fusoHorario.js';

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
    (req as AuthenticatedRequest).fuso_horario = resolverFuso(
      (session.user as Record<string, unknown>)['fuso_horario'],
    );
    next();
  } catch (err) {
    next(new AuthenticationError('Erro ao validar sessão.'));
  }
}

export default authMiddleware;
