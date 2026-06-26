import type mongoose from 'mongoose';
import type { IOrcamento } from './OrcamentoModel.js';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

type OrcamentoFilter = mongoose.FilterQuery<IOrcamento>;

class OrcamentoFilterBuilder {
  private filtros: OrcamentoFilter = {};

  comNome(nome: string | null | undefined): this {
    if (nome) {
      this.filtros.nome = { $regex: escapeRegex(nome), $options: 'i' };
    }
    return this;
  }

  build(): OrcamentoFilter {
    return this.filtros;
  }
}

export default OrcamentoFilterBuilder;
