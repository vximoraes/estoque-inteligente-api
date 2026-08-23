import type { Response } from 'express';
import LocalizacaoService from './LocalizacaoService.js';
import {
  LocalizacaoQuerySchema,
  LocalizacaoIdSchema,
} from './LocalizacaoQuerySchema.js';
import {
  LocalizacaoSchema,
  LocalizacaoUpdateSchema,
} from './LocalizacaoSchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class LocalizacaoController {
  private service: LocalizacaoService;

  constructor() {
    this.service = new LocalizacaoService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = LocalizacaoSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    return CommonResponse.created(res, data.toObject());
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      LocalizacaoIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await LocalizacaoQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    LocalizacaoIdSchema.parse(id);

    const parsedData = LocalizacaoUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Localização atualizada com sucesso.',
    );
  }

  async inativar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    LocalizacaoIdSchema.parse(id);

    const data = await this.service.inativar(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Localização inativada com sucesso.',
    );
  }
}

export default LocalizacaoController;
