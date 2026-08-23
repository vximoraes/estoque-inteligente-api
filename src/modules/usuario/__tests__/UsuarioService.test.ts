jest.mock('../../../config/auth.js', () => ({
  initAuth: jest.fn(),
  getAuth: jest.fn(),
}));

jest.mock('../ativarUsuarioPadrao.js', () => ({
  ativarUsuarioPadrao: jest.fn(),
}));

import mongoose from 'mongoose';
import UsuarioService from '../UsuarioService.js';
import UsuarioRepository from '../UsuarioRepository.js';
import minioClient from '../../../config/MinIO.js';
import compress from '../../../config/SharpConfig.js';
import { getAuth } from '../../../config/auth.js';
import { ativarUsuarioPadrao } from '../ativarUsuarioPadrao.js';

jest.mock('../UsuarioRepository.js');

const mockCollection = { deleteMany: jest.fn(), findOne: jest.fn() };
mongoose.connection.db = { collection: jest.fn(() => mockCollection) };

describe('UsuarioService', () => {
  let service;
  let repositoryMock;
  let authApiMock;

  beforeEach(() => {
    UsuarioRepository.mockClear();
    mockCollection.deleteMany.mockClear();
    mockCollection.findOne.mockClear();
    minioClient.send.mockClear();
    compress.mockClear();
    ativarUsuarioPadrao.mockClear();

    repositoryMock = {
      listar: jest.fn(),
      atualizar: jest.fn(),
      deletar: jest.fn(),
      buscarPorEmail: jest.fn(),
      buscarPorId: jest.fn(),
    };

    authApiMock = {
      signUpEmail: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
    };
    getAuth.mockReturnValue({ api: authApiMock });

    UsuarioRepository.mockImplementation(() => repositoryMock);
    service = new UsuarioService();
  });

  describe('listar', () => {
    it('deve retornar todos os usuários', async () => {
      repositoryMock.listar.mockResolvedValue([{ _id: '1', nome: 'Teste' }]);
      const data = await service.listar({});
      expect(data).toEqual([{ _id: '1', nome: 'Teste' }]);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar usuário existente, exceto email e senha', async () => {
      const req = { user_id: 'user123' };
      repositoryMock.buscarPorId.mockResolvedValue({
        _id: '1',
        nome: 'Teste',
        email: 'a@a.com',
        senha: '123',
      });
      repositoryMock.atualizar.mockResolvedValue({
        _id: '1',
        nome: 'Novo Nome',
        email: 'a@a.com',
        senha: '123',
      });
      const data = await service.atualizar(
        '1',
        { nome: 'Novo Nome', email: 'novo@a.com', senha: 'nova' },
        req,
      );
      expect(repositoryMock.atualizar).toHaveBeenCalledWith(
        '1',
        { nome: 'Novo Nome' },
        'user123',
      );
      expect(data.nome).toBe('Novo Nome');
      expect(data.email).toBe('a@a.com');
    });

    it('deve lançar erro se usuário não existir', async () => {
      const req = { user_id: 'user123' };
      repositoryMock.buscarPorId.mockResolvedValue(null);
      await expect(
        service.atualizar('1', { nome: 'Novo' }, req),
      ).rejects.toThrow('Usuário não encontrado(a).');
    });
  });

  describe('deletar', () => {
    it('deve deletar usuário existente', async () => {
      const req = { user_id: 'user123' };
      repositoryMock.buscarPorId.mockResolvedValue({ _id: '1' });
      repositoryMock.deletar.mockResolvedValue({
        acknowledged: true,
        deletedCount: 1,
      });
      const data = await service.deletar('1', req);
      expect(repositoryMock.deletar).toHaveBeenCalledWith('1', 'user123');
      expect(data).toEqual({ acknowledged: true, deletedCount: 1 });
    });

    it('deve lançar erro se usuário não existir', async () => {
      const req = { user_id: 'user123' };
      repositoryMock.buscarPorId.mockResolvedValue(null);
      await expect(service.deletar('1', req)).rejects.toThrow(
        'Usuário não encontrado(a).',
      );
    });
  });

  describe('validateEmail', () => {
    it('deve lançar erro se e-mail já estiver em uso', async () => {
      repositoryMock.buscarPorEmail.mockResolvedValue({
        _id: '1',
        email: 'a@a.com',
      });
      await expect(service.validateEmail('a@a.com')).rejects.toThrow(
        'Email já está em uso.',
      );
    });
    it('não deve lançar erro se e-mail for único', async () => {
      repositoryMock.buscarPorEmail.mockResolvedValue(null);
      await expect(service.validateEmail('b@b.com')).resolves.toBeUndefined();
    });
  });

  describe('ensureUserExists', () => {
    it('deve lançar erro se usuário não existir', async () => {
      repositoryMock.buscarPorId.mockResolvedValue(null);
      await expect(service.ensureUserExists('1')).rejects.toThrow(
        'Usuário não encontrado(a).',
      );
    });
    it('deve retornar usuário se existir', async () => {
      repositoryMock.buscarPorId.mockResolvedValue({ _id: '1', nome: 'Teste' });
      const user = await service.ensureUserExists('1');
      expect(user).toEqual({ _id: '1', nome: 'Teste' });
    });
  });

  describe('proibição de update de email e senha', () => {
    it('deve ignorar alterações em email e senha no update', async () => {
      const req = { user_id: 'user123' };
      repositoryMock.buscarPorId.mockResolvedValue({
        _id: '1',
        nome: 'Teste',
        email: 'a@a.com',
        senha: '123',
      });
      repositoryMock.atualizar.mockResolvedValue({
        _id: '1',
        nome: 'Novo Nome',
        email: 'a@a.com',
        senha: '123',
      });
      const data = await service.atualizar(
        '1',
        { nome: 'Novo Nome', email: 'novo@a.com', senha: 'nova' },
        req,
      );
      expect(repositoryMock.atualizar).toHaveBeenCalledWith(
        '1',
        { nome: 'Novo Nome' },
        'user123',
      );
      expect(data.email).toBe('a@a.com');
      expect(data.senha).toBe('123');
    });
  });

  describe('uploadFoto', () => {
    it('deve lançar erro se nenhum arquivo for enviado', async () => {
      const req = { file: undefined };
      await expect(service.uploadFoto(req, '1')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('deve lançar erro se arquivo for maior que 5MB', async () => {
      const req = { file: { size: 6 * 1024 * 1024, buffer: Buffer.from('x') } };
      await expect(service.uploadFoto(req, '1')).rejects.toMatchObject({
        statusCode: 413,
      });
    });

    it('deve comprimir, enviar ao MinIO e retornar a fotoPerfil', async () => {
      const req = { file: { size: 100, buffer: Buffer.from('x') } };
      repositoryMock.atualizar.mockResolvedValue({ fotoPerfil: 'url/1.jpeg' });
      compress.mockResolvedValue(Buffer.from('comprimido'));

      const data = await service.uploadFoto(req, '1');

      expect(compress).toHaveBeenCalledWith(req.file.buffer);
      expect(minioClient.send).toHaveBeenCalled();
      expect(data).toEqual({ fotoPerfil: 'url/1.jpeg' });
    });

    it('deve envolver erro inesperado em Error genérico', async () => {
      const req = { file: { size: 100, buffer: Buffer.from('x') } };
      repositoryMock.atualizar.mockRejectedValue(new Error('falha mongo'));
      await expect(service.uploadFoto(req, '1')).rejects.toThrow(Error);
    });
  });

  describe('deletarFoto', () => {
    it('deve remover do MinIO e retornar fotoPerfil vazia', async () => {
      repositoryMock.atualizar.mockResolvedValue({ fotoPerfil: '' });
      const data = await service.deletarFoto({}, '1');
      expect(minioClient.send).toHaveBeenCalled();
      expect(data).toEqual({ fotoPerfil: '' });
    });
  });

  describe('convidarUsuario', () => {
    it('deve criar conta via Better Auth e retornar dados do usuário', async () => {
      authApiMock.signUpEmail.mockResolvedValue({ user: { id: 'user1' } });
      authApiMock.requestPasswordReset.mockResolvedValue({});
      repositoryMock.atualizar.mockResolvedValue({});
      repositoryMock.buscarPorEmail.mockResolvedValue(null);
      repositoryMock.buscarPorId.mockResolvedValue({
        _id: 'user1',
        nome: 'Fulano',
        email: 'fulano@teste.com',
        ativo: false,
        convidadoEm: new Date('2024-01-01'),
      });

      const data = await service.convidarUsuario('Fulano', 'Fulano@Teste.com');

      expect(authApiMock.signUpEmail).toHaveBeenCalledWith({
        body: expect.objectContaining({
          email: 'fulano@teste.com',
          name: 'Fulano',
        }),
      });
      expect(data).toEqual({
        message: 'Convite enviado com sucesso!',
        usuario: {
          _id: 'user1',
          nome: 'Fulano',
          email: 'fulano@teste.com',
          ativo: false,
          convidadoEm: new Date('2024-01-01'),
        },
      });
    });

    it('deve lançar erro se e-mail já estiver em uso', async () => {
      repositoryMock.buscarPorEmail.mockResolvedValue({ _id: '1' });
      await expect(
        service.convidarUsuario('Fulano', 'fulano@teste.com'),
      ).rejects.toThrow('Email já está em uso.');
      expect(authApiMock.signUpEmail).not.toHaveBeenCalled();
    });

    it('deve desfazer o cadastro se o envio do convite falhar', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString();
      repositoryMock.buscarPorEmail.mockResolvedValue(null);
      authApiMock.signUpEmail.mockResolvedValue({ user: { id: userId } });
      repositoryMock.atualizar.mockResolvedValue({});
      const erroEnvio = new Error('smtp indisponível');
      authApiMock.requestPasswordReset.mockRejectedValue(erroEnvio);

      await expect(
        service.convidarUsuario('Fulano', 'fulano@teste.com'),
      ).rejects.toThrow('smtp indisponível');

      expect(repositoryMock.deletar).toHaveBeenCalledWith(userId);
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        userId: new mongoose.Types.ObjectId(userId),
      });
    });
  });

  describe('ativarConta', () => {
    it('deve lançar erro se token inválido ou expirado', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      await expect(
        service.ativarConta('token-invalido', 'Senha@123'),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('deve lançar erro se token estiver expirado', async () => {
      mockCollection.findOne.mockResolvedValue({
        value: 'user1',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.ativarConta('token-expirado', 'Senha@123'),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('deve lançar erro se usuário do token não existir', async () => {
      mockCollection.findOne.mockResolvedValue({
        value: 'user1',
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      repositoryMock.buscarPorId.mockResolvedValue(null);
      await expect(
        service.ativarConta('token', 'Senha@123'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deve lançar erro se conta já estiver ativada', async () => {
      mockCollection.findOne.mockResolvedValue({
        value: 'user1',
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      repositoryMock.buscarPorId.mockResolvedValue({
        _id: 'user1',
        ativo: true,
        ativadoEm: new Date(),
      });
      await expect(
        service.ativarConta('token', 'Senha@123'),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(authApiMock.resetPassword).not.toHaveBeenCalled();
    });

    it('deve ativar a conta quando token válido e conta pendente', async () => {
      mockCollection.findOne.mockResolvedValue({
        value: 'user1',
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      repositoryMock.buscarPorId.mockResolvedValue({
        _id: 'user1',
        ativo: false,
      });
      authApiMock.resetPassword.mockResolvedValue({});
      ativarUsuarioPadrao.mockResolvedValue({
        _id: 'user1',
        nome: 'Fulano',
        email: 'fulano@teste.com',
      });

      const data = await service.ativarConta('token-valido', 'Senha@123');

      expect(authApiMock.resetPassword).toHaveBeenCalledWith({
        body: { token: 'token-valido', newPassword: 'Senha@123' },
      });
      expect(ativarUsuarioPadrao).toHaveBeenCalledWith('user1');
      expect(data).toEqual({
        message: 'Conta ativada com sucesso! Você já pode fazer login.',
        usuario: {
          id: 'user1',
          nome: 'Fulano',
          email: 'fulano@teste.com',
        },
      });
    });
  });

  describe('reenviarConvite', () => {
    it('deve lançar erro se conta já estiver ativada', async () => {
      repositoryMock.buscarPorId.mockResolvedValue({
        ativo: true,
        ativadoEm: new Date(),
      });
      await expect(service.reenviarConvite('1')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(authApiMock.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('deve reenviar convite quando conta pendente', async () => {
      repositoryMock.buscarPorId.mockResolvedValue({
        _id: '1',
        email: 'fulano@teste.com',
        ativo: false,
      });
      authApiMock.requestPasswordReset.mockResolvedValue({});
      repositoryMock.atualizar.mockResolvedValue({});

      const data = await service.reenviarConvite('1');

      expect(authApiMock.requestPasswordReset).toHaveBeenCalledWith({
        body: expect.objectContaining({ email: 'fulano@teste.com' }),
      });
      expect(repositoryMock.atualizar).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ convidadoEm: expect.any(Date) }),
      );
      expect(data).toEqual({ message: 'Convite reenviado com sucesso!' });
    });
  });
});
