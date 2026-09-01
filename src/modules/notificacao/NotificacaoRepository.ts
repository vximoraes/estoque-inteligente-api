import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/paginationConfig.js';
import NotificacaoFilterBuilder from './NotificacaoFilterBuilder.js';
import NotificacaoModel, {
  type NotificacaoDocument,
} from './NotificacaoModel.js';
import UsuarioModel from '../usuario/UsuarioModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class NotificacaoRepository {
  private model: mongoose.PaginateModel<NotificacaoDocument>;

  constructor({
    notificacaoModel = NotificacaoModel,
  }: { notificacaoModel?: mongoose.PaginateModel<NotificacaoDocument> } = {}) {
    this.model = notificacaoModel;
  }

  async buscarPorId(id: string, userId: string | undefined) {
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

  async criar(parsedData: Record<string, unknown>) {
    if (parsedData['usuario']) {
      const usuarioExiste = await UsuarioModel.exists({
        _id: parsedData['usuario'],
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

  async listar(
    user_id: string | undefined,
    req: Partial<AuthenticatedRequest> = {},
  ) {
    const { params = {}, query = {} } = req;
    const id = (params as Record<string, string | undefined>)['id'] ?? null;

    if (id) {
      return await this.buscarPorId(id, user_id);
    }

    const q = query as Record<string, string | undefined>;
    const { visualizada, page = '1', limite = '10' } = q;

    const filterBuilder = new NotificacaoFilterBuilder();
    filterBuilder.comUsuario(user_id);

    if (visualizada !== undefined) {
      filterBuilder.comVisualizada(visualizada);
    }

    const filtros: mongoose.FilterQuery<NotificacaoDocument> = {
      ...filterBuilder.build(),
      ativo: true,
    };

    const umDiaAtras = new Date();
    umDiaAtras.setDate(umDiaAtras.getDate() - 1);

    filtros['$or'] = [
      { visualizada: false },
      { visualizada: true, dataLeitura: { $gte: umDiaAtras } },
      { visualizada: true, dataLeitura: null },
    ];

    const options = {
      page: parseInt(page, 10),
      limit: Math.min(
        parseInt(limite, 10) || PAGINATION_DEFAULT_LIMIT,
        PAGINATION_MAX_LIMIT,
      ),
      sort: { data_hora: -1 },
    };

    return await this.model.paginate(filtros, options);
  }

  async marcarComoVisualizada(id: string, userId: string | undefined) {
    return this._atualizar(
      id,
      { visualizada: true, dataLeitura: new Date() },
      userId,
    );
  }

  async inativar(id: string, userId: string | undefined) {
    return this._atualizar(id, { ativo: false }, userId);
  }

  async marcarTodasComoVisualizadas(userId: string | undefined) {
    const agora = new Date();
    await this.model.updateMany(
      { usuario: userId, visualizada: false, ativo: true },
      { visualizada: true, dataLeitura: agora },
    );
  }

  async _atualizar(
    id: string,
    parsedData: Record<string, unknown>,
    userId: string | undefined,
  ) {
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
