import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/PaginationConfig.js';
import PatrimonioFilterBuilder from './PatrimonioFilterBuilder.js';
import PatrimonioModel, {
  type PatrimonioDocument,
  type IPatrimonioModel,
} from './PatrimonioModel.js';
import PatrimonioEventoModel from './PatrimonioEventoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class PatrimonioRepository {
  private model: IPatrimonioModel;

  constructor({
    patrimonioModel = PatrimonioModel,
  }: { patrimonioModel?: IPatrimonioModel } = {}) {
    this.model = patrimonioModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const patrimonio = new this.model(parsedData);
    const salvo = await patrimonio.save();
    return await this.model
      .findById(salvo._id)
      .populate('item')
      .populate('localizacao');
  }

  async criarMuitos(itens: Record<string, unknown>[]) {
    const salvos = await this.model.create(itens);
    const ids = salvos.map((doc) => doc._id);
    return await this.model
      .find({ _id: { $in: ids } })
      .populate('item')
      .populate('localizacao')
      .sort({ numero_patrimonio: 1 });
  }

  async listar(req: AuthenticatedRequest) {
    const id = req?.params?.['id'] ?? null;

    if (id) {
      const data = await this.model
        .findOne({ _id: id, ativo: true })
        .populate('item')
        .populate('localizacao');

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Patrimonio',
          details: [],
          customMessage: messages.error.resourceNotFound('Patrimônio'),
        });
      }

      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const {
      item,
      status,
      localizacao,
      numero_patrimonio,
      busca,
      categoria,
      ativo,
    } = query;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    // `comBusca`/`comCategoria` fazem lookup assíncrono em `itens`, então o
    // encadeamento fluente não serve mais aqui — cada passo precisa do
    // `await` para não devolver uma Promise em vez do builder.
    const filterBuilder = new PatrimonioFilterBuilder()
      .comItem(item ?? '')
      .comStatus(status ?? '')
      .comLocalizacao(localizacao ?? '')
      .comNumeroPatrimonio(numero_patrimonio ?? '')
      .comAtivo(ativo ?? 'true');
    await filterBuilder.comBusca(busca ?? '');
    await filterBuilder.comCategoria(categoria ?? '');
    const filtros = filterBuilder.build();

    const options = {
      page: parseInt(page, 10),
      limit: limite,
      populate: ['item', 'localizacao'],
      sort: { numero_patrimonio: 1 },
    };

    const resultado = await this.model.paginate(
      filtros as mongoose.FilterQuery<PatrimonioDocument>,
      options,
    );

    return {
      ...resultado,
      docs: resultado.docs.map((doc) => ({ ...doc.toObject() })),
    };
  }

  async buscarPorId(id: string, _req?: AuthenticatedRequest) {
    const patrimonio = await this.model
      .findOne({ _id: id })
      .populate('item')
      .populate('localizacao');

    if (!patrimonio) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Patrimonio',
        details: [],
        customMessage: messages.error.resourceNotFound('Patrimônio'),
      });
    }

    return patrimonio;
  }

  async atualizar(
    id: string,
    parsedData: Record<string, unknown>,
    _req?: AuthenticatedRequest,
  ) {
    const patrimonio = await this.model
      .findOneAndUpdate({ _id: id }, parsedData, { new: true })
      .populate('item')
      .populate('localizacao');

    if (!patrimonio) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Patrimonio',
        details: [],
        customMessage: messages.error.resourceNotFound('Patrimônio'),
      });
    }

    return patrimonio;
  }

  async buscarEventosPorPatrimonio(
    patrimonioId: string,
    req: AuthenticatedRequest,
  ) {
    const query = req.query as Record<string, string | undefined>;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const options = {
      page: parseInt(page, 10),
      limit: limite,
      sort: { data_hora: -1 },
      populate: [
        { path: 'usuario', select: 'nome email' },
        { path: 'localizacao_anterior', select: 'nome' },
        { path: 'localizacao_nova', select: 'nome' },
      ],
    };

    return await PatrimonioEventoModel.paginate(
      { patrimonio: patrimonioId },
      options,
    );
  }
}

export default PatrimonioRepository;
