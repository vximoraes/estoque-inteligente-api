import type { Response } from 'express';
import NotificacaoService from './NotificacaoService.js';
import { NotificacaoSchema } from './NotificacaoSchema.js';
import { CommonResponse, HttpStatusCodes } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class NotificacaoController {
  private service: NotificacaoService;

  constructor() {
    this.service = new NotificacaoService();
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const notificacoes = await this.service.listarTodas(req);
    return CommonResponse.success(res, notificacoes);
  }

  async buscarPorId(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    const notificacao = await this.service.buscarPorId(id, req);
    if (!notificacao) {
      return CommonResponse.error(res, HttpStatusCodes.NOT_FOUND.code, 'resourceNotFound', 'Notificação');
    }
    return CommonResponse.success(res, notificacao);
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = NotificacaoSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);
    return CommonResponse.created(res, data);
  }

  async marcarComoVisualizada(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    const notificacao = await this.service.buscarPorId(id, req);
    if (!notificacao) {
      return CommonResponse.error(res, HttpStatusCodes.NOT_FOUND.code, 'resourceNotFound', 'Notificação');
    }
    const atualizada = await this.service.marcarComoVisualizada(id, req);
    return CommonResponse.success(res, atualizada);
  }

  async marcarTodasComoVisualizadas(req: AuthenticatedRequest, res: Response) {
    await this.service.marcarTodasComoVisualizadas(req);
    return CommonResponse.success(res, null);
  }

  async inativar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    const notificacao = await this.service.buscarPorId(id, req);
    if (!notificacao) {
      return CommonResponse.error(res, HttpStatusCodes.NOT_FOUND.code, 'resourceNotFound', 'Notificação');
    }
    const inativada = await this.service.inativar(id, req);
    return CommonResponse.success(res, inativada);
  }
}

export default NotificacaoController;
