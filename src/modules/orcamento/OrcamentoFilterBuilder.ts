import type mongoose from 'mongoose';
import type { IOrcamento } from './OrcamentoModel.js';

type OrcamentoFilter = mongoose.FilterQuery<IOrcamento>;

class OrcamentoFilterBuilder {
  private filtros: OrcamentoFilter = {};

  comNome(nome: string | null | undefined): this {
    if (nome) {
      this.filtros.nome = { $regex: nome, $options: 'i' };
    }
    return this;
  }

  build(): OrcamentoFilter {
    return this.filtros;
  }
}

export default OrcamentoFilterBuilder;
