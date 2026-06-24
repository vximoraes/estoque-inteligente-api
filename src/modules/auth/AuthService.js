import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  CustomError,
  HttpStatusCodes,
  messages,
} from '../../utils/helpers/index.js';
import tokenUtil from '../../utils/TokenUtil.js';
import AuthHelper from '../../utils/AuthHelper.js';

import UsuarioRepository from '../usuario/UsuarioRepository.js';
import EmailService from '../../services/EmailService.js';

class AuthService {
  constructor({ tokenUtil: injectedTokenUtil } = {}) {
    this.TokenUtil = injectedTokenUtil || tokenUtil;
    this.repository = new UsuarioRepository();
  }

  async carregatokens(id, token) {
    const data = await this.repository.buscarPorId(id, { includeTokens: true });
    return { data };
  }

  async revoke(id) {
    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'id',
        details: [],
        customMessage: 'ID do usuário é obrigatório para revogar tokens.',
      });
    }

    const usuario = await this.repository.buscarPorId(id);
    if (!usuario) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: 'notFound',
        field: 'Usuário',
        details: [],
        customMessage: 'Usuário não encontrado para revogação de tokens.',
      });
    }

    const data = await this.repository.removeToken(id);
    if (!data) {
      throw new CustomError({
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
        errorType: 'serverError',
        field: 'Token',
        details: [],
        customMessage: 'Erro ao revogar tokens do usuário.',
      });
    }

    return { message: 'Tokens revogados com sucesso.' };
  }

  async logout(id) {
    const data = await this.repository.removeToken(id);
    return { data };
  }

  async login(body) {
    const userEncontrado = await this.repository.buscarPorEmail(body.email);
    if (!userEncontrado) {
      throw new CustomError({
        statusCode: 401,
        errorType: 'notFound',
        field: 'Email',
        details: [],
        customMessage: messages.error.unauthorized('Senha ou Email'),
      });
    }

    const senhaValida = await bcrypt.compare(body.senha, userEncontrado.senha);
    if (!senhaValida) {
      throw new CustomError({
        statusCode: 401,
        errorType: 'unauthorized',
        field: 'Senha',
        details: [],
        customMessage: messages.error.unauthorized('Senha ou Email'),
      });
    }

    const accesstoken = await this.TokenUtil.generateAccessToken(
      userEncontrado._id,
    );

    const userComTokens = await this.repository.buscarPorId(
      userEncontrado._id,
      true,
    );
    let refreshtoken = userComTokens.refreshtoken;

    if (refreshtoken) {
      try {
        jwt.verify(refreshtoken, process.env.JWT_SECRET_REFRESH_TOKEN);
      } catch (error) {
        if (
          error.name === 'TokenExpiredError' ||
          error.name === 'JsonWebTokenError'
        ) {
          refreshtoken = await this.TokenUtil.generateRefreshToken(
            userEncontrado._id,
          );
        } else {
          throw new CustomError({
            statusCode: 500,
            errorType: 'serverError',
            field: 'Token',
            details: [],
            customMessage: messages.error.unauthorized(
              'falha na geração do token',
            ),
          });
        }
      }
    } else {
      refreshtoken = await this.TokenUtil.generateRefreshToken(
        userEncontrado._id,
      );
    }

    await this.repository.armazenarTokens(
      userEncontrado._id,
      accesstoken,
      refreshtoken,
    );

    const userLogado = await this.repository.buscarPorEmail(body.email);
    delete userLogado.senha;
    const userObjeto = userLogado.toObject();

    return { user: { accesstoken, refreshtoken, ...userObjeto } };
  }

  async recuperaSenha(body) {
    const userEncontrado = await this.repository.buscarPorEmail(body.email);

    if (!userEncontrado) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        field: 'Email',
        details: [],
        customMessage: HttpStatusCodes.NOT_FOUND.message,
      });
    }

    const generateCode = () =>
      Math.random()
        .toString(36)
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 6)
        .toUpperCase();

    let codigoRecuperaSenha = generateCode();

    let tentativas = 0;
    const MAX_TENTATIVAS = 10;
    let codigoExistente =
      await this.repository.buscarPorCodigoRecuperacao(codigoRecuperaSenha);

    while (codigoExistente && tentativas < MAX_TENTATIVAS) {
      tentativas++;
      codigoRecuperaSenha = generateCode();
      codigoExistente =
        await this.repository.buscarPorCodigoRecuperacao(codigoRecuperaSenha);
    }

    if (codigoExistente) {
      codigoRecuperaSenha = Date.now().toString(36).slice(-6).toUpperCase();
    }

    const tokenUnico = await this.TokenUtil.generatePasswordRecoveryToken(
      userEncontrado._id,
    );

    const expMs = Date.now() + 60 * 60 * 1000;
    const data = await this.repository.atualizar(userEncontrado._id, {
      tokenUnico,
      codigo_recupera_senha: codigoRecuperaSenha,
      exp_codigo_recupera_senha: new Date(expMs).toISOString(),
    });

    if (!data) {
      throw new CustomError({
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
        field: 'Recuperação de Senha',
        details: [],
        customMessage: HttpStatusCodes.INTERNAL_SERVER_ERROR.message,
      });
    }

    try {
      await EmailService.enviarEmailRecuperacaoSenha(
        userEncontrado.nome,
        userEncontrado.email,
        tokenUnico,
      );
    } catch (error) {
      await this.repository.atualizar(userEncontrado._id, {
        tokenUnico: null,
        codigo_recupera_senha: null,
        exp_codigo_recupera_senha: null,
      });
      throw new CustomError({
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
        field: 'E-mail',
        details: [],
        customMessage:
          'Erro ao enviar e-mail de recuperação de senha. Tente novamente mais tarde.',
      });
    }

    return {
      message:
        'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.',
      email: userEncontrado.email,
    };
  }

  async atualizarSenhaToken(tokenRecuperacao, senhaBody) {
    const usuarioId = await this.TokenUtil.decodePasswordRecoveryToken(
      tokenRecuperacao,
      process.env.JWT_SECRET_PASSWORD_RECOVERY,
    );

    const senhaHasheada = await AuthHelper.hashPassword(senhaBody.senha);

    const usuario = await this.repository.buscarPorTokenUnico(tokenRecuperacao);
    if (!usuario) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        field: 'Token',
        details: [],
        customMessage: 'Token de recuperação já foi utilizado ou é inválido.',
      });
    }

    const usuarioAtualizado = await this.repository.atualizarSenha(
      usuarioId,
      senhaHasheada,
    );
    if (!usuarioAtualizado) {
      throw new CustomError({
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
        field: 'Senha',
        details: [],
        customMessage: 'Erro ao atualizar a senha.',
      });
    }

    return { message: 'Senha atualizada com sucesso.' };
  }

  async atualizarSenhaCodigo(codigoRecuperaSenha, senhaBody) {
    const user =
      await this.repository.buscarPorCodigoRecuperacao(codigoRecuperaSenha);
    if (!user) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        field: 'Código de Recuperação',
        details: [],
        customMessage: 'Código de recuperação inválido ou não encontrado.',
      });
    }

    if (user.exp_codigo_recupera_senha < new Date()) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        field: 'Código de Recuperação',
        details: [],
        customMessage: 'Código de recuperação expirado.',
      });
    }

    const senhaHasheada = await AuthHelper.hashPassword(senhaBody.senha);

    const atualizado = await this.repository.atualizarSenha(
      user._id,
      senhaHasheada,
    );
    if (!atualizado) {
      throw new CustomError({
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
        field: 'Senha',
        details: [],
        customMessage: 'Erro ao atualizar a senha.',
      });
    }

    return { message: 'Senha atualizada com sucesso.' };
  }

  async refresh(id, token) {
    const userEncontrado = await this.repository.buscarPorId(id, {
      includeTokens: true,
    });

    if (!userEncontrado) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        field: 'Token',
        details: [],
        customMessage: HttpStatusCodes.NOT_FOUND.message,
      });
    }

    if (userEncontrado.refreshtoken !== token) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: 'invalidToken',
        field: 'Token',
        details: [],
        customMessage: messages.error.unauthorized('Token'),
      });
    }

    const accesstoken = await this.TokenUtil.generateAccessToken(id);

    let refreshtoken = '';
    if (process.env.SINGLE_SESSION_REFRESH_TOKEN === 'true') {
      refreshtoken = await this.TokenUtil.generateRefreshToken(id);
    } else {
      refreshtoken = userEncontrado.refreshtoken;
    }

    await this.repository.armazenarTokens(id, accesstoken, refreshtoken);

    const userLogado = await this.repository.buscarPorId(id, {
      includeTokens: true,
    });
    delete userLogado.senha;
    const userObjeto = userLogado.toObject();

    const userComTokens = {
      accesstoken,
      refreshtoken,
      ...userObjeto,
    };

    return { user: userComTokens };
  }
}

export default AuthService;
