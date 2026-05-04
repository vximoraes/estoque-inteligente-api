import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../config/PaginationConfig.js';
import MovimentacaoFilterBuilder from './filters/MovimentacaoFilterBuilder.js';
import MovimentacaoModel from '../models/Movimentacao.js';
import { CustomError, messages } from '../utils/helpers/index.js';

class MovimentacaoRepository {
  constructor({ movimentacaoModel = MovimentacaoModel } = {}) {
    this.model = movimentacaoModel;
  }

  async criar(parsedData) {
    const movimentacao = new this.model(parsedData);
    const movimentacaoSalva = await movimentacao.save();

    return await this.model
      .findById(movimentacaoSalva._id)
      .populate('item')
      .populate('localizacao');
  }

  async listar(req) {
    const id = req.params.id || null;

    if (id) {
      const data = await this.model
        .findOne({ _id: id })
        .populate('item')
        .populate('localizacao');

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Movimentacao',
          details: [],
          customMessage: messages.error.resourceNotFound('Movimentacao'),
        });
      }

      const dataWithStats = {
        ...data.toObject(),
      };

      return dataWithStats;
    }

    const { tipo, data, quantidade, item, localizacao, page = 1 } = req.query;
    const limite = Math.min(parseInt(req.query.limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);

    const filterBuilder = new MovimentacaoFilterBuilder()
      .comTipo(tipo || '')
      .comData(data || '')
      .comQuantidade(quantidade || '');

    await filterBuilder.comItem(item || '');
    await filterBuilder.comLocalizacao(localizacao || '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Movimentacao',
        details: [],
        customMessage: messages.error.internalServerError('Movimentacao'),
      });
    }

    const filtros = { ...filterBuilder.build() };

    const options = {
      page: parseInt(page),
      limit: parseInt(limite),
      populate: ['item', 'localizacao'],
      sort: { data_hora: -1 },
    };

    const resultado = await this.model.paginate(filtros, options);

    resultado.docs = resultado.docs.map((doc) => {
      const movimentacaoObj =
        typeof doc.toObject === 'function' ? doc.toObject() : doc;

      return {
        ...movimentacaoObj,
      };
    });

    return resultado;
  }

  // Métodos auxiliares.

  async buscarPorId(id, includeTokens = false, req) {
    const query = this.model.findOne({ _id: id });

    const movimentacao = await query;

    if (!movimentacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Movimentacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Movimentacao'),
      });
    }

    return movimentacao;
  }
}

export default MovimentacaoRepository;
