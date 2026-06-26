import type { Response } from 'express';
import EstoqueService from './EstoqueService.js';
import { EstoqueQuerySchema, EstoqueIdSchema } from './EstoqueQuerySchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class EstoqueController {
  private service: EstoqueService;

  constructor() {
    this.service = new EstoqueService();
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await EstoqueQuerySchema.parseAsync(query);
    }
    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async buscarPorId(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    EstoqueIdSchema.parse(id);
    const data = await this.service.buscarPorId(req);
    return CommonResponse.success(res, data);
  }

  async listarPorItem(req: AuthenticatedRequest, res: Response) {
    const itemId = req.params['itemId'] as string;
    EstoqueIdSchema.parse(itemId);
    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await EstoqueQuerySchema.parseAsync(query);
    }
    const data = await this.service.listarPorItem(req);
    return CommonResponse.success(res, data);
  }
}

export default EstoqueController;
