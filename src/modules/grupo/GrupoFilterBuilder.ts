import type mongoose from 'mongoose';
import type { IGrupo } from './GrupoModel.js';

type GrupoFilter = mongoose.FilterQuery<IGrupo>;

class GrupoFilterBuilder {
  private filtros: GrupoFilter = {};

  comNome(nome: string | null | undefined): this {
    if (nome) {
      const nomeEscapado = this.escapeRegex(nome);
      this.filtros['nome'] = { $regex: nomeEscapado, $options: 'i' };
    }
    return this;
  }

  comDescricao(descricao: string | null | undefined): this {
    if (descricao) {
      const descricaoEscapada = this.escapeRegex(descricao);
      this.filtros['descricao'] = { $regex: descricaoEscapada, $options: 'i' };
    }
    return this;
  }

  comAtivo(ativo: string | null | undefined): this {
    if (ativo === 'true') {
      this.filtros['ativo'] = true;
    } else if (ativo === 'false') {
      this.filtros['ativo'] = false;
    }
    return this;
  }

  private escapeRegex(texto: string): string {
    return texto.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  build(): GrupoFilter {
    return this.filtros;
  }
}

export default GrupoFilterBuilder;
