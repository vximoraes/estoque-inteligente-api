import mongoose from 'mongoose';
import UsuarioRepository from './UsuarioRepository.js';
import {
  CustomError,
  HttpStatusCodes,
  messages,
} from '../../utils/helpers/index.js';
import minioClient from '../../config/MinIO.js';
import compress from '../../config/SharpConfig.js';
import { getAuth } from '../../config/auth.js';
import { ativarUsuarioPadrao } from './ativarUsuarioPadrao.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { UsuarioUpdate } from './UsuarioSchema.js';

class UsuarioService {
  private repository: UsuarioRepository;

  constructor() {
    this.repository = new UsuarioRepository();
  }

  async listar(req: AuthenticatedRequest) {
    return this.repository.listar(req);
  }

  async atualizar(
    id: string,
    parsedData: UsuarioUpdate,
    req: AuthenticatedRequest,
  ) {
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

  async validateEmail(email: string, id: string | null = null) {
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
      await minioClient.putObject(
        process.env['MINIO_BUCKET']!,
        objectName,
        newFile,
        newFile.length,
        { 'Content-Type': 'image/jpeg' },
      );
      return { fotoPerfil: (data as Record<string, unknown>)['fotoPerfil'] };
    } catch (err) {
      throw new Error(String(err));
    }
  }

  async deletarFoto(_req: AuthenticatedRequest, id: string) {
    const objectName = `${id}.jpeg`;
    await minioClient.removeObject(process.env['MINIO_BUCKET']!, objectName);
    const data = await this.repository.atualizar(id, { fotoPerfil: '' });
    return { fotoPerfil: (data as Record<string, unknown>)['fotoPerfil'] };
  }

  async convidarUsuario(nome: string, email: string) {
    const emailNormalizado = email.toLowerCase();
    await this.validateEmail(emailNormalizado, null);

    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

    // Cria conta no Better Auth (senha aleatória, usuário definirá a sua ao ativar)
    const authResult = await getAuth().api.signUpEmail({
      body: {
        email: emailNormalizado,
        name: nome,
        password: crypto.randomUUID(),
      },
    });

    const userId = authResult.user.id;

    // Marca como pendente de ativação
    await this.repository.atualizar(userId, { convidadoEm: new Date() });

    // Gera token de reset e dispara email de convite via sendResetPassword callback
    try {
      await getAuth().api.requestPasswordReset({
        body: {
          email: emailNormalizado,
          redirectTo: `${frontendUrl}/ativar-conta`,
        },
      });
    } catch (error) {
      // Limpa o usuário criado se o envio do convite falhar
      await this.repository.deletar(userId);
      await mongoose.connection
        .db!.collection('account')
        .deleteMany({ userId });
      throw error;
    }

    const usuario = await this.repository.buscarPorId(userId);

    return {
      message: 'Convite enviado com sucesso!',
      usuario: {
        _id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        ativo: usuario.ativo,
        convidadoEm: usuario.convidadoEm,
      },
    };
  }

  async ativarConta(token: string, senha: string) {
    const db = mongoose.connection.db!;
    const verRecord = await db
      .collection('verification')
      .findOne({ identifier: `reset-password:${token}` });

    if (!verRecord || new Date(verRecord['expiresAt'] as Date) < new Date()) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: 'invalidToken',
        field: 'Token',
        details: [],
        customMessage: 'Token de convite inválido ou expirado.',
      });
    }

    const userIdDoToken = verRecord['value'] as string;
    const usuario = await this.repository.buscarPorId(userIdDoToken);

    if (!usuario) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: 'resourceNotFound',
        field: 'Token',
        details: [],
        customMessage: 'Usuário não encontrado.',
      });
    }

    if (usuario.ativo && usuario.ativadoEm) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'accountAlreadyActivated',
        field: 'Token',
        details: [],
        customMessage:
          'Esta conta já foi ativada. Faça login para acessar o sistema.',
      });
    }

    // Better Auth valida o token e atualiza a senha na collection account
    await getAuth().api.resetPassword({ body: { token, newPassword: senha } });

    const usuarioAtualizado = await ativarUsuarioPadrao(String(usuario._id));

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

    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

    await getAuth().api.requestPasswordReset({
      body: { email: usuario.email, redirectTo: `${frontendUrl}/ativar-conta` },
    });

    await this.repository.atualizar(id, { convidadoEm: new Date() });

    return { message: 'Convite reenviado com sucesso!' };
  }
}

export default UsuarioService;
