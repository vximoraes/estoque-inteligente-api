import type { Response } from 'express';
import RotaService from './RotaService.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import { RotaQuerySchema, RotaIdSchema } from './RotaQuerySchema.js';
import { RotaSchema, RotaUpdateSchema } from './RotaSchema.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class RotaController {
  private service: RotaService;

  constructor() {
    this.service = new RotaService();
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string | undefined;
    if (id) {
      RotaIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      RotaQuerySchema.parse(query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = RotaSchema.parse(req.body);
    const data = await this.service.criar(parsedData);
    return CommonResponse.created(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    RotaIdSchema.parse(id);

    const parsedData = RotaUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(parsedData, id);
    return CommonResponse.success(res, data);
  }

  async deletar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    RotaIdSchema.parse(id);

    const data = await this.service.deletar(req, id);
    return CommonResponse.success(res, data);
  }
}

export default RotaController;
