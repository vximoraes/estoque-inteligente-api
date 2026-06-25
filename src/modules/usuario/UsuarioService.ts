import bcrypt from 'bcrypt';
import UsuarioRepository from './UsuarioRepository.js';
import GrupoRepository from '../grupo/GrupoRepository.js';
import { CustomError, HttpStatusCodes, messages } from '../../utils/helpers/index.js';
import minioClient from '../../config/MinIO.js';
import compress from '../../config/SharpConfig.js';
import EmailService from '../../utils/services/EmailService.js';
import tokenUtil from '../../utils/TokenUtil.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Usuario, UsuarioUpdate } from './UsuarioSchema.js';
import type { IGrupoPermissao } from '../grupo/GrupoModel.js';

class UsuarioService {
  private repository: UsuarioRepository;
  private grupoRepository: GrupoRepository;

  constructor() {
    this.repository = new UsuarioRepository();
    this.grupoRepository = new GrupoRepository();
  }

  async criar(parsedData: Partial<Usuario> & Record<string, unknown>, req?: AuthenticatedRequest) {
    const userId = req?.user_id ?? null;
    await this.validateEmail(parsedData['email'] as string, null, userId);

    if (parsedData['senha']) {
      const saltRounds = 10;
      parsedData['senha'] = await bcrypt.hash(parsedData['senha'] as string, saltRounds);
    }

    if (!parsedData['permissoes'] || (parsedData['permissoes'] as unknown[]).length === 0) {
      try {
        const grupoUsuario = await this.grupoRepository.buscarPorNome('Usuario');
        if (grupoUsuario) {
          parsedData['permissoes'] = grupoUsuario.permissoes as unknown as IGrupoPermissao[];
        }
      } catch (error) {
        console.warn(
          'Nao foi possivel buscar o grupo "Usuario" padrao:',
          (error as Error).message,
        );
      }
    }

    parsedData['usuarioId'] = userId;
    return await this.repository.criar(parsedData);
  }

  async listar(req: AuthenticatedRequest) {
    return this.repository.listar(req);
  }

  async atualizar(id: string, parsedData: UsuarioUpdate, req: AuthenticatedRequest) {
    const data = parsedData as Record<string, unknown>;
    delete data['senha'];
    delete data['email'];

    await this.ensureUserExists(id);

    return this.repository.atualizar(id, data, req.user_id);
  }

  async deletar(id: string, req: AuthenticatedRequest) {
    await this.ensureUserExists(id);
    return this.repository.deletar(id, req.user_id);
  }

  async validateEmail(email: string, id: string | null = null, _usuarioId?: string | null) {
    const usuarioExistente = await this.repository.buscarPorEmail(email, id);
    if (usuarioExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'email',
        details: [{ path: 'email', message: 'Email já está em uso.' }],
        customMessage: 'Email já está em uso.',
      });
    }
  }

  async ensureUserExists(id: string) {
    const usuarioExistente = await this.repository.buscarPorId(id);
    if (!usuarioExistente) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }
    return usuarioExistente;
  }

  async uploadFoto(req: AuthenticatedRequest, id: string) {
    const file = req.file;
    if (!file) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'badRequest',
        field: 'Foto',
        details: [
          {
            path: 'Foto',
            message: 'Nenhum arquivo foi enviado ou o arquivo está vazio.',
          },
        ],
        customMessage: 'Nenhum arquivo foi enviado ou o arquivo está vazio.',
      });
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new CustomError({
        statusCode: HttpStatusCodes.PAYLOAD_TOO_LARGE.code,
        errorType: 'payloadTooLarge',
        field: 'Imagem',
        details: [{ path: 'Imagem', message: 'Arquivo é superior a 5 MB' }],
        customMessage: 'O arquivo é maior do que 5 MB.',
      });
    }
    try {
      const data = await this.repository.atualizar(id, {
        fotoPerfil: `${process.env['MINIO_PUBLIC_URL']}/${process.env['MINIO_BUCKET']}/${id}.jpeg`,
      });
      const newFile = await compress(file.buffer);
      const objectName = `${id}.jpeg`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (minioClient as any).putObject(process.env['MINIO_BUCKET'], objectName, newFile, {
        'Content-Type': 'image/jpeg',
      });
      return { fotoPerfil: (data as Record<string, unknown>)['fotoPerfil'] };
    } catch (err) {
      throw new Error(String(err));
    }
  }

  async deletarFoto(_req: AuthenticatedRequest, id: string) {
    const objectName = `${id}.jpeg`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (minioClient as any).removeObject(process.env['MINIO_BUCKET'], objectName);
    const data = await this.repository.atualizar(id, { fotoPerfil: '' });
    return { fotoPerfil: (data as Record<string, unknown>)['fotoPerfil'] };
  }

  async convidarUsuario(nome: string, email: string) {
    await this.validateEmail(email, null, null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenConvite = await (tokenUtil as any).generateInviteToken(email);
    const convidadoEm = new Date();

    const novoUsuario = await this.repository.criar({
      nome,
      email,
      tokenConvite,
      convidadoEm,
      ativo: false,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (EmailService as any).enviarEmailConvite(nome, email, tokenConvite);
    } catch (error) {
      await this.repository.deletar(String(novoUsuario._id));
      throw error;
    }

    return {
      message: 'Convite enviado com sucesso!',
      usuario: {
        id: novoUsuario._id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        convidadoEm: novoUsuario.convidadoEm,
      },
    };
  }

  async ativarConta(token: string, senha: string | undefined) {
    let emailDoToken: string;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = await (tokenUtil as any).decodeInviteToken(token);
      emailDoToken = (decoded as { email: string }).email;
    } catch {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: 'invalidToken',
        field: 'Token',
        details: [],
        customMessage: 'Token de convite inválido ou expirado.',
      });
    }

    void emailDoToken;

    const usuario = await this.repository.buscarPorTokenConvite(token);

    if (!usuario) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: 'resourceNotFound',
        field: 'Token',
        details: [],
        customMessage: 'Token de convite inválido ou já utilizado.',
      });
    }

    if (usuario.ativo && usuario.ativadoEm) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'accountAlreadyActivated',
        field: 'Token',
        details: [],
        customMessage: 'Esta conta já foi ativada. Faça login para acessar o sistema.',
      });
    }

    if (!usuario.convidadoEm) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'invalidInvitation',
        field: 'Token',
        details: [],
        customMessage: 'Convite inválido. Solicite um novo convite ao administrador.',
      });
    }

    const minutosDesdeConvite =
      (new Date().getTime() - new Date(usuario.convidadoEm).getTime()) / (1000 * 60);
    if (minutosDesdeConvite > 5) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: 'tokenExpired',
        field: 'Token',
        details: [],
        customMessage: 'Token de convite expirado. Solicite um novo convite ao administrador.',
      });
    }

    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha ?? '', saltRounds);

    let permissoes: IGrupoPermissao[] = [];
    try {
      const grupoUsuario = await this.grupoRepository.buscarPorNome('Usuario');
      if (grupoUsuario) {
        permissoes = grupoUsuario.permissoes;
      }
    } catch (error) {
      console.warn(
        'Nao foi possivel buscar o grupo "Usuario" padrao:',
        (error as Error).message,
      );
    }

    const usuarioAtualizado = await this.repository.atualizar(String(usuario._id), {
      senha: senhaHash,
      ativo: true,
      ativadoEm: new Date(),
      tokenConvite: null,
      convidadoEm: null,
      permissoes: permissoes as unknown as Record<string, unknown>[],
    });

    const u = usuarioAtualizado as Record<string, unknown>;

    return {
      message: 'Conta ativada com sucesso! Você já pode fazer login.',
      usuario: {
        id: u['_id'],
        nome: u['nome'],
        email: u['email'],
      },
    };
  }

  async reenviarConvite(id: string) {
    const usuario = await this.repository.buscarPorId(id);

    if (usuario.ativo && usuario.ativadoEm) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'Usuário',
        details: [],
        customMessage: 'Este usuário já ativou sua conta.',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenConvite = await (tokenUtil as any).generateInviteToken(usuario.email);
    const convidadoEm = new Date();

    await this.repository.atualizar(String(usuario._id), {
      tokenConvite,
      convidadoEm,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (EmailService as any).enviarEmailConvite(usuario.nome, usuario.email, tokenConvite);

    return { message: 'Convite reenviado com sucesso!' };
  }
}

export default UsuarioService;
