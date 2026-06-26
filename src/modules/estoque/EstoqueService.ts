import EstoqueRepository from './EstoqueRepository.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class EstoqueService {
  private repository: EstoqueRepository;

  constructor() {
    this.repository = new EstoqueRepository();
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async buscarPorId(req: AuthenticatedRequest) {
    return await this.repository.buscarPorId(req.params['id'] as string, req);
  }

  async listarPorItem(req: AuthenticatedRequest) {
    return await this.repository.listarPorItem(req);
  }
}

export default EstoqueService;
