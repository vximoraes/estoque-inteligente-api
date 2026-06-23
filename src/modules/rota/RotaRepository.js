import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import RotaModel from './RotaModel.js';
import RotaFilterBuilder from './RotaFilterBuilder.js';
import { CustomError, messages } from '../../utils/helpers/index.js';

class RotaRepository {
  constructor({ rotaModel = RotaModel } = {}) {
    this.model = rotaModel;
  }

  async buscarPorId(id) {
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

  async listar(req) {
    const id = req?.params?.id || null;

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

    const {
      rota,
      dominio,
      ativo,
      buscar,
      enviar,
      substituir,
      modificar,
      excluir,
      page = 1,
    } = req.query;

    const limite = Math.min(parseInt(req.query.limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);

    const filterBuilder = new RotaFilterBuilder()
      .comRota(rota || '')
      .comDominio(dominio || '')
      .comAtivo(ativo || '')
      .comGet(buscar || '')
      .comPost(enviar || '')
      .comPut(substituir || '')
      .comPatch(modificar || '')
      .comDelete(excluir || '');

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

    const options = {
      page: parseInt(page),
      limit: parseInt(limite),
    };

    const data = await this.model.paginate(filtros, options);
    return data;
  }

  async criar(dados) {
    const rota = new this.model(dados);
    return await rota.save();
  }

  async atualizar(parsedData, id) {
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

  async deletar(id) {
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

  async buscarRotaPorNome(rota, idIgnorado = null) {
    const filtro = { rota: rota };
    if (idIgnorado) {
      filtro._id = { $ne: idIgnorado };
    }
    const data = await this.model.findOne(filtro);
    return data;
  }
}

export default RotaRepository;
