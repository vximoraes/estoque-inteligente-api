import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/PaginationConfig.js';
import RotaModel, { type RotaDocument } from './RotaModel.js';
import RotaFilterBuilder from './RotaFilterBuilder.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class RotaRepository {
  private model: mongoose.PaginateModel<RotaDocument>;

  constructor({
    rotaModel = RotaModel,
  }: { rotaModel?: mongoose.PaginateModel<RotaDocument> } = {}) {
    this.model = rotaModel;
  }

  async buscarPorId(id: string) {
    const rota = await this.model.findById(id);
    if (!rota) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Rota',
        details: [],
        customMessage: messages.error.resourceNotFound('Rota'),
      });
    }
    return rota;
  }

  async listar(req: AuthenticatedRequest) {
    const id = req?.params?.['id'] ?? null;

    if (id) {
      const data = await this.model.findById(id);
      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Rotas',
          details: [],
          customMessage: messages.error.resourceNotFound('Rotas'),
        });
      }
      return data;
    }

    const query = req.query as Record<string, string | undefined>;
    const {
      rota,
      dominio,
      ativo,
      buscar,
      enviar,
      substituir,
      modificar,
      excluir,
      page = '1',
    } = query;

    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new RotaFilterBuilder()
      .comRota(rota ?? '')
      .comDominio(dominio ?? '')
      .comAtivo(ativo ?? '')
      .comGet(buscar ?? '')
      .comPost(enviar ?? '')
      .comPut(substituir ?? '')
      .comPatch(modificar ?? '')
      .comDelete(excluir ?? '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Rota',
        details: [],
        customMessage: messages.error.internalServerError('Rota'),
      });
    }

    const filtros = filterBuilder.build();
    const options = { page: parseInt(page), limit: limite };
    return await this.model.paginate(filtros, options);
  }

  async criar(dados: Record<string, unknown>) {
    const rota = new this.model(dados);
    return await rota.save();
  }

  async atualizar(parsedData: Record<string, unknown>, id: string) {
    const data = await this.model.findByIdAndUpdate(id, parsedData);
    if (!data) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Rota',
        details: [],
        customMessage: messages.error.resourceNotFound('Rota'),
      });
    }
    return data;
  }

  async deletar(id: string) {
    const data = await this.model.findByIdAndDelete(id);
    if (!data) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Rota',
        details: [],
        customMessage: messages.error.resourceNotFound('Rota'),
      });
    }
    return data;
  }

  async buscarRotaPorNome(
    rota: string | undefined,
    idIgnorado: string | null = null,
  ) {
    const filtro: Record<string, unknown> = { rota };
    if (idIgnorado) {
      filtro['_id'] = { $ne: idIgnorado };
    }
    return await this.model.findOne(filtro);
  }
}

export default RotaRepository;
