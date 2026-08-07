jest.mock('../../../utils/helpers/index.js', () => {
  return {
    CommonResponse: {
      success: jest.fn(),
      created: jest.fn(),
    },
    CustomError: jest.fn((opts) => {
      const err = new Error(opts.customMessage);
      err.statusCode = opts.statusCode;
      err.errorType = opts.errorType;
      err.field = opts.field;
      err.details = opts.details;
      return err;
    }),
    HttpStatusCodes: {
      BAD_REQUEST: { code: 400 },
      NOT_FOUND: { code: 404 },
      CONFLICT: { code: 409 },
      INTERNAL_SERVER_ERROR: { code: 500 },
    },
    errorHandler: jest.fn(),
    messages: {
      usuario: {
        email_ja_cadastrado: 'E-mail já cadastrado',
        usuario_nao_encontrado: 'Usuário não encontrado',
        erro_interno: 'Erro interno',
        erro_validacao: 'Erro de validação',
        erro_filtro: 'Filtro inválido',
        erro_remocao: 'Não foi possível remover usuário',
        sucesso: 'Operação realizada com sucesso',
        sucesso_remocao: 'Usuário removido com sucesso',
      },
    },
    StatusService: {},
    asyncWrapper: jest.fn(),
  };
});

jest.mock('../UsuarioSchema.js', () => {
  return {
    UsuarioUpdateSchema: { parse: jest.fn() },
  };
});

jest.mock('../UsuarioQuerySchema.js', () => {
  return {
    UsuarioQuerySchema: { parse: jest.fn(), parseAsync: jest.fn() },
    UsuarioIdSchema: { parse: jest.fn() },
  };
});

import UsuarioController from '../UsuarioController.js';
import {
  CommonResponse,
  CustomError,
  messages,
} from '../../../utils/helpers/index.js';
import { UsuarioUpdateSchema } from '../UsuarioSchema.js';
import { UsuarioQuerySchema, UsuarioIdSchema } from '../UsuarioQuerySchema.js';

describe('UsuarioController - regras de negócio (simples)', () => {
  let controller, req, res, next;

  beforeEach(() => {
    controller = new UsuarioController();
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn(),
      sendFile: jest.fn(),
    };
    req = { params: {}, query: {}, body: {}, files: {} };
    next = jest.fn();
    CommonResponse.success.mockClear();
    CommonResponse.created.mockClear();
    UsuarioUpdateSchema.parse.mockClear();
    UsuarioQuerySchema.parse.mockClear();
    UsuarioIdSchema.parse.mockClear();
    controller.service = {
      listar: jest.fn(),
      atualizar: jest.fn(),
      deletar: jest.fn(),
      uploadFoto: jest.fn(),
      deletarFoto: jest.fn(),
      convidarUsuario: jest.fn(),
      ativarConta: jest.fn(),
      reenviarConvite: jest.fn(),
    };
  });

  describe('listar', () => {
    it('deve validar id se informado', async () => {
      req.params = { id: 'abc' };
      UsuarioIdSchema.parse.mockReturnValue('abc');
      controller.service.listar.mockResolvedValue({});
      await controller.listar(req, res, next);
      expect(UsuarioIdSchema.parse).toHaveBeenCalledWith('abc');
    });
    it('deve validar query se informada', async () => {
      req.query = { search: 'foo' };
      UsuarioQuerySchema.parseAsync.mockResolvedValue(req.query);
      controller.service.listar.mockResolvedValue([]);
      await controller.listar(req, res, next);
      expect(UsuarioQuerySchema.parseAsync).toHaveBeenCalledWith(req.query);
    });
    it('deve lançar erro se service.listar lançar', async () => {
      controller.service.listar.mockImplementation(() => {
        throw new Error('erro listar');
      });
      await expect(controller.listar(req, res, next)).rejects.toThrow(
        'erro listar',
      );
    });
  });

  describe('atualizar', () => {
    it('deve atualizar usuário e nunca retornar senha', async () => {
      req.params = { id: '1' };
      req.body = { nome: 'Novo' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      UsuarioUpdateSchema.parse.mockReturnValue(req.body);
      controller.service.atualizar.mockResolvedValue({
        _id: '1',
        nome: 'Novo',
        senha: 'hash',
      });
      await controller.atualizar(req, res, next);
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        expect.not.objectContaining({ senha: expect.anything() }),
        200,
        expect.any(String),
      );
    });
    it('deve lançar erro se schema inválido', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      UsuarioUpdateSchema.parse.mockImplementation(() => {
        throw new Error('erro update schema');
      });
      await expect(controller.atualizar(req, res, next)).rejects.toThrow(
        'erro update schema',
      );
    });
    it('deve lançar erro se service.atualizar lançar', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      UsuarioUpdateSchema.parse.mockReturnValue(req.body);
      controller.service.atualizar.mockImplementation(() => {
        throw new Error('erro atualizar');
      });
      await expect(controller.atualizar(req, res, next)).rejects.toThrow(
        'erro atualizar',
      );
    });
  });

  describe('deletar', () => {
    it('deve deletar usuário', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      controller.service.deletar.mockResolvedValue({ deleted: true });
      await controller.deletar(req, res, next);
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { deleted: true },
        200,
        expect.any(String),
      );
    });
    it('deve lançar erro se service.deletar lançar', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      controller.service.deletar.mockImplementation(() => {
        throw new Error('erro deletar');
      });
      await expect(controller.deletar(req, res, next)).rejects.toThrow(
        'erro deletar',
      );
    });
  });

  describe('uploadFoto', () => {
    it('deve fazer upload da foto', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      controller.service.uploadFoto.mockResolvedValue({ fotoPerfil: 'url' });
      await controller.uploadFoto(req, res, next);
      expect(controller.service.uploadFoto).toHaveBeenCalledWith(req, '1');
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { fotoPerfil: 'url' },
        201,
        expect.any(String),
      );
    });
  });

  describe('deletarFoto', () => {
    it('deve deletar a foto', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      controller.service.deletarFoto.mockResolvedValue({ fotoPerfil: '' });
      await controller.deletarFoto(req, res, next);
      expect(controller.service.deletarFoto).toHaveBeenCalledWith(req, '1');
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { fotoPerfil: '' },
        200,
        expect.any(String),
      );
    });
  });

  describe('convidarUsuario', () => {
    it('deve convidar usuário quando nome e email informados', async () => {
      req.body = { nome: 'Fulano', email: 'fulano@teste.com' };
      controller.service.convidarUsuario.mockResolvedValue({
        message: 'Convite enviado com sucesso!',
      });
      await controller.convidarUsuario(req, res, next);
      expect(controller.service.convidarUsuario).toHaveBeenCalledWith(
        'Fulano',
        'fulano@teste.com',
      );
      expect(CommonResponse.created).toHaveBeenCalledWith(res, {
        message: 'Convite enviado com sucesso!',
      });
    });

    it('deve lançar erro 400 se nome não informado', async () => {
      req.body = { email: 'fulano@teste.com' };
      await expect(
        controller.convidarUsuario(req, res, next),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(controller.service.convidarUsuario).not.toHaveBeenCalled();
    });

    it('deve lançar erro 400 se email não informado', async () => {
      req.body = { nome: 'Fulano' };
      await expect(
        controller.convidarUsuario(req, res, next),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(controller.service.convidarUsuario).not.toHaveBeenCalled();
    });

    it('deve lançar erro se service.convidarUsuario lançar', async () => {
      req.body = { nome: 'Fulano', email: 'fulano@teste.com' };
      controller.service.convidarUsuario.mockImplementation(() => {
        throw new Error('erro convidar');
      });
      await expect(controller.convidarUsuario(req, res, next)).rejects.toThrow(
        'erro convidar',
      );
    });
  });

  describe('ativarConta', () => {
    it('deve ativar conta quando token e senha informados', async () => {
      req.query = { token: 'abc123' };
      req.body = { senha: 'Senha@123' };
      UsuarioUpdateSchema.parse.mockReturnValue({ senha: 'Senha@123' });
      controller.service.ativarConta.mockResolvedValue({
        message: 'Conta ativada com sucesso!',
      });
      await controller.ativarConta(req, res, next);
      expect(controller.service.ativarConta).toHaveBeenCalledWith(
        'abc123',
        'Senha@123',
      );
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { message: 'Conta ativada com sucesso!' },
        200,
        'Conta ativada com sucesso!',
      );
    });

    it('deve lançar erro 400 se token não informado', async () => {
      req.body = { senha: 'Senha@123' };
      await expect(
        controller.ativarConta(req, res, next),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(controller.service.ativarConta).not.toHaveBeenCalled();
    });

    it('deve lançar erro 400 se senha não informada', async () => {
      req.query = { token: 'abc123' };
      await expect(
        controller.ativarConta(req, res, next),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(controller.service.ativarConta).not.toHaveBeenCalled();
    });

    it('deve lançar erro se schema de senha inválido', async () => {
      req.query = { token: 'abc123' };
      req.body = { senha: '123' };
      UsuarioUpdateSchema.parse.mockImplementation(() => {
        throw new Error('senha fraca');
      });
      await expect(controller.ativarConta(req, res, next)).rejects.toThrow(
        'senha fraca',
      );
    });
  });

  describe('reenviarConvite', () => {
    it('deve reenviar convite', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      controller.service.reenviarConvite.mockResolvedValue({
        message: 'Convite reenviado com sucesso!',
      });
      await controller.reenviarConvite(req, res, next);
      expect(controller.service.reenviarConvite).toHaveBeenCalledWith('1');
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { message: 'Convite reenviado com sucesso!' },
        200,
        'Convite reenviado com sucesso!',
      );
    });

    it('deve lançar erro se service.reenviarConvite lançar', async () => {
      req.params = { id: '1' };
      UsuarioIdSchema.parse.mockReturnValue('1');
      controller.service.reenviarConvite.mockImplementation(() => {
        throw new Error('erro reenviar');
      });
      await expect(controller.reenviarConvite(req, res, next)).rejects.toThrow(
        'erro reenviar',
      );
    });
  });
});
