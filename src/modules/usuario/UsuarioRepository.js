import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import UsuarioFilterBuilder from './UsuarioFilterBuilder.js';
import UsuarioModel from './UsuarioModel.js';
import NotificacaoModel from '../notificacao/NotificacaoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';

class UsuarioRepository {
  constructor({ usuarioModel = UsuarioModel } = {}) {
    this.model = usuarioModel;
  }

  async criar(dadosUsuario) {
    const usuario = new this.model(dadosUsuario);
    return await usuario.save();
  }

  async listar(req) {
    const id = req.params.id || null;

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

      const dataWithStats = {
        ...data.toObject(),
      };

      return dataWithStats;
    }

    const { nome, email, ativo, page = 1 } = req.query;
    const limite = Math.min(parseInt(req.query.limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);

    const filterBuilder = new UsuarioFilterBuilder()
      .comNome(nome || '')
      .comEmail(email || '')
      .comAtivo(ativo || '');

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
      limit: parseInt(limite, 10),
      sort: { nome: 1 },
    };

    const resultado = await this.model.paginate(filtros, options);

    resultado.docs = resultado.docs.map((doc) => {
      const usuarioObj =
        typeof doc.toObject === 'function' ? doc.toObject() : doc;

      return {
        ...usuarioObj,
      };
    });

    return resultado;
  }

  async atualizar(id, parsedData) {
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

  async deletar(id) {
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

    const usuario = await this.model.findByIdAndDelete(id);
    return usuario;
  }

  async buscarPorEmail(email, idIgnorado = null) {
    const filtro = { email };

    if (idIgnorado) {
      filtro._id = { $ne: idIgnorado };
    }

    const documento = await this.model.findOne(filtro, '+senha');

    return documento;
  }

  async buscarPorId(id, includeTokens = false) {
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

  async armazenarTokens(id, accesstoken, refreshtoken) {
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

    const data = await documento.save();
    return data;
  }

  async buscarPorCodigoRecuperacao(codigo) {
    return await this.model.findOne({ codigo_recupera_senha: codigo });
  }

  async buscarPorTokenConvite(token) {
    return await this.model
      .findOne({ tokenConvite: token })
      .select('+tokenConvite +convidadoEm');
  }

  async atualizarSenha(id, senhaHash) {
    const usuario = await this.model.findByIdAndUpdate(
      id,
      {
        senha: senhaHash,
        tokenUnico: null,
        codigo_recupera_senha: null,
        exp_codigo_recupera_senha: null,
      },
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

  async buscarPorTokenUnico(token) {
    return await this.model
      .findOne({ tokenUnico: token })
      .select('+tokenUnico');
  }

  async removeToken(id) {
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
