jest.mock('../RotaRepository.js');

import RotaService from '../RotaService.js';
import RotaRepository from '../RotaRepository.js';
import { CustomError } from '../../../utils/helpers/index.js';

describe('RotaService', () => {
  let service;
  let repositoryMock;

  beforeEach(() => {
    RotaRepository.mockClear();
    repositoryMock = {
      listar: jest.fn(),
      criar: jest.fn(),
      atualizar: jest.fn(),
      deletar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarRotaPorNome: jest.fn(),
    };
    RotaRepository.mockImplementation(() => repositoryMock);
    service = new RotaService();
  });

  describe('listar', () => {
    it('deve delegar listar ao repository', async () => {
      const req = { query: {} };
      repositoryMock.listar.mockResolvedValue({ docs: [] });

      const resultado = await service.listar(req);

      expect(repositoryMock.listar).toHaveBeenCalledWith(req);
      expect(resultado).toEqual({ docs: [] });
    });
  });

  describe('criar', () => {
    it('deve criar rota quando nome não existe', async () => {
      repositoryMock.buscarRotaPorNome.mockResolvedValue(null);
      repositoryMock.criar.mockResolvedValue({ _id: 'r1', rota: 'itens' });

      const resultado = await service.criar({ rota: 'itens' });

      expect(resultado).toEqual({ _id: 'r1', rota: 'itens' });
    });

    it('deve lançar conflito quando rota já existe', async () => {
      repositoryMock.buscarRotaPorNome.mockResolvedValue({ _id: 'r1' });

      await expect(service.criar({ rota: 'itens' })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(repositoryMock.criar).not.toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    it('deve atualizar quando novo nome não conflita', async () => {
      repositoryMock.buscarRotaPorNome.mockResolvedValue(null);
      repositoryMock.atualizar.mockResolvedValue({ _id: 'r1', rota: 'novo' });

      const resultado = await service.atualizar({ rota: 'novo' }, 'r1');

      expect(repositoryMock.buscarRotaPorNome).toHaveBeenCalledWith(
        'novo',
        'r1',
      );
      expect(resultado).toEqual({ _id: 'r1', rota: 'novo' });
    });

    it('deve lançar conflito quando novo nome já existe em outra rota', async () => {
      repositoryMock.buscarRotaPorNome.mockResolvedValue({ _id: 'r2' });

      await expect(
        service.atualizar({ rota: 'itens' }, 'r1'),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('deletar', () => {
    it('deve deletar rota que não é a rota atual da requisição', async () => {
      repositoryMock.buscarPorId.mockResolvedValue({ rota: 'itens' });
      repositoryMock.deletar.mockResolvedValue({ _id: 'r1' });

      const req = { route: { path: '/rotas/:id' } };
      const resultado = await service.deletar(req, 'r1');

      expect(resultado).toEqual({ _id: 'r1' });
    });

    it('deve lançar 404 quando rota a deletar não existe', async () => {
      repositoryMock.buscarPorId.mockRejectedValue(
        new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Rota',
          details: [],
          customMessage: 'Rota não encontrado(a).',
        }),
      );

      const req = { route: { path: '/rotas/:id' } };
      await expect(service.deletar(req, 'inexistente')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
