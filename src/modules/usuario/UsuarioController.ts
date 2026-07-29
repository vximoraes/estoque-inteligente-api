import type { Response } from 'express';
import UsuarioService from './UsuarioService.js';
import { UsuarioQuerySchema, UsuarioIdSchema } from './UsuarioQuerySchema.js';
import { UsuarioUpdateSchema } from './UsuarioSchema.js';
import { CommonResponse, CustomError, HttpStatusCodes } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class UsuarioController {
  private service: UsuarioService;

  constructor() {
    this.service = new UsuarioService();
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      UsuarioIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await UsuarioQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    UsuarioIdSchema.parse(id);

    const parsedData = UsuarioUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    const dataObj = data as Record<string, unknown>;
    delete dataObj['senha'];

    return CommonResponse.success(
      res,
      data,
      200,
      'Usuário atualizado com sucesso. Porém, o e-mail é ignorado em tentativas de atualização, pois é operação proibida.',
    );
  }

  async deletar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined ?? '';
    UsuarioIdSchema.parse(id);

    const data = await this.service.deletar(id, req);
    return CommonResponse.success(res, data, 200, 'Usuário excluído com sucesso.');
  }

  async uploadFoto(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined ?? '';
    UsuarioIdSchema.parse(id);

    const data = await this.service.uploadFoto(req, id);
    return CommonResponse.success(res, data, 201, 'Foto atualizada com sucesso.');
  }

  async deletarFoto(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined ?? '';
    UsuarioIdSchema.parse(id);

    const data = await this.service.deletarFoto(req, id);
    return CommonResponse.success(res, data, 200, 'Foto deletada com sucesso.');
  }

  async convidarUsuario(req: AuthenticatedRequest, res: Response) {
    const { nome, email } = req.body as { nome?: string; email?: string };

    if (!nome || !email) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'nome, email',
        details: [
          { path: 'nome', message: 'Nome é obrigatório' },
          { path: 'email', message: 'E-mail é obrigatório' },
        ],
        customMessage: 'Nome e e-mail são obrigatórios.',
      });
    }

    const data = await this.service.convidarUsuario(nome, email);
    return CommonResponse.created(res, data);
  }

  async ativarConta(req: AuthenticatedRequest, res: Response) {
    const token = req.query['token'] as string | undefined;
    const { senha } = req.body as { senha?: string };

    if (!token) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'token',
        details: [{ path: 'token', message: 'Token é obrigatório' }],
        customMessage: 'Token de convite é obrigatório.',
      });
    }

    if (!senha) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'senha',
        details: [{ path: 'senha', message: 'Senha é obrigatória' }],
        customMessage: 'Senha é obrigatória.',
      });
    }

    const senhaValidada = UsuarioUpdateSchema.parse({ senha });
    const data = await this.service.ativarConta(token, senhaValidada.senha!);
    return CommonResponse.success(res, data, 200, data.message);
  }

  async reenviarConvite(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    UsuarioIdSchema.parse(id);

    const data = await this.service.reenviarConvite(id);
    return CommonResponse.success(res, data, 200, data.message);
  }
}

export default UsuarioController;
