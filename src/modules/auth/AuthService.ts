import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { CustomError, HttpStatusCodes, messages } from '../../utils/helpers/index.js';
import tokenUtil from '../../utils/TokenUtil.js';
import AuthHelper from '../../utils/AuthHelper.js';
import UsuarioRepository from '../usuario/UsuarioRepository.js';
import EmailService from '../../utils/services/EmailService.js';

class AuthService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private TokenUtil: any;
  private repository: UsuarioRepository;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor({ tokenUtil: injectedTokenUtil }: { tokenUtil?: any } = {}) {
    this.TokenUtil = injectedTokenUtil ?? tokenUtil;
    this.repository = new UsuarioRepository();
  }

  async carregatokens(id: string, _token: string) {
    const data = await this.repository.buscarPorId(id, true);
    return { data };
  }

  async revoke(id: string) {
    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'id',
        details: [],
        customMessage: 'ID do usuário é obrigatório para revogar tokens.',
      });
    }

    await this.repository.buscarPorId(id);

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

  async logout(id: string) {
    const data = await this.repository.removeToken(id);
    return { data };
  }

  async login(body: { email: string; senha: string }) {
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

    const senhaValida = await bcrypt.compare(body.senha, userEncontrado.senha ?? '');
    if (!senhaValida) {
      throw new CustomError({
        statusCode: 401,
        errorType: 'unauthorized',
        field: 'Senha',
        details: [],
        customMessage: messages.error.unauthorized('Senha ou Email'),
      });
    }

    const accesstoken = await this.TokenUtil.generateAccessToken(userEncontrado._id);

    const userComTokens = await this.repository.buscarPorId(String(userEncontrado._id), true);
    let refreshtoken: string = userComTokens.refreshtoken ?? '';

    if (refreshtoken) {
      try {
        jwt.verify(refreshtoken, process.env['JWT_SECRET_REFRESH_TOKEN'] ?? '');
      } catch (error) {
        const err = error as Error;
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
          refreshtoken = await this.TokenUtil.generateRefreshToken(userEncontrado._id);
        } else {
          throw new CustomError({
            statusCode: 500,
            errorType: 'serverError',
            field: 'Token',
            details: [],
            customMessage: messages.error.unauthorized('falha na geração do token'),
          });
        }
      }
    } else {
      refreshtoken = await this.TokenUtil.generateRefreshToken(userEncontrado._id);
    }

    await this.repository.armazenarTokens(
      String(userEncontrado._id),
      accesstoken,
      refreshtoken,
    );

    const userLogado = await this.repository.buscarPorEmail(body.email);
    const userObjeto = (userLogado?.toObject() as unknown as Record<string, unknown>) ?? {};
    delete userObjeto['senha'];

    return { user: { accesstoken, refreshtoken, ...userObjeto } };
  }

  async recuperaSenha(body: { email: string }) {
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
    let codigoExistente = await this.repository.buscarPorCodigoRecuperacao(codigoRecuperaSenha);

    while (codigoExistente && tentativas < MAX_TENTATIVAS) {
      tentativas++;
      codigoRecuperaSenha = generateCode();
      codigoExistente = await this.repository.buscarPorCodigoRecuperacao(codigoRecuperaSenha);
    }

    if (codigoExistente) {
      codigoRecuperaSenha = Date.now().toString(36).slice(-6).toUpperCase();
    }

    const tokenUnico = await this.TokenUtil.generatePasswordRecoveryToken(userEncontrado._id);

    const expMs = Date.now() + 60 * 60 * 1000;
    const data = await this.repository.atualizar(String(userEncontrado._id), {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (EmailService as any).enviarEmailRecuperacaoSenha(
        userEncontrado.nome,
        userEncontrado.email,
        tokenUnico,
      );
    } catch {
      await this.repository.atualizar(String(userEncontrado._id), {
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
      message: 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.',
      email: userEncontrado.email,
    };
  }

  async atualizarSenhaToken(tokenRecuperacao: string, senhaBody: { senha?: string }) {
    const usuarioId = await this.TokenUtil.decodePasswordRecoveryToken(
      tokenRecuperacao,
      process.env['JWT_SECRET_PASSWORD_RECOVERY'],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const senhaHasheada = await (AuthHelper as any).hashPassword(senhaBody.senha);

    const usuario = await this.repository.buscarPorTokenUnico(tokenRecuperacao);
    if (!usuario) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        field: 'Token',
        details: [],
        customMessage: 'Token de recuperação já foi utilizado ou é inválido.',
      });
    }

    const usuarioAtualizado = await this.repository.atualizarSenha(usuarioId, senhaHasheada);
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

  async atualizarSenhaCodigo(codigoRecuperaSenha: string, senhaBody: { senha?: string }) {
    const user = await this.repository.buscarPorCodigoRecuperacao(codigoRecuperaSenha);
    if (!user) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        field: 'Código de Recuperação',
        details: [],
        customMessage: 'Código de recuperação inválido ou não encontrado.',
      });
    }

    const expField = user.exp_codigo_recupera_senha;
    if (expField && new Date(expField as string | Date) < new Date()) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        field: 'Código de Recuperação',
        details: [],
        customMessage: 'Código de recuperação expirado.',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const senhaHasheada = await (AuthHelper as any).hashPassword(senhaBody.senha);

    const atualizado = await this.repository.atualizarSenha(String(user._id), senhaHasheada);
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

  async refresh(id: string, token: string) {
    const userEncontrado = await this.repository.buscarPorId(id, true);

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

    let refreshtoken: string;
    if (process.env['SINGLE_SESSION_REFRESH_TOKEN'] === 'true') {
      refreshtoken = await this.TokenUtil.generateRefreshToken(id);
    } else {
      refreshtoken = userEncontrado.refreshtoken ?? '';
    }

    await this.repository.armazenarTokens(id, accesstoken, refreshtoken);

    const userLogado = await this.repository.buscarPorId(id, true);
    const userObjeto = userLogado.toObject() as unknown as Record<string, unknown>;
    delete userObjeto['senha'];

    return { user: { accesstoken, refreshtoken, ...userObjeto } };
  }
}

export default AuthService;
