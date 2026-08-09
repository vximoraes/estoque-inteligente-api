import NotificacaoRepository from './NotificacaoRepository.js';
import type { Notificacao } from './NotificacaoSchema.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class NotificacaoService {
  private repository: NotificacaoRepository;

  constructor() {
    this.repository = new NotificacaoRepository();
  }

  async listarTodas(req: AuthenticatedRequest) {
    return await this.repository.listar(req.user_id, req);
  }

  async buscarPorId(id: string, req: AuthenticatedRequest) {
    return await this.repository.buscarPorId(id, req.user_id);
  }

  async criar(parsedData: Notificacao, req: AuthenticatedRequest) {
    const dataToCreate = { ...parsedData, usuario: req.user_id };
    return await this.repository.criar(
      dataToCreate as unknown as Record<string, unknown>,
    );
  }

  async marcarComoVisualizada(id: string, req: AuthenticatedRequest) {
    return await this.repository.marcarComoVisualizada(id, req.user_id);
  }

  async marcarTodasComoVisualizadas(req: AuthenticatedRequest) {
    await this.repository.marcarTodasComoVisualizadas(req.user_id);
  }

  async inativar(id: string, req: AuthenticatedRequest) {
    return await this.repository.inativar(id, req.user_id);
  }
}

export default NotificacaoService;
