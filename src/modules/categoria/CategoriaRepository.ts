import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import CategoriaFilterBuilder from './CategoriaFilterBuilder.js';
import CategoriaModel, { type CategoriaDocument } from './CategoriaModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class CategoriaRepository {
  private model: mongoose.PaginateModel<CategoriaDocument>;

  constructor({
    categoriaModel = CategoriaModel,
  }: { categoriaModel?: mongoose.PaginateModel<CategoriaDocument> } = {}) {
    this.model = categoriaModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const categoria = new this.model(parsedData);
    return await categoria.save();
  }

  async listar(req: AuthenticatedRequest) {
    const id = req?.params?.['id'] ?? null;

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

      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const nome = query['nome'];
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new CategoriaFilterBuilder().comNome(nome ?? '');

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
      limit: limite,
      sort: { nome: 1 },
    };

    const resultado = await this.model.paginate(
      filtros as mongoose.FilterQuery<CategoriaDocument>,
      options,
    );

    return { ...resultado, docs: resultado.docs.map((doc) => ({ ...doc.toObject() })) };
  }

  async atualizar(id: string, parsedData: Record<string, unknown>, _req?: AuthenticatedRequest) {
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

  async buscarPorNome(nome: string, idIgnorado?: string | null, _req?: AuthenticatedRequest) {
    const filtro: mongoose.FilterQuery<CategoriaDocument> = { nome, ativo: true };

    if (idIgnorado) {
      filtro['_id'] = { $ne: idIgnorado };
    }

    return await this.model.findOne(filtro);
  }

  async buscarPorId(id: string, _includeTokens = false, _req?: AuthenticatedRequest) {
    const categoria = await this.model.findOne({ _id: id, ativo: true });

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
