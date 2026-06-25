import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import UsuarioFilterBuilder from './UsuarioFilterBuilder.js';
import UsuarioModel, { type UsuarioDocument } from './UsuarioModel.js';
import NotificacaoModel from '../notificacao/NotificacaoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
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
      return (typeof doc.toObject === 'function'
        ? (doc.toObject() as unknown as UsuarioDocument)
        : doc) as (typeof resultado.docs)[number];
    }) as unknown as typeof resultado.docs;

    return resultado;
  }

  async atualizar(id: string, parsedData: Record<string, unknown>, _usuarioId?: string) {
    const usuario = await this.model.findByIdAndUpdate(id, parsedData, { new: true }).lean();
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
        customMessage: 'Não é possível deletar: usuário está vinculado a notificações.',
      });
    }

    return await this.model.findByIdAndDelete(id);
  }

  async buscarPorEmail(email: string, idIgnorado: string | null = null) {
    const filtro: mongoose.FilterQuery<UsuarioDocument> = { email };

    if (idIgnorado) {
      filtro['_id'] = { $ne: idIgnorado };
    }

    return await this.model.findOne(filtro, '+senha');
  }

  async buscarPorId(id: string, includeTokens = false) {
    let query = this.model.findById(id);

    if (includeTokens) {
      query = query.select('+refreshtoken +accesstoken');
    }

    const user = await query;

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

  async armazenarTokens(id: string, accesstoken: string, refreshtoken: string) {
    const documento = await this.model.findById(id);
    if (!documento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }

    documento.accesstoken = accesstoken;
    documento.refreshtoken = refreshtoken;

    return await documento.save();
  }

  async buscarPorCodigoRecuperacao(codigo: string) {
    return await this.model.findOne({ codigo_recupera_senha: codigo } as mongoose.FilterQuery<UsuarioDocument>);
  }

  async buscarPorTokenConvite(token: string) {
    return await this.model
      .findOne({ tokenConvite: token })
      .select('+tokenConvite +convidadoEm');
  }

  async atualizarSenha(id: string, senhaHash: string) {
    const usuario = await this.model.findByIdAndUpdate(
      id,
      {
        senha: senhaHash,
        tokenUnico: null,
        codigo_recupera_senha: null,
        exp_codigo_recupera_senha: null,
      } as mongoose.UpdateQuery<UsuarioDocument>,
      { new: true },
    );

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

  async buscarPorTokenUnico(token: string) {
    return await this.model.findOne({ tokenUnico: token }).select('+tokenUnico');
  }

  async removeToken(id: string) {
    const usuarioExistente = await this.model.findById(id);
    if (!usuarioExistente) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }

    usuarioExistente.accesstoken = null;
    usuarioExistente.refreshtoken = null;

    await usuarioExistente.save();
    return usuarioExistente;
  }
}

export default UsuarioRepository;
