jest.mock('../EstoqueModel.js');
jest.mock('../../item/ItemModel.js');

import EstoqueRepository from '../EstoqueRepository.js';
import { CustomError } from '../../../utils/helpers/index.js';
import EstoqueModel from '../EstoqueModel.js';
import ItemModel from '../../item/ItemModel.js';

describe('EstoqueRepository', () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new EstoqueRepository({ estoqueModel: EstoqueModel });
  });

  describe('criar', () => {
    it('deve criar estoque e retornar com item e localização populados', async () => {
      const salvo = { _id: 'est1' };
      const populado = { _id: 'est1', item: {}, localizacao: {} };
      EstoqueModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(salvo),
      }));
      EstoqueModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      EstoqueModel.findById().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(populado),
      });

      const resultado = await repository.criar({
        item: 'i1',
        localizacao: 'l1',
      });
      expect(resultado).toEqual(populado);
    });
  });

  describe('listar', () => {
    it('deve paginar estoques sem filtros', async () => {
      const paginado = { docs: [], totalDocs: 0 };
      EstoqueModel.paginate = jest.fn().mockResolvedValue(paginado);

      const req = { query: {} };
      const resultado = await repository.listar(req);

      expect(resultado).toEqual(paginado);
      expect(EstoqueModel.paginate).toHaveBeenCalled();
    });

    it('deve filtrar por localizacao quando informada', async () => {
      EstoqueModel.paginate = jest.fn().mockResolvedValue({ docs: [] });
      const req = { query: { localizacao: 'loc1' } };

      await repository.listar(req);

      const [filtros] = EstoqueModel.paginate.mock.calls[0];
      expect(filtros.localizacao).toBe('loc1');
    });

    it('deve filtrar por item quando informado', async () => {
      EstoqueModel.paginate = jest.fn().mockResolvedValue({ docs: [] });
      const req = { query: { item: 'item1' } };

      await repository.listar(req);

      const [filtros] = EstoqueModel.paginate.mock.calls[0];
      expect(filtros.item).toBe('item1');
    });

    it('deve filtrar por categoria via itens correspondentes', async () => {
      EstoqueModel.paginate = jest.fn().mockResolvedValue({ docs: [] });
      ItemModel.find = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue(['item1', 'item2']),
      });
      const req = { query: { categoria: 'cat1' } };

      await repository.listar(req);

      const [filtros] = EstoqueModel.paginate.mock.calls[0];
      expect(filtros.item).toEqual({ $in: ['item1', 'item2'] });
    });
  });

  describe('listarPorItem', () => {
    it('deve paginar estoques de um item específico', async () => {
      EstoqueModel.paginate = jest.fn().mockResolvedValue({ docs: [] });
      const req = { params: { itemId: 'item1' }, query: {} };

      await repository.listarPorItem(req);

      const [filtros] = EstoqueModel.paginate.mock.calls[0];
      expect(filtros.item).toBe('item1');
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar estoque existente', async () => {
      const estoque = { _id: 'est1' };
      EstoqueModel.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      EstoqueModel.findOne().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(estoque),
      });

      const resultado = await repository.buscarPorId('est1');
      expect(resultado).toEqual(estoque);
    });

    it('deve lançar 404 quando estoque não existe', async () => {
      EstoqueModel.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      });
      EstoqueModel.findOne().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(repository.buscarPorId('inexistente')).rejects.toThrow(
        CustomError,
      );
    });
  });
});
