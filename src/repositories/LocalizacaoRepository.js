import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../config/PaginationConfig.js';
import LocalizacaoFilterBuilder from './filters/LocalizacaoFilterBuilder.js';
import LocalizacaoModel from '../models/Localizacao.js';
import { CustomError, messages } from '../utils/helpers/index.js';

class LocalizacaoRepository {
  constructor({ localizacaoModel = LocalizacaoModel } = {}) {
    this.model = localizacaoModel;
  }

  async criar(parsedData) {
    const localizacao = new this.model(parsedData);
    return await localizacao.save();
  }

  async listar(req) {
    const id = req.params.id || null;

    if (id) {
      const data = await this.model.findOne({ _id: id, ativo: true });

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Localizacao',
          details: [],
          customMessage: messages.error.resourceNotFound('Localizacao'),
        });
      }

      const dataWithStats = {
        ...data.toObject(),
      };

      return dataWithStats;
    }

    const { nome, page = 1 } = req.query;
    const limite = Math.min(parseInt(req.query.limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);

    const filterBuilder = new LocalizacaoFilterBuilder().comNome(nome || '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Localizacao',
        details: [],
        customMessage: messages.error.internalServerError('Localizacao'),
      });
    }

    const filtros = { ...filterBuilder.build(), ativo: true };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limite, 10),
      sort: { nome: 1 },
    };

    const resultado = await this.model.paginate(filtros, options);

    resultado.docs = resultado.docs.map((doc) => {
      const localizacaoObj =
        typeof doc.toObject === 'function' ? doc.toObject() : doc;

      return {
        ...localizacaoObj,
      };
    });

    return resultado;
  }

  async atualizar(id, parsedData, req) {
    const localizacao = await this.model
      .findOneAndUpdate({ _id: id }, parsedData, { new: true })
      .lean();
    if (!localizacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Localizacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Localizacao'),
      });
    }

    return localizacao;
  }

  // Métodos auxiliares.

  async buscarPorNome(nome, idIgnorado, req) {
    const filtro = { nome, ativo: true };

    if (idIgnorado) {
      filtro._id = { $ne: idIgnorado };
    }

    const documento = await this.model.findOne(filtro);

    return documento;
  }

  async buscarPorId(id, includeTokens = false, req) {
    const query = this.model.findOne({ _id: id, ativo: true });

    const localizacao = await query;

    if (!localizacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Localizacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Localizacao'),
      });
    }

    return localizacao;
  }
}

export default LocalizacaoRepository;
