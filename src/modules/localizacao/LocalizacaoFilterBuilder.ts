import type mongoose from 'mongoose';
import type { ILocalizacao } from './LocalizacaoModel.js';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

type LocalizacaoFilter = mongoose.FilterQuery<ILocalizacao>;

class LocalizacaoFilterBuilder {
  private filtros: LocalizacaoFilter = {};

  comNome(nome: string | null | undefined): this {
    if (nome) {
      this.filtros['nome'] = { $regex: escapeRegex(nome), $options: 'i' };
    }
    return this;
  }

  build(): LocalizacaoFilter {
    return this.filtros;
  }
}

export default LocalizacaoFilterBuilder;
