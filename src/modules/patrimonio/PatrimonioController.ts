import type { Response } from 'express';
import PatrimonioService from './PatrimonioService.js';
import {
  PatrimonioQuerySchema,
  PatrimonioIdSchema,
} from './PatrimonioQuerySchema.js';
import {
  PatrimonioSchema,
  PatrimonioLoteSchema,
  PatrimonioUpdateSchema,
  PatrimonioStatusSchema,
  PatrimonioLocalizacaoSchema,
} from './PatrimonioSchema.js';
import { paginationSchema } from '../../utils/commonFields.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class PatrimonioController {
  private service: PatrimonioService;

  constructor() {
    this.service = new PatrimonioService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = PatrimonioSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    return CommonResponse.created(res, data);
  }

  async criarLote(req: AuthenticatedRequest, res: Response) {
    const parsedData = PatrimonioLoteSchema.parse(req.body);
    const data = await this.service.criarLote(parsedData, req);

    return CommonResponse.created(
      res,
      data,
      `${data.length} unidade(s) de patrimônio criada(s) com sucesso.`,
    );
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      PatrimonioIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await PatrimonioQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async buscarEventos(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    PatrimonioIdSchema.parse(id);

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await paginationSchema.parseAsync(query);
    }

    const data = await this.service.buscarEventos(id, req);

    return CommonResponse.success(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    PatrimonioIdSchema.parse(id);

    const parsedData = PatrimonioUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Patrimônio atualizado com sucesso.',
    );
  }

  async atualizarStatus(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    PatrimonioIdSchema.parse(id);

    const parsedData = PatrimonioStatusSchema.parse(req.body);
    const data = await this.service.transicionar(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Status do patrimônio atualizado com sucesso.',
    );
  }

  async atualizarLocalizacao(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    PatrimonioIdSchema.parse(id);

    const parsedData = PatrimonioLocalizacaoSchema.parse(req.body);
    const data = await this.service.transferir(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Localização do patrimônio atualizada com sucesso.',
    );
  }

  async inativar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    PatrimonioIdSchema.parse(id);

    const data = await this.service.inativar(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Patrimônio inativado com sucesso.',
    );
  }

  async uploadFoto(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    PatrimonioIdSchema.parse(id);

    const data = await this.service.uploadFoto(req, id);
    return CommonResponse.success(res, data, 201, 'Foto enviada com sucesso.');
  }

  async deletarFoto(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    PatrimonioIdSchema.parse(id);

    const data = await this.service.deletarFoto(req, id);

    return CommonResponse.success(res, data, 200, 'Foto deletada com sucesso.');
  }
}

export default PatrimonioController;
