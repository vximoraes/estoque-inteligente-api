import mongoose from 'mongoose';
import CategoriaModel from '../categoria/CategoriaModel.js';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

const { Types } = mongoose;

class PatrimonioFilterBuilder {
  filtros: Record<string, unknown> = {};

  constructor() {
    this.filtros = {};
  }

  comStatus(status: string | null | undefined): this {
    if (
      status &&
      ['Disponível', 'Emprestado', 'Manutenção', 'Baixado'].includes(status)
    ) {
      this.filtros['status'] = status;
    }
    return this;
  }

  comLocalizacao(localizacao: string | null | undefined): this {
    if (localizacao && Types.ObjectId.isValid(localizacao)) {
      this.filtros['localizacao'] = new Types.ObjectId(localizacao);
    }
    return this;
  }

  comNumeroPatrimonio(numeroPatrimonio: string | null | undefined): this {
    if (numeroPatrimonio) {
      this.filtros['numero_patrimonio'] = {
        $regex: escapeRegex(numeroPatrimonio),
        $options: 'i',
      };
    }
    return this;
  }

  // Busca por número de patrimônio OU pelo modelo (texto livre) da unidade.
  comBusca(busca: string | null | undefined): this {
    if (!busca) return this;

    this.filtros['$or'] = [
      { numero_patrimonio: { $regex: escapeRegex(busca), $options: 'i' } },
      { modelo: { $regex: escapeRegex(busca), $options: 'i' } },
    ];
    return this;
  }

  async comCategoria(categoria: string | null | undefined): Promise<this> {
    if (!categoria) return this;

    let categoriaId: mongoose.Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(categoria)) {
      const categoriaEncontrada = await CategoriaModel.findById(categoria);
      categoriaId = categoriaEncontrada ? categoriaEncontrada._id : null;
    } else {
      const categoriaEncontrada = await CategoriaModel.findOne({
        nome: { $regex: escapeRegex(categoria), $options: 'i' },
      });
      categoriaId = categoriaEncontrada ? categoriaEncontrada._id : null;
    }

    this.filtros['categoria'] = categoriaId ?? { $in: [] };
    return this;
  }

  comModelo(modelo: string | null | undefined): this {
    if (modelo) {
      this.filtros['modelo'] = {
        $regex: `^${escapeRegex(modelo)}$`,
        $options: 'i',
      };
    }
    return this;
  }

  comAtivo(ativo = 'true'): this {
    if (ativo === 'true') {
      this.filtros['ativo'] = true;
    }
    if (ativo === 'false') {
      this.filtros['ativo'] = false;
    }
    return this;
  }

  build(): Record<string, unknown> {
    return this.filtros;
  }
}

export default PatrimonioFilterBuilder;
