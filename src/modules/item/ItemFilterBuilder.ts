import ItemModel from './ItemModel.js';
import ItemRepository from './ItemRepository.js';
import Categoria from '../categoria/CategoriaModel.js';
import mongoose from 'mongoose';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

const { Types } = mongoose;

class ItemFilterBuilder {
  filtros: Record<string, unknown> = {};
  itemRepository: ItemRepository;
  itemModel: typeof ItemModel;

  constructor() {
    this.filtros = {};
    this.itemRepository = new ItemRepository();
    this.itemModel = ItemModel;
  }

  comNome(nome: string | null | undefined): this {
    if (nome) {
      this.filtros['nome'] = { $regex: escapeRegex(nome), $options: 'i' };
    }
    return this;
  }

  comTipo(tipo: string | null | undefined): this {
    if (tipo === 'consumo') {
      this.filtros['tipo'] = tipo;
    }
    return this;
  }

  comQuantidade(quantidade: string | number | null | undefined): this {
    if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
      const num = Number(quantidade);
      if (!isNaN(num)) {
        this.filtros['quantidade'] = num;
      }
    }
    return this;
  }

  comEstoqueMinimo(estoque_minimo: string | null | undefined): this {
    if (estoque_minimo === 'true') {
      this.filtros['$expr'] = { $lt: ['$quantidade', '$estoque_minimo'] };
    }
    return this;
  }

  async comCategoria(categoria: string | null | undefined): Promise<this> {
    if (categoria) {
      if (Types.ObjectId.isValid(categoria)) {
        this.filtros['categoria'] = new Types.ObjectId(categoria);
        const categoriaEncontrada = await Categoria.findById(categoria);
        if (!categoriaEncontrada) {
          this.filtros['categoria'] = { $in: [] };
        }
      } else {
        const categoriaEncontrada = await Categoria.findOne({
          nome: { $regex: escapeRegex(categoria), $options: 'i' },
        });
        if (categoriaEncontrada) {
          this.filtros['categoria'] = categoriaEncontrada._id;
        } else {
          this.filtros['categoria'] = { $in: [] };
        }
      }
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

  comStatus(status: string | null | undefined): this {
    if (
      status &&
      ['Indisponível', 'Baixo Estoque', 'Em Estoque'].includes(status)
    ) {
      this.filtros['status'] = status;
    }
    return this;
  }

  build(): Record<string, unknown> {
    return this.filtros;
  }
}

export default ItemFilterBuilder;
