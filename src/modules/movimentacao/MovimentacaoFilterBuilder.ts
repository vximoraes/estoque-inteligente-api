import Item from '../item/ItemModel.js';
import Localizacao from '../localizacao/LocalizacaoModel.js';
import mongoose from 'mongoose';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

const { Types } = mongoose;

class MovimentacaoFilterBuilder {
  private filtros: Record<string, unknown> = {};

  comTipo(tipo: string | null | undefined): this {
    if (tipo) {
      this.filtros['tipo'] = { $regex: escapeRegex(tipo), $options: 'i' };
    }
    return this;
  }

  comData(data: string | null | undefined): this {
    if (data) {
      const inicio = new Date(data + 'T00:00:00.000Z');
      const fim = new Date(data + 'T23:59:59.999Z');
      this.filtros['data_hora'] = { $gte: inicio, $lte: fim };
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

  async comItem(item: string | null | undefined): Promise<this> {
    if (item) {
      if (Types.ObjectId.isValid(item)) {
        this.filtros['item'] = item;
        const itemEncontrado = await Item.findById(item);
        if (!itemEncontrado) {
          this.filtros['item'] = { $in: [] };
        }
      } else {
        const itemEncontrado = await Item.findOne({ nome: { $regex: escapeRegex(item), $options: 'i' } });
        if (itemEncontrado) {
          this.filtros['item'] = itemEncontrado._id;
        } else {
          this.filtros['item'] = { $in: [] };
        }
      }
    }
    return this;
  }

  async comLocalizacao(localizacao: string | null | undefined): Promise<this> {
    if (localizacao) {
      if (Types.ObjectId.isValid(localizacao)) {
        this.filtros['localizacao'] = localizacao;
        const localizacaoEncontrada = await Localizacao.findById(localizacao);
        if (!localizacaoEncontrada) {
          this.filtros['localizacao'] = { $in: [] };
        }
      } else {
        const localizacaoEncontrada = await Localizacao.findOne({
          nome: { $regex: escapeRegex(localizacao), $options: 'i' },
        });
        if (localizacaoEncontrada) {
          this.filtros['localizacao'] = localizacaoEncontrada._id;
        } else {
          this.filtros['localizacao'] = { $in: [] };
        }
      }
    }
    return this;
  }

  build(): Record<string, unknown> {
    return this.filtros;
  }
}

export default MovimentacaoFilterBuilder;
