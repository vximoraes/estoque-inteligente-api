import EstoqueRepository from './EstoqueRepository.js';

class EstoqueService {
  constructor() {
    this.repository = new EstoqueRepository();
  }

  async listar(req) {
    const data = await this.repository.listar(req);
    return data;
  }

  async buscarPorId(req) {
    const data = await this.repository.buscarPorId(req.params.id, req);
    return data;
  }

  async listarPorItem(req) {
    const data = await this.repository.listarPorItem(req);
    return data;
  }
}

export default EstoqueService;
