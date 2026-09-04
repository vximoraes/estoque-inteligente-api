import type { Response } from 'express';
import MovimentacaoService from './MovimentacaoService.js';
import {
  MovimentacaoQuerySchema,
  MovimentacaoIdSchema,
  MovimentacaoResumoQuerySchema,
  MovimentacaoTendenciaQuerySchema,
} from './MovimentacaoQuerySchema.js';
import { MovimentacaoSchema } from './MovimentacaoSchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class MovimentacaoController {
  private service: MovimentacaoService;

  constructor() {
    this.service = new MovimentacaoService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = MovimentacaoSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    return CommonResponse.created(res, data?.toObject() ?? data);
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      MovimentacaoIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await MovimentacaoQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async resumo(req: AuthenticatedRequest, res: Response) {
    await MovimentacaoResumoQuerySchema.parseAsync(req.query ?? {});
    const data = await this.service.resumo(req);

    return CommonResponse.success(res, data);
  }

  async tendencia(req: AuthenticatedRequest, res: Response) {
    await MovimentacaoTendenciaQuerySchema.parseAsync(req.query ?? {});
    const data = await this.service.tendencia(req);

    return CommonResponse.success(res, data);
  }
}

export default MovimentacaoController;
