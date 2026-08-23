import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/PaginationConfig.js';
import UsuarioFilterBuilder from './UsuarioFilterBuilder.js';
import UsuarioModel, { type UsuarioDocument } from './UsuarioModel.js';
import NotificacaoModel from '../notificacao/NotificacaoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class UsuarioRepository {
  private model: mongoose.PaginateModel<UsuarioDocument>;

  constructor({
    usuarioModel = UsuarioModel,
  }: { usuarioModel?: mongoose.PaginateModel<UsuarioDocument> } = {}) {
    this.model = usuarioModel;
  }

  async criar(dadosUsuario: Record<string, unknown>) {
    const usuario = new this.model(dadosUsuario);
    return await usuario.save();
  }

  async listar(req: AuthenticatedRequest) {
    const id = req.params?.['id'] ?? null;

    if (id) {
      const data = await this.model.findById(id);

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Usuário',
          details: [],
          customMessage: messages.error.resourceNotFound('Usuário'),
        });
      }

      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const { nome, email, ativo } = query;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new UsuarioFilterBuilder()
      .comNome(nome ?? '')
      .comEmail(email ?? '')
      .comAtivo(ativo ?? '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.internalServerError('Usuário'),
      });
    }

    const filtros = filterBuilder.build();

    const options = {
      page: parseInt(page, 10),
      limit: limite,
      sort: { nome: 1 },
    };

    const resultado = await this.model.paginate(
      filtros as mongoose.FilterQuery<UsuarioDocument>,
      options,
    );

    resultado.docs = resultado.docs.map((doc) => {
      return (
        typeof doc.toObject === 'function'
          ? (doc.toObject() as unknown as UsuarioDocument)
          : doc
      ) as (typeof resultado.docs)[number];
    }) as unknown as typeof resultado.docs;

    return resultado;
  }

  async atualizar(
    id: string,
    parsedData: Record<string, unknown>,
    _usuarioId?: string,
  ) {
    const usuario = await this.model
      .findByIdAndUpdate(id, parsedData, { new: true })
      .lean();
    if (!usuario) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }
    return usuario;
  }

  async deletar(id: string, _usuarioId?: string) {
    const existeNotificacao = await NotificacaoModel.exists({ usuario: id });
    if (existeNotificacao) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'resourceInUse',
        field: 'Usuário',
        details: [],
        customMessage:
          'Não é possível deletar: usuário está vinculado a notificações.',
      });
    }

    const usuarioDeletado = await this.model.findByIdAndDelete(id);

    if (usuarioDeletado && mongoose.Types.ObjectId.isValid(id)) {
      const userId = new mongoose.Types.ObjectId(id);
      await mongoose.connection.db!.collection('account').deleteMany({
        userId,
      });
      await mongoose.connection.db!.collection('session').deleteMany({
        userId,
      });
    }

    return usuarioDeletado;
  }

  async buscarPorEmail(email: string, idIgnorado: string | null = null) {
    const filtro: mongoose.FilterQuery<UsuarioDocument> = { email };

    if (idIgnorado) {
      filtro['_id'] = { $ne: idIgnorado };
    }

    return await this.model.findOne(filtro);
  }

  async buscarPorId(id: string) {
    const user = await this.model.findById(id);

    if (!user) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }

    return user;
  }

  // Único ponto que popula grupos — usado pelo PermissionService pra avaliar permissão via grupo.
  async buscarPorIdComGrupos(id: string) {
    const user = await this.model.findById(id).populate('grupos');

    if (!user) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }

    return user;
  }
}

export default UsuarioRepository;
