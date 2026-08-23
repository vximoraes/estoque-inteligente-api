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

  comValor(
    valorMin: number | null | undefined,
    valorMax: number | null | undefined,
  ): this {
    if (valorMin != null || valorMax != null) {
      const total: Record<string, number> = {};
      if (valorMin != null) total['$gte'] = valorMin;
      if (valorMax != null) total['$lte'] = valorMax;
      this.filtros.total = total;
    }
    return this;
  }

  comPeriodo(
    dataInicio: string | null | undefined,
    dataFim: string | null | undefined,
  ): this {
    if (dataInicio || dataFim) {
      const createdAt: Record<string, Date> = {};
      if (dataInicio) {
        createdAt['$gte'] = new Date(dataInicio + 'T00:00:00.000Z');
      }
      if (dataFim) createdAt['$lte'] = new Date(dataFim + 'T23:59:59.999Z');
      this.filtros.createdAt = createdAt;
    }
    return this;
  }

  build(): OrcamentoFilter {
    return this.filtros;
  }
}

export default OrcamentoFilterBuilder;
