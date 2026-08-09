import type { Response } from 'express';
import CategoriaService from './CategoriaService.js';
import {
  CategoriaQuerySchema,
  CategoriaIdSchema,
} from './CategoriaQuerySchema.js';
import { CategoriaSchema, CategoriaUpdateSchema } from './CategoriaSchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class CategoriaController {
  private service: CategoriaService;

  constructor() {
    this.service = new CategoriaService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = CategoriaSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    return CommonResponse.created(res, data.toObject());
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      CategoriaIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await CategoriaQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    CategoriaIdSchema.parse(id);

    const parsedData = CategoriaUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Categoria atualizada com sucesso.',
    );
  }

  async inativar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    CategoriaIdSchema.parse(id);

    const data = await this.service.inativar(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Categoria inativada com sucesso.',
    );
  }
}

export default CategoriaController;
