import mongoose from 'mongoose';
import Item from '../../modules/item/ItemModel.js';
import Localizacao from '../../modules/localizacao/LocalizacaoModel.js';

const { Types } = mongoose;

class EmprestimoFilterBuilder {
  constructor() {
    this.filtros = {};
  }

  async comItem(item) {
    if (!item) return this;

    if (Types.ObjectId.isValid(item)) {
      const itemEncontrado = await Item.findById(item);
      this.filtros.item = itemEncontrado ? item : { $in: [] };
      return this;
    }

    const itemEncontrado = await Item.findOne({
      nome: { $regex: item, $options: 'i' },
    });

    this.filtros.item = itemEncontrado ? itemEncontrado._id : { $in: [] };
    return this;
  }

  async comLocalizacao(localizacao) {
    if (!localizacao) return this;

    if (Types.ObjectId.isValid(localizacao)) {
      const localizacaoEncontrada = await Localizacao.findById(localizacao);
      this.filtros.localizacao = localizacaoEncontrada
        ? localizacao
        : { $in: [] };
      return this;
    }

    const localizacaoEncontrada = await Localizacao.findOne({
      nome: { $regex: localizacao, $options: 'i' },
    });

    this.filtros.localizacao = localizacaoEncontrada
      ? localizacaoEncontrada._id
      : { $in: [] };

    return this;
  }

  comSolicitanteNome(solicitanteNome) {
    if (solicitanteNome) {
      this.filtros.solicitante_nome = {
        $regex: solicitanteNome,
        $options: 'i',
      };
    }

    return this;
  }

  comApenasAbertos(apenasAbertos) {
    if (apenasAbertos === true) {
      this.filtros.quantidade_aberta = { $gt: 0 };
    }

    return this;
  }

  comAtrasados(atrasados) {
    if (atrasados === true) {
      this.filtros.quantidade_aberta = { $gt: 0 };
      this.filtros.data_prevista_devolucao = { $lt: new Date(), $ne: null };
    }

    return this;
  }

  comDataSaidaInicio(dataSaidaInicio) {
    if (!dataSaidaInicio) return this;

    this.filtros.data_saida = {
      ...this.filtros.data_saida,
      $gte: dataSaidaInicio,
    };

    return this;
  }

  comDataSaidaFim(dataSaidaFim) {
    if (!dataSaidaFim) return this;

    this.filtros.data_saida = {
      ...this.filtros.data_saida,
      $lte: dataSaidaFim,
    };

    return this;
  }

  build() {
    return this.filtros;
  }
}

export default EmprestimoFilterBuilder;
