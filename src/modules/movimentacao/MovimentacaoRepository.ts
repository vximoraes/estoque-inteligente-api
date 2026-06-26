import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import MovimentacaoFilterBuilder from './MovimentacaoFilterBuilder.js';
import MovimentacaoModel, { type MovimentacaoDocument, type IMovimentacaoModel } from './MovimentacaoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class MovimentacaoRepository {
  private model: IMovimentacaoModel;

  constructor({
    movimentacaoModel = MovimentacaoModel,
  }: { movimentacaoModel?: IMovimentacaoModel } = {}) {
    this.model = movimentacaoModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const movimentacao = new this.model(parsedData);
    const movimentacaoSalva = await movimentacao.save();

    return await this.model
      .findById(movimentacaoSalva._id)
      .populate('item')
      .populate('localizacao');
  }

  async listar(req: AuthenticatedRequest) {
    const id = req?.params?.['id'] ?? null;

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

      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const { tipo, data, quantidade, item, localizacao } = query;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new MovimentacaoFilterBuilder()
      .comTipo(tipo ?? '')
      .comData(data ?? '')
      .comQuantidade(quantidade ?? '');

    await filterBuilder.comItem(item ?? '');
    await filterBuilder.comLocalizacao(localizacao ?? '');

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
      page: parseInt(page, 10),
      limit: limite,
      populate: ['item', 'localizacao'],
      sort: { data_hora: -1 },
    };

    const resultado = await this.model.paginate(
      filtros as mongoose.FilterQuery<MovimentacaoDocument>,
      options,
    );

    return { ...resultado, docs: resultado.docs.map((doc) => ({ ...doc.toObject() })) };
  }

  async buscarPorId(id: string, _includeTokens = false, _req?: AuthenticatedRequest) {
    const movimentacao = await this.model.findOne({ _id: id });

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
