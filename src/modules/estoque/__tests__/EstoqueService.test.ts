jest.mock('../EstoqueRepository.js');

import EstoqueService from '../EstoqueService.js';
import EstoqueRepository from '../EstoqueRepository.js';

describe('EstoqueService', () => {
  let service;
  let repositoryMock;

  beforeEach(() => {
    EstoqueRepository.mockClear();
    repositoryMock = {
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      listarPorItem: jest.fn(),
    };
    EstoqueRepository.mockImplementation(() => repositoryMock);
    service = new EstoqueService();
  });

  it('deve delegar listar ao repository', async () => {
    const req = { query: {} };
    repositoryMock.listar.mockResolvedValue({ docs: [] });

    const resultado = await service.listar(req);

    expect(repositoryMock.listar).toHaveBeenCalledWith(req);
    expect(resultado).toEqual({ docs: [] });
  });

  it('deve delegar buscarPorId ao repository', async () => {
    const req = { params: { id: 'est1' } };
    repositoryMock.buscarPorId.mockResolvedValue({ _id: 'est1' });

    const resultado = await service.buscarPorId(req);

    expect(repositoryMock.buscarPorId).toHaveBeenCalledWith('est1', req);
    expect(resultado).toEqual({ _id: 'est1' });
  });

  it('deve delegar listarPorItem ao repository', async () => {
    const req = { params: { itemId: 'item1' }, query: {} };
    repositoryMock.listarPorItem.mockResolvedValue({ docs: [] });

    const resultado = await service.listarPorItem(req);

    expect(repositoryMock.listarPorItem).toHaveBeenCalledWith(req);
    expect(resultado).toEqual({ docs: [] });
  });
});
