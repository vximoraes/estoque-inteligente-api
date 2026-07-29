import type { Response } from 'express';
import GrupoService from './GrupoService.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import { GrupoQuerySchema, GrupoIdSchema } from './GrupoQuerySchema.js';
import { GrupoSchema, GrupoUpdateSchema } from './GrupoSchema.js';
import ObjectIdSchema from '../../utils/objectIdSchema.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class GrupoController {
  private service: GrupoService;

  constructor() {
    this.service = new GrupoService();
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      GrupoIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      GrupoQuerySchema.parse(req.query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = GrupoSchema.parse(req.body);
    const data = await this.service.criar(parsedData);
    return CommonResponse.created(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      GrupoIdSchema.parse(id);
    }

    const parsedData = GrupoUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(parsedData, id as string, req.user);
    return CommonResponse.success(res, data);
  }

  async deletar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    GrupoIdSchema.parse(id);
    if (!id) {
      throw new Error('ID do grupo é obrigatório para deletar.');
    }

    const data = await this.service.deletar(id, req.user);
    return CommonResponse.success(res, data, 200, 'Grupo excluído com sucesso.');
  }

  async adicionarRota(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    const { idRota } = req.body as { idRota: string };
    GrupoIdSchema.parse(id);
    ObjectIdSchema.parse(idRota);

    const data = await this.service.adicionarRota(id, idRota);
    return CommonResponse.success(res, data, 200, 'Rota Adicionada com sucesso.');
  }
}

export default GrupoController;
