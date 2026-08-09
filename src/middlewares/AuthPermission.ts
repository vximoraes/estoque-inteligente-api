import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response, NextFunction } from 'express';
import PermissionService from '../utils/services/PermissionService.js';
import RotaModel, { type RotaDocument } from '../modules/rota/RotaModel.js';
import { CustomError, errorHandler, messages } from '../utils/helpers/index.js';
import { getAuth } from '../config/auth.js';
import { DOMINIO_PADRAO } from '../config/RbacConfig.js';
import type { AuthenticatedRequest } from '../utils/types.js';
import type mongoose from 'mongoose';

const metodoMap: Record<string, string> = {
  GET: 'buscar',
  POST: 'enviar',
  PUT: 'substituir',
  PATCH: 'modificar',
  DELETE: 'excluir',
};

class AuthPermission {
  private permissionService: PermissionService;
  private Rota: mongoose.PaginateModel<RotaDocument>;
  handle: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  constructor() {
    this.permissionService = new PermissionService();
    this.Rota = RotaModel;
    this.handle = this._handle.bind(this);
  }

  async _handle(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const session = await getAuth().api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session?.user?.id) {
        throw new CustomError({
          statusCode: 401,
          errorType: 'authenticationError',
          field: 'Authorization',
          details: [],
          customMessage: messages.error.resourceNotFound('Sessão'),
        });
      }

      const userId = session.user.id;

      const rotaReq =
        req.url.split('/').filter(Boolean)[0]?.split('?')[0] ?? '';
      const dominioReq = DOMINIO_PADRAO;

      const rotaDB = await this.Rota.findOne({
        rota: rotaReq,
        dominio: dominioReq,
      });
      if (!rotaDB) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Rota',
          details: [],
          customMessage: messages.error.resourceNotFound('Rota'),
        });
      }

      const metodo = metodoMap[req.method];
      if (!metodo) {
        throw new CustomError({
          statusCode: 405,
          errorType: 'methodNotAllowed',
          field: 'Método',
          details: [],
          customMessage: messages.error.resourceNotFound('Método.'),
        });
      }

      const rotaObj = rotaDB as unknown as Record<string, unknown>;
      if (!rotaDB.ativo || !rotaObj[metodo]) {
        throw new CustomError({
          statusCode: 403,
          errorType: 'forbidden',
          field: 'Rota',
          details: [],
          customMessage: messages.error.resourceNotFound('Rota.'),
        });
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId,
        rotaReq.toLowerCase(),
        rotaDB.dominio,
        metodo,
        req.params as Record<string, string>,
        req.method,
      );

      if (!hasPermission) {
        throw new CustomError({
          statusCode: 403,
          errorType: 'forbidden',
          field: 'Permissão',
          details: [],
          customMessage: messages.error.resourceNotFound('Permissão'),
        });
      }

      const authReq = req as AuthenticatedRequest;
      authReq.user = { id: userId };
      authReq.user_id = userId;

      next();
    } catch (error) {
      errorHandler(error as Error, req, res, next);
    }
  }
}

export default new AuthPermission().handle;
