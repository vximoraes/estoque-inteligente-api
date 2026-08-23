import mongoose from 'mongoose';
import Item from '../item/ItemModel.js';
import Localizacao from '../localizacao/LocalizacaoModel.js';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

const { Types } = mongoose;

class EmprestimoFilterBuilder {
  private filtros: Record<string, unknown> = {};

  async comItem(item: string | null | undefined): Promise<this> {
    if (!item) return this;

    if (Types.ObjectId.isValid(item)) {
      const itemEncontrado = await Item.findById(item);
      this.filtros['item'] = itemEncontrado ? item : { $in: [] };
      return this;
    }

    const itemEncontrado = await Item.findOne({
      nome: { $regex: escapeRegex(item), $options: 'i' },
    });
    this.filtros['item'] = itemEncontrado ? itemEncontrado._id : { $in: [] };
    return this;
  }

  async comLocalizacao(localizacao: string | null | undefined): Promise<this> {
    if (!localizacao) return this;

    if (Types.ObjectId.isValid(localizacao)) {
      const localizacaoEncontrada = await Localizacao.findById(localizacao);
      this.filtros['localizacao'] = localizacaoEncontrada
        ? localizacao
        : { $in: [] };
      return this;
    }

    const localizacaoEncontrada = await Localizacao.findOne({
      nome: { $regex: escapeRegex(localizacao), $options: 'i' },
    });
    this.filtros['localizacao'] = localizacaoEncontrada
      ? localizacaoEncontrada._id
      : { $in: [] };
    return this;
  }

  async comBusca(busca: string | null | undefined): Promise<this> {
    if (!busca) return this;

    const regex = { $regex: escapeRegex(busca), $options: 'i' };

    const itensEncontrados = await Item.find({ nome: regex }).select('_id');
    const localizacoesEncontradas = await Localizacao.find({
      nome: regex,
    }).select('_id');

    this.filtros['$or'] = [
      { solicitante_nome: regex },
      { item: { $in: itensEncontrados.map((i) => i._id) } },
      { localizacao: { $in: localizacoesEncontradas.map((l) => l._id) } },
    ];

    return this;
  }

  comSolicitanteNome(solicitanteNome: string | null | undefined): this {
    if (solicitanteNome) {
      this.filtros['solicitante_nome'] = {
        $regex: escapeRegex(solicitanteNome),
        $options: 'i',
      };
    }
    return this;
  }

  comApenasAbertos(apenasAbertos: boolean): this {
    if (apenasAbertos === true) {
      this.filtros['quantidade_aberta'] = { $gt: 0 };
    }
    return this;
  }

  comAtrasados(atrasados: boolean): this {
    if (atrasados === true) {
      this.filtros['quantidade_aberta'] = { $gt: 0 };
      this.filtros['data_prevista_devolucao'] = { $lt: new Date(), $ne: null };
    }
    return this;
  }

  comDataSaidaInicio(dataSaidaInicio: Date | null | undefined): this {
    if (!dataSaidaInicio) return this;
    this.filtros['data_saida'] = {
      ...(this.filtros['data_saida'] as Record<string, unknown>),
      $gte: dataSaidaInicio,
    };
    return this;
  }

  comDataSaidaFim(dataSaidaFim: Date | null | undefined): this {
    if (!dataSaidaFim) return this;
    this.filtros['data_saida'] = {
      ...(this.filtros['data_saida'] as Record<string, unknown>),
      $lte: dataSaidaFim,
    };
    return this;
  }

  build(): Record<string, unknown> {
    return this.filtros;
  }
}

export default EmprestimoFilterBuilder;
