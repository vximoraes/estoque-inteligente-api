import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import NotificacaoFilterBuilder from './NotificacaoFilterBuilder.js';
import NotificacaoModel from './NotificacaoModel.js';
import UsuarioModel from '../../models/Usuario.js';
import { CustomError, messages } from '../../utils/helpers/index.js';

class NotificacaoRepository {
  constructor({ notificacaoModel = NotificacaoModel } = {}) {
    this.model = notificacaoModel;
  }

  async buscarPorId(id, userId) {
    const notificacao = await this.model.findOne({ _id: id, usuario: userId });

    if (!notificacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Notificação',
        details: [],
        customMessage: messages.error.resourceNotFound('Notificação'),
      });
    }

    return notificacao;
  }

  async criar(parsedData) {
    if (parsedData.usuario) {
      const usuarioExiste = await UsuarioModel.exists({
        _id: parsedData.usuario,
      });
      if (!usuarioExiste) {
        throw new CustomError({
          statusCode: 400,
          errorType: 'invalidReference',
          field: 'usuario',
          details: [],
          customMessage: 'Usuário informado não existe.',
        });
      }
    }
    const notificacao = new this.model(parsedData);
    const saved = await notificacao.save();
    return await this.model.findById(saved._id);
  }

  async listar(user_id, req = {}) {
    const { params = {}, query = {} } = req;
    const id = params.id || null;

    if (id) {
      return await this.buscarPorId(id, user_id);
    }

    const { visualizada, page = 1, limite = 10 } = query;

    const filterBuilder = new NotificacaoFilterBuilder();
    filterBuilder.comUsuario(user_id);

    if (visualizada !== undefined) {
      filterBuilder.comVisualizada(visualizada);
    }

    const filtros = { ...filterBuilder.build(), ativo: true };

    const umDiaAtras = new Date();
    umDiaAtras.setDate(umDiaAtras.getDate() - 1);

    filtros.$or = [
      { visualizada: false },
      { visualizada: true, dataLeitura: { $gte: umDiaAtras } },
      { visualizada: true, dataLeitura: null },
    ];

    const options = {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT),
      sort: { data_hora: -1 },
    };

    return await this.model.paginate(filtros, options);
  }

  async marcarComoVisualizada(id, userId) {
    return this._atualizar(
      id,
      {
        visualizada: true,
        dataLeitura: new Date(),
      },
      userId,
    );
  }

  async inativar(id, userId) {
    return this._atualizar(
      id,
      {
        ativo: false,
      },
      userId,
    );
  }

  async marcarTodasComoVisualizadas(userId) {
    const agora = new Date();
    await this.model.updateMany(
      { usuario: userId, visualizada: false, ativo: true },
      { visualizada: true, dataLeitura: agora },
    );
  }

  async _atualizar(id, parsedData, userId) {
    const notificacao = await this.model.findOneAndUpdate(
      { _id: id, usuario: userId },
      parsedData,
      { new: true },
    );

    if (!notificacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Notificação',
        details: [],
        customMessage: messages.error.resourceNotFound('Notificação'),
      });
    }

    return notificacao;
  }
}

export default NotificacaoRepository;
