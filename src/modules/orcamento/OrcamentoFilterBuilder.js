import OrcamentoModel from './OrcamentoModel.js';
import OrcamentoRepository from './OrcamentoRepository.js';

class OrcamentoFilterBuilder {
  constructor() {
    this.filtros = {};
    this.orcamentoRepository = new OrcamentoRepository();
    this.orcamentoModel = OrcamentoModel;
  }

  comNome(nome) {
    if (nome) {
      this.filtros.nome = { $regex: nome, $options: 'i' };
    }
    return this;
  }

  build() {
    return this.filtros;
  }
}

export default OrcamentoFilterBuilder;
