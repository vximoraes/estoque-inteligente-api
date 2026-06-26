import type mongoose from 'mongoose';
import type { IRota } from './RotaModel.js';

type RotaFilter = mongoose.FilterQuery<IRota>;

class RotaFilterBuilder {
  private filtros: RotaFilter = {};

  comRota(rota: string | null | undefined): this {
    if (rota) {
      this.filtros.rota = { $regex: rota, $options: 'i' };
    }
    return this;
  }

  comDominio(dominio: string | null | undefined): this {
    if (dominio) {
      this.filtros.dominio = { $regex: dominio, $options: 'i' };
    }
    return this;
  }

  comAtivo(ativo: string | null | undefined): this {
    if (ativo === 'true') {
      this.filtros.ativo = true;
    } else if (ativo === 'false') {
      this.filtros.ativo = false;
    }
    return this;
  }

  comGet(buscar: string | null | undefined): this {
    if (buscar === 'true') {
      this.filtros.buscar = true;
    } else if (buscar === 'false') {
      this.filtros.buscar = false;
    }
    return this;
  }

  comPost(enviar: string | null | undefined): this {
    if (enviar === 'true') {
      this.filtros.enviar = true;
    } else if (enviar === 'false') {
      this.filtros.enviar = false;
    }
    return this;
  }

  comPut(substituir: string | null | undefined): this {
    if (substituir === 'true') {
      this.filtros.substituir = true;
    } else if (substituir === 'false') {
      this.filtros.substituir = false;
    }
    return this;
  }

  comPatch(modificar: string | null | undefined): this {
    if (modificar === 'true') {
      this.filtros.modificar = true;
    } else if (modificar === 'false') {
      this.filtros.modificar = false;
    }
    return this;
  }

  comDelete(excluir: string | null | undefined): this {
    if (excluir === 'true') {
      this.filtros.excluir = true;
    } else if (excluir === 'false') {
      this.filtros.excluir = false;
    }
    return this;
  }

  build(): RotaFilter {
    return this.filtros;
  }
}

export default RotaFilterBuilder;
