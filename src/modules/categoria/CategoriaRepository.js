import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import CategoriaFilterBuilder from './CategoriaFilterBuilder.js';
import CategoriaModel from './CategoriaModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';

class CategoriaRepository {
  constructor({ categoriaModel = CategoriaModel } = {}) {
    this.model = categoriaModel;
  }

  async criar(parsedData) {
    const categoria = new this.model(parsedData);
    return await categoria.save();
  }

  async listar(req) {
    const id = req.params.id || null;

    if (id) {
      const data = await this.model.findOne({ _id: id, ativo: true });

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Categoria',
          details: [],
          customMessage: messages.error.resourceNotFound('Categoria'),
        });
      }

      const dataWithStats = {
        ...data.toObject(),
      };

      return dataWithStats;
    }

    const { nome, page = 1 } = req.query;
    const limite = Math.min(parseInt(req.query.limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);

    const filterBuilder = new CategoriaFilterBuilder().comNome(nome || '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Categoria',
        details: [],
        customMessage: messages.error.internalServerError('Categoria'),
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
      const categoriaObj =
        typeof doc.toObject === 'function' ? doc.toObject() : doc;

      return {
        ...categoriaObj,
      };
    });

    return resultado;
  }

  async atualizar(id, parsedData, req) {
    const categoria = await this.model
      .findOneAndUpdate({ _id: id }, parsedData, { new: true })
      .lean();
    if (!categoria) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Categoria',
        details: [],
        customMessage: messages.error.resourceNotFound('Categoria'),
      });
    }

    return categoria;
  }

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

    const categoria = await query;

    if (!categoria) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Categoria',
        details: [],
        customMessage: messages.error.resourceNotFound('Categoria'),
      });
    }

    return categoria;
  }
}

export default CategoriaRepository;
