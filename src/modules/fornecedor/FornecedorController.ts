import type { Response } from 'express';
import FornecedorService from './FornecedorService.js';
import {
  FornecedorQuerySchema,
  FornecedorIdSchema,
} from './FornecedorQuerySchema.js';
import {
  FornecedorSchema,
  FornecedorUpdateSchema,
} from './FornecedorSchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class FornecedorController {
  private service: FornecedorService;

  constructor() {
    this.service = new FornecedorService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = FornecedorSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    const fornecedorLimpo = data.toObject();

    return CommonResponse.created(res, fornecedorLimpo);
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string | undefined;
    if (id) {
      FornecedorIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await FornecedorQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    FornecedorIdSchema.parse(id);

    const parsedData = FornecedorUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Fornecedor atualizado com sucesso.',
    );
  }

  async inativar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    FornecedorIdSchema.parse(id);

    const data = await this.service.inativar(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Fornecedor inativado com sucesso.',
    );
  }
}

export default FornecedorController;
