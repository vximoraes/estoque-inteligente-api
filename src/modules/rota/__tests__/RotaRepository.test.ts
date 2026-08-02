import RotaRepository from '../RotaRepository.js';
import RotaModel from '../RotaModel.js';

jest.mock('../RotaModel.js');

const mockRota = {
  save: jest.fn(),
};

RotaModel.mockImplementation(() => mockRota);
RotaModel.findById = jest.fn();
RotaModel.findByIdAndUpdate = jest.fn();
RotaModel.findByIdAndDelete = jest.fn();
RotaModel.findOne = jest.fn();
RotaModel.paginate = jest.fn();

describe('RotaRepository', () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new RotaRepository({ rotaModel: RotaModel });
  });

  describe('buscarPorId', () => {
    it('deve retornar rota quando existe', async () => {
      RotaModel.findById.mockResolvedValue({ _id: '1' });
      const resultado = await repository.buscarPorId('1');
      expect(resultado).toEqual({ _id: '1' });
    });

    it('deve lançar 404 quando não existe', async () => {
      RotaModel.findById.mockResolvedValue(null);
      await expect(repository.buscarPorId('1')).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });
  });

  describe('listar', () => {
    it('deve retornar rota por id quando informado', async () => {
      RotaModel.findById.mockResolvedValue({ _id: '1' });
      const resultado = await repository.listar({
        params: { id: '1' },
        query: {},
      });
      expect(resultado).toEqual({ _id: '1' });
    });

    it('deve lançar 404 quando id informado não existe', async () => {
      RotaModel.findById.mockResolvedValue(null);
      await expect(
        repository.listar({ params: { id: '1' }, query: {} }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });

    it('deve paginar com filtros construídos a partir da query', async () => {
      RotaModel.paginate.mockResolvedValue({ docs: [], totalDocs: 0 });

      await repository.listar({
        params: {},
        query: {
          rota: 'itens',
          dominio: 'localhost',
          ativo: 'true',
          page: '2',
          limite: '5',
        },
      });

      expect(RotaModel.paginate).toHaveBeenCalledWith(
        {
          rota: { $regex: 'itens', $options: 'i' },
          dominio: { $regex: 'localhost', $options: 'i' },
          ativo: true,
        },
        { page: 2, limit: 5 },
      );
    });

    it('deve limitar o limite máximo de paginação', async () => {
      RotaModel.paginate.mockResolvedValue({ docs: [] });
      await repository.listar({ params: {}, query: { limite: '9999' } });
      expect(RotaModel.paginate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
      );
    });
  });

  describe('criar', () => {
    it('deve criar e salvar uma rota', async () => {
      mockRota.save.mockResolvedValue({ _id: '1', rota: 'itens' });
      const resultado = await repository.criar({
        rota: 'itens',
        dominio: 'localhost',
      });
      expect(mockRota.save).toHaveBeenCalled();
      expect(resultado).toEqual({ _id: '1', rota: 'itens' });
    });
  });

  describe('atualizar', () => {
    it('deve atualizar rota existente', async () => {
      RotaModel.findByIdAndUpdate.mockResolvedValue({
        _id: '1',
        rota: 'itens',
      });
      const resultado = await repository.atualizar({ rota: 'itens' }, '1');
      expect(resultado).toEqual({ _id: '1', rota: 'itens' });
    });

    it('deve lançar 404 quando rota não existe', async () => {
      RotaModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(
        repository.atualizar({ rota: 'itens' }, '1'),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });
  });

  describe('deletar', () => {
    it('deve deletar rota existente', async () => {
      RotaModel.findByIdAndDelete.mockResolvedValue({ _id: '1' });
      const resultado = await repository.deletar('1');
      expect(resultado).toEqual({ _id: '1' });
    });

    it('deve lançar 404 quando rota não existe', async () => {
      RotaModel.findByIdAndDelete.mockResolvedValue(null);
      await expect(repository.deletar('1')).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });
  });

  describe('buscarRotaPorNome', () => {
    it('deve buscar rota por nome', async () => {
      RotaModel.findOne.mockResolvedValue({ rota: 'itens' });
      const resultado = await repository.buscarRotaPorNome('itens');
      expect(RotaModel.findOne).toHaveBeenCalledWith({ rota: 'itens' });
      expect(resultado).toEqual({ rota: 'itens' });
    });

    it('deve ignorar id informado', async () => {
      RotaModel.findOne.mockResolvedValue(null);
      await repository.buscarRotaPorNome('itens', 'idIgnorado');
      expect(RotaModel.findOne).toHaveBeenCalledWith({
        rota: 'itens',
        _id: { $ne: 'idIgnorado' },
      });
    });
  });
});
