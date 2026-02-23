import OrcamentoService from '../../../services/OrcamentoService.js';
import OrcamentoRepository from '../../../repositories/OrcamentoRepository.js';
import { CustomError } from '../../../utils/helpers/CustomError.js';

jest.mock('../../../repositories/OrcamentoRepository.js');

describe('OrcamentoService', () => {
  let service, repository;

  beforeEach(() => {
    OrcamentoRepository.mockClear();
    service = new OrcamentoService();
    repository = OrcamentoRepository.mock.instances[0];
  });

  describe('criar', () => {
    it('deve cadastrar orçamento válido', async () => {
      const parsedData = { nome: 'Orçamento', valor: 10 };
      const req = { user_id: 'user123' };
      repository.criar.mockResolvedValue({
        _id: 'id',
        ...parsedData,
        usuario: 'user123',
      });
      const result = await service.criar(parsedData, req);
      expect(repository.criar).toHaveBeenCalledWith({
        ...parsedData,
        usuario: 'user123',
      });
      expect(result).toEqual(
        expect.objectContaining({ _id: 'id', nome: 'Orçamento' }),
      );
    });
  });

  describe('listar', () => {
    it('deve retornar todos os orçamentos', async () => {
      const req = {};
      repository.listar.mockResolvedValue([{ nome: 'Orçamento' }]);
      const result = await service.listar(req);
      expect(repository.listar).toHaveBeenCalledWith(req);
      expect(result).toEqual(expect.any(Array));
    });
  });

  describe('atualizar', () => {
    it('deve atualizar orçamento existente', async () => {
      const id = 'id';
      const parsedData = { nome: 'Novo Nome' };
      const req = { user_id: 'user123' };
      repository.buscarPorId.mockResolvedValue({ _id: id });
      repository.atualizar.mockResolvedValue({ _id: id, ...parsedData });
      const result = await service.atualizar(id, parsedData, req);
      expect(repository.atualizar).toHaveBeenCalledWith(id, parsedData, req);
      expect(result).toEqual(expect.objectContaining({ nome: 'Novo Nome' }));
    });
    it('deve lançar erro se orçamento não existe', async () => {
      const req = { user_id: 'user123' };
      repository.buscarPorId.mockResolvedValue(null);
      await expect(
        service.atualizar('id', { nome: 'Novo' }, req),
      ).rejects.toThrow('não encontrado');
    });
  });

  describe('deletar', () => {
    it('deve deletar orçamento existente', async () => {
      const id = 'id';
      const req = { user_id: 'user123' };
      repository.buscarPorId.mockResolvedValue({ _id: id });
      repository.deletar.mockResolvedValue({ _id: id });
      const result = await service.deletar(id, req);
      expect(repository.deletar).toHaveBeenCalledWith(id, req);
      expect(result).toEqual(expect.objectContaining({ _id: id }));
    });
    it('deve lançar erro se orçamento não existe', async () => {
      const req = { user_id: 'user123' };
      repository.buscarPorId.mockResolvedValue(null);
      await expect(service.deletar('id', req)).rejects.toThrow(
        'não encontrado',
      );
    });
  });

  describe('manipulação de itens', () => {
    it('deve adicionar item', async () => {
      const req = { user_id: 'user123' };
      repository.adicionarItem.mockResolvedValue({
        _id: 'id',
        itens: [{ nome: 'C1' }],
      });
      const result = await service.adicionarItem('id', { nome: 'C1' }, req);
      expect(repository.adicionarItem).toHaveBeenCalledWith(
        'id',
        { nome: 'C1' },
        req,
      );
      expect(result).toEqual(
        expect.objectContaining({ itens: expect.any(Array) }),
      );
    });
    it('deve atualizar item', async () => {
      const req = { user_id: 'user123' };
      repository.atualizarItem.mockResolvedValue({
        _id: 'id',
        itens: [{ nome: 'C1', quantidade: 2 }],
      });
      const result = await service.atualizarItem(
        'id',
        'cid',
        { quantidade: 2 },
        req,
      );
      expect(repository.atualizarItem).toHaveBeenCalledWith(
        'id',
        'cid',
        { quantidade: 2 },
        req,
      );
      expect(result).toEqual(
        expect.objectContaining({ itens: expect.any(Array) }),
      );
    });
    it('deve remover item', async () => {
      const req = { user_id: 'user123' };
      repository.removerItem.mockResolvedValue({ _id: 'id', itens: [] });
      const result = await service.removerItem('id', 'cid', req);
      expect(repository.removerItem).toHaveBeenCalledWith('id', 'cid', req);
      expect(result).toEqual(expect.objectContaining({ itens: [] }));
    });
    it('deve retornar item por id', async () => {
      repository.buscarPorId.mockResolvedValue({
        itens: [{ _id: 'cid', nome: 'C1' }],
      });
      const comp = await service.getItemById('id', 'cid');
      expect(comp).toEqual(expect.objectContaining({ _id: 'cid' }));
    });
    it('deve retornar null se orçamento não existe ao buscar item', async () => {
      repository.buscarPorId.mockResolvedValue(null);
      const comp = await service.getItemById('id', 'cid');
      expect(comp).toBeNull();
    });
    it('deve retornar null se item não existe', async () => {
      repository.buscarPorId.mockResolvedValue({ itens: [{ _id: 'other' }] });
      const comp = await service.getItemById('id', 'cid');
      expect(comp).toBeNull();
    });
  });

  describe('ensureBudgetExists', () => {
    it('deve lançar erro se orçamento não existe', async () => {
      repository.buscarPorId.mockResolvedValue(null);
      await expect(service.ensureBudgetExists('id')).rejects.toThrow(
        'não encontrado',
      );
    });
    it('retorna orçamento se existe', async () => {
      repository.buscarPorId.mockResolvedValue({ _id: 'id' });
      const result = await service.ensureBudgetExists('id');
      expect(result).toEqual(expect.objectContaining({ _id: 'id' }));
    });
  });

  describe('falha inesperada', () => {
    it('deve propagar erro do repository', async () => {
      repository.listar.mockRejectedValue(new Error('Falha inesperada'));
      await expect(service.listar({})).rejects.toThrow('Falha inesperada');
    });
  });
});
