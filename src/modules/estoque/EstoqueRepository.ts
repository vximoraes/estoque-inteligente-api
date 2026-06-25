import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import EstoqueModel, { type EstoqueDocument, type IEstoqueModel } from './EstoqueModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class EstoqueRepository {
  private model: IEstoqueModel;

  constructor({ estoqueModel = EstoqueModel }: { estoqueModel?: IEstoqueModel } = {}) {
    this.model = estoqueModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const estoque = new this.model(parsedData);
    const estoqueSalvo = await estoque.save();
    return await this.model.findById(estoqueSalvo._id).populate('item').populate('localizacao');
  }

  async listar(req: AuthenticatedRequest) {
    const query = req.query as Record<string, string | undefined>;
    const { item, localizacao, quantidade, page = '1' } = query;
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filtros: Record<string, unknown> = {};

    if (item) filtros['item'] = item;
    if (localizacao) filtros['localizacao'] = localizacao;
    if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
      const num = Number(quantidade);
      if (!isNaN(num)) filtros['quantidade'] = num;
    }

    const options = {
      page: parseInt(page),
      limit: limite,
      populate: ['item', 'localizacao'],
      sort: { createdAt: -1 },
    };

    return await this.model.paginate(filtros as mongoose.FilterQuery<EstoqueDocument>, options);
  }

  async listarPorItem(req: AuthenticatedRequest) {
    const itemId = req.params['itemId'] as string;
    const query = req.query as Record<string, string | undefined>;
    const { localizacao, quantidade, page = '1' } = query;
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filtros: Record<string, unknown> = { item: itemId };

    if (localizacao) filtros['localizacao'] = localizacao;
    if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
      const num = Number(quantidade);
      if (!isNaN(num)) filtros['quantidade'] = num;
    }

    const options = {
      page: parseInt(page),
      limit: limite,
      populate: ['item', 'localizacao'],
      sort: { createdAt: -1 },
    };

    return await this.model.paginate(filtros as mongoose.FilterQuery<EstoqueDocument>, options);
  }

  async atualizar(id: string, parsedData: Record<string, unknown>, _req?: AuthenticatedRequest) {
    const estoque = await this.model
      .findOneAndUpdate({ _id: id }, parsedData, { new: true })
      .populate('item')
      .populate('localizacao')
      .lean();

    if (!estoque) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Estoque',
        details: [],
        customMessage: messages.error.resourceNotFound('Estoque'),
      });
    }
    return estoque;
  }

  async deletar(id: string, _req?: AuthenticatedRequest) {
    const estoque = await this.model.findOne({ _id: id }).populate('item').populate('localizacao');
    if (!estoque) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Estoque',
        details: [],
        customMessage: messages.error.resourceNotFound('Estoque'),
      });
    }
    await this.model.findOneAndDelete({ _id: id });
    return estoque;
  }

  async buscarPorId(id: string, _req?: AuthenticatedRequest) {
    const estoque = await this.model.findOne({ _id: id }).populate('item').populate('localizacao');
    if (!estoque) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Estoque',
        details: [],
        customMessage: messages.error.resourceNotFound('Estoque'),
      });
    }
    return estoque;
  }
}

export default EstoqueRepository;
