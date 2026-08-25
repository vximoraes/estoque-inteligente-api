import mongoose from 'mongoose';
import ItemModel from '../item/ItemModel.js';
import CategoriaModel from '../categoria/CategoriaModel.js';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

const { Types } = mongoose;

class PatrimonioFilterBuilder {
  filtros: Record<string, unknown> = {};
  itemModel: typeof ItemModel;

  constructor() {
    this.filtros = {};
    this.itemModel = ItemModel;
  }

  comItem(item: string | null | undefined): this {
    if (item && Types.ObjectId.isValid(item)) {
      this.filtros['item'] = new Types.ObjectId(item);
    }
    return this;
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

  // Busca por número de patrimônio OU pelo nome do modelo (`Item`) a que a
  // unidade pertence — a tela lista unidades soltas, então o nome do modelo
  // é o que o usuário de fato reconhece e busca.
  async comBusca(busca: string | null | undefined): Promise<this> {
    if (!busca) return this;

    const itensEncontrados = await this.itemModel
      .find({
        nome: { $regex: escapeRegex(busca), $options: 'i' },
        tipo: 'permanente',
      })
      .select('_id');
    const itemIds = itensEncontrados.map((item) => item._id);

    this.filtros['$or'] = [
      { numero_patrimonio: { $regex: escapeRegex(busca), $options: 'i' } },
      { item: { $in: itemIds } },
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

    if (!categoriaId) {
      this.filtros['item'] = { $in: [] };
      return this;
    }

    const itensEncontrados = await this.itemModel
      .find({ categoria: categoriaId })
      .select('_id');
    this.filtros['item'] = { $in: itensEncontrados.map((item) => item._id) };
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
