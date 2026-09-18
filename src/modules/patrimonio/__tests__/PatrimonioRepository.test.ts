jest.mock('../PatrimonioModel.js');
jest.mock('../PatrimonioEventoModel.js');

import PatrimonioRepository from '../PatrimonioRepository.js';
import { CustomError } from '../../../utils/helpers/index.js';
import PatrimonioModel from '../PatrimonioModel.js';
import PatrimonioEventoModel from '../PatrimonioEventoModel.js';

describe('PatrimonioRepository', () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PatrimonioRepository({ patrimonioModel: PatrimonioModel });
  });

  describe('criar', () => {
    it('deve criar patrimônio e retornar populado', async () => {
      const populado = { _id: 'p1' };
      PatrimonioModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({ _id: 'p1' }),
      }));
      PatrimonioModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      PatrimonioModel.findById().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(populado),
      });

      const resultado = await repository.criar({ numero_patrimonio: 'NB-01' });
      expect(resultado).toEqual(populado);
    });
  });

  describe('buscarPorNumero', () => {
    it('deve buscar por número em maiúsculo entre os ativos', async () => {
      PatrimonioModel.findOne = jest.fn().mockResolvedValue({ _id: 'p1' });

      const resultado = await repository.buscarPorNumero(' nb-01 ');

      expect(PatrimonioModel.findOne).toHaveBeenCalledWith({
        numero_patrimonio: 'NB-01',
        ativo: true,
      });
      expect(resultado).toEqual({ _id: 'p1' });
    });
  });

  describe('buscarNumerosExistentes', () => {
    it('deve retornar os números já cadastrados', async () => {
      PatrimonioModel.find = jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue([
            { numero_patrimonio: 'NB-01' },
            { numero_patrimonio: 'NB-02' },
          ]),
      });

      const resultado = await repository.buscarNumerosExistentes([
        'nb-01',
        'nb-02',
      ]);

      expect(resultado).toEqual(['NB-01', 'NB-02']);
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar patrimônio existente', async () => {
      const patrimonio = { _id: 'p1' };
      PatrimonioModel.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      PatrimonioModel.findOne().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(patrimonio),
      });

      const resultado = await repository.buscarPorId('p1');
      expect(resultado).toEqual(patrimonio);
    });

    it('deve lançar 404 quando patrimônio não existe', async () => {
      PatrimonioModel.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      PatrimonioModel.findOne().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(repository.buscarPorId('inexistente')).rejects.toThrow(
        CustomError,
      );
    });
  });

  describe('atualizar', () => {
    it('deve atualizar e retornar patrimônio', async () => {
      const atualizado = { _id: 'p1', modelo: 'Novo' };
      PatrimonioModel.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      PatrimonioModel.findOneAndUpdate().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(atualizado),
      });

      const resultado = await repository.atualizar('p1', { modelo: 'Novo' });
      expect(resultado).toEqual(atualizado);
    });

    it('deve lançar 404 quando patrimônio a atualizar não existe', async () => {
      PatrimonioModel.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      PatrimonioModel.findOneAndUpdate().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        repository.atualizar('inexistente', { modelo: 'Novo' }),
      ).rejects.toThrow(CustomError);
    });
  });

  describe('listar', () => {
    it('deve retornar um único patrimônio quando id está nos params', async () => {
      const doc = { toObject: () => ({ _id: 'p1' }) };
      PatrimonioModel.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      PatrimonioModel.findOne().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(doc),
      });

      const resultado = await repository.listar({ params: { id: 'p1' } });
      expect(resultado).toEqual({ _id: 'p1' });
    });

    it('deve lançar 404 quando id nos params não existe', async () => {
      PatrimonioModel.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      PatrimonioModel.findOne().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        repository.listar({ params: { id: 'inexistente' } }),
      ).rejects.toThrow(CustomError);
    });

    it('deve paginar patrimônios sem id nos params', async () => {
      const doc = { toObject: () => ({ _id: 'p1' }) };
      PatrimonioModel.paginate = jest
        .fn()
        .mockResolvedValue({ docs: [doc], totalDocs: 1 });

      const resultado = await repository.listar({
        params: {},
        query: {},
      });

      expect(PatrimonioModel.paginate).toHaveBeenCalled();
      expect(resultado.docs).toEqual([{ _id: 'p1' }]);
      expect(resultado.totalDocs).toBe(1);
    });
  });

  describe('buscarEventosPorPatrimonio', () => {
    it('deve paginar eventos do patrimônio', async () => {
      PatrimonioEventoModel.paginate = jest
        .fn()
        .mockResolvedValue({ docs: [], totalDocs: 0 });

      const resultado = await repository.buscarEventosPorPatrimonio('p1', {
        query: {},
      });

      expect(PatrimonioEventoModel.paginate).toHaveBeenCalledWith(
        { patrimonio: 'p1' },
        expect.objectContaining({ page: 1 }),
      );
      expect(resultado).toEqual({ docs: [], totalDocs: 0 });
    });
  });
});
