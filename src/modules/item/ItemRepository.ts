import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/PaginationConfig.js';
import ItemFilterBuilder from './ItemFilterBuilder.js';
import ItemModel, { type ItemDocument } from './ItemModel.js';
import MovimentacaoModel from '../movimentacao/MovimentacaoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class ItemRepository {
  private model: mongoose.PaginateModel<ItemDocument>;

  constructor({
    itemModel = ItemModel,
  }: { itemModel?: mongoose.PaginateModel<ItemDocument> } = {}) {
    this.model = itemModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const item = new this.model(parsedData);
    const itemSalvo = await item.save();
    return await this.model.findById(itemSalvo._id).populate('categoria');
  }

  async listar(req: AuthenticatedRequest) {
    const id = req?.params?.['id'] ?? null;

    if (id) {
      const data = await this.model
        .findOne({ _id: id, ativo: true })
        .populate('categoria');

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Item',
          details: [],
          customMessage: messages.error.resourceNotFound('Item'),
        });
      }

      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const { nome, tipo, quantidade, estoque_minimo, categoria, ativo, status } =
      query;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new ItemFilterBuilder()
      .comNome(nome ?? '')
      .comTipo(tipo ?? '')
      .comQuantidade(quantidade ?? '')
      .comEstoqueMinimo(estoque_minimo ?? '')
      .comAtivo(ativo ?? 'true')
      .comStatus(status ?? '');

    await filterBuilder.comCategoria(categoria ?? '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Item',
        details: [],
        customMessage: messages.error.internalServerError('Item'),
      });
    }

    const filtros = { ...filterBuilder.build() };

    const options = {
      page: parseInt(page, 10),
      limit: limite,
      populate: ['categoria'],
      sort: { nome: 1 },
    };

    const resultado = await this.model.paginate(
      filtros as mongoose.FilterQuery<ItemDocument>,
      options,
    );

    return {
      ...resultado,
      docs: resultado.docs.map((doc) => ({ ...doc.toObject() })),
    };
  }

  async stats(req: AuthenticatedRequest) {
    const query = req.query as Record<string, string | undefined>;
    const { tipo, categoria, status, ativo = 'true' } = query;

    const filterBuilder = new ItemFilterBuilder()
      .comAtivo(ativo ?? 'true')
      .comNome('')
      .comTipo(tipo ?? '')
      .comQuantidade('')
      .comEstoqueMinimo('')
      .comStatus(status ?? '');

    await filterBuilder.comCategoria(categoria ?? '');

    const filtros = { ...filterBuilder.build() };

    const resultado = (await this.model.aggregate([
      { $match: filtros },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])) as Array<{ _id: string; count: number }>;

    const totalItens = await this.model.countDocuments(
      filtros as mongoose.FilterQuery<ItemDocument>,
    );

    const stats = {
      totalItens,
      emEstoque: 0,
      baixoEstoque: 0,
      indisponiveis: 0,
    };

    for (const row of resultado) {
      if (row._id === 'Em Estoque') stats.emEstoque = row.count;
      else if (row._id === 'Baixo Estoque') stats.baixoEstoque = row.count;
      else if (row._id === 'Indisponível') stats.indisponiveis = row.count;
    }

    return stats;
  }

  async atualizar(
    id: string,
    parsedData: Record<string, unknown>,
    _req?: AuthenticatedRequest,
  ) {
    const item = await this.model
      .findOneAndUpdate({ _id: id }, parsedData, { new: true })
      .populate('categoria')
      .lean();

    if (!item) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: messages.error.resourceNotFound('Item'),
      });
    }

    return item;
  }

  async deletar(id: string, _req?: AuthenticatedRequest) {
    const existeMovimentacao = await MovimentacaoModel.exists({ item: id });
    if (existeMovimentacao) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'resourceInUse',
        field: 'Item',
        details: [],
        customMessage:
          'Não é possível deletar: item está vinculado a movimentações.',
      });
    }

    const item = await this.model.findOne({ _id: id }).populate('categoria');

    if (!item) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: messages.error.resourceNotFound('Item'),
      });
    }

    await this.model.findOneAndDelete({ _id: id });
    return item;
  }

  async buscarPorId(
    id: string,
    _includeTokens = false,
    _req?: AuthenticatedRequest,
  ) {
    const item = await this.model.findOne({ _id: id }).populate('categoria');

    if (!item) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: messages.error.resourceNotFound('Item'),
      });
    }

    return item;
  }

  async buscarPorNome(
    nome: string,
    idIgnorado?: string | null,
    _req?: AuthenticatedRequest,
  ) {
    const filtro: mongoose.FilterQuery<ItemDocument> = { nome, ativo: true };

    if (idIgnorado) {
      filtro['_id'] = { $ne: idIgnorado };
    }

    return await this.model.findOne(filtro).populate('categoria');
  }
}

export default ItemRepository;
