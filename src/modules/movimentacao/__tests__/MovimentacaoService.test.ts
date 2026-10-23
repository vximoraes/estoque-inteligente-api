import MovimentacaoService from '../MovimentacaoService.js';
import MovimentacaoRepository from '../MovimentacaoRepository.js';
import Item from '../../item/ItemModel.js';
import Fornecedor from '../../fornecedor/FornecedorModel.js';
import Estoque from '../../estoque/EstoqueModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';
import { CustomError } from '../../../utils/helpers/index.js';
import mongoose from 'mongoose';

jest.mock('../MovimentacaoRepository.js');
jest.mock('../../item/ItemModel.js');
jest.mock('../../fornecedor/FornecedorModel.js');
jest.mock('../../estoque/EstoqueModel.js');
jest.mock('../../localizacao/LocalizacaoModel.js');

const makeItem = (props = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  quantidade: 10,
  save: jest.fn().mockResolvedValue(undefined),
  ...props,
});
const makeFornecedor = (props = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  ...props,
});
const makeMovimentacao = (props = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  ...props,
});
const makeEstoque = (props = {}) => ({
  item: new mongoose.Types.ObjectId(),
  localizacao: new mongoose.Types.ObjectId(),
  quantidade: 10,
  ...props,
});

const sessao = { id: 'sessao-teste' };

describe('MovimentacaoService', () => {
  let service, repositoryMock;
  beforeEach(() => {
    jest
      .spyOn(mongoose.connection, 'transaction')
      .mockImplementation((fn) => fn(sessao));
    Localizacao.exists.mockResolvedValue({ _id: 'loc1' });
    MovimentacaoRepository.mockClear();
    repositoryMock = {
      criar: jest.fn(),
      listar: jest.fn(),
    };
    MovimentacaoRepository.mockImplementation(() => repositoryMock);
    service = new MovimentacaoService();
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve cadastrar movimentação de entrada com sucesso', async () => {
      const item = makeItem();
      const parsedData = {
        item: item._id,
        tipo: 'entrada',
        quantidade: 5,
      };
      const req = { user_id: 'user123' };
      Item.findOne.mockResolvedValue(item);
      Estoque.findOneAndUpdate.mockResolvedValue(
        makeEstoque({ quantidade: 15 }),
      );
      repositoryMock.criar.mockResolvedValue(makeMovimentacao(parsedData));

      await service.criar({ ...parsedData }, req);
      expect(Estoque.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ quantidade: { $lte: 999999999 - 5 } }),
        expect.objectContaining({ $inc: { quantidade: 5 } }),
        { new: true, session: sessao },
      );
      expect(repositoryMock.criar).toHaveBeenCalled();
      expect(Estoque.atualizarQuantidadeItem).toHaveBeenCalledWith(item._id);
    });

    it('cria o saldo zerado na primeira entrada do item na localização', async () => {
      const item = makeItem();
      Item.findOne.mockResolvedValue(item);
      Estoque.findOneAndUpdate.mockResolvedValue(
        makeEstoque({ quantidade: 5 }),
      );
      repositoryMock.criar.mockResolvedValue(makeMovimentacao());

      await service.criar(
        { item: item._id, tipo: 'entrada', quantidade: 5 },
        { user_id: 'user123' },
      );
      expect(Estoque.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ item: item._id }),
        { $setOnInsert: { quantidade: 0, usuario: 'user123' } },
        { upsert: true, session: sessao },
      );
    });

    it('recusa entrada que passaria do limite de estoque', async () => {
      const item = makeItem();
      Item.findOne.mockResolvedValue(item);
      Estoque.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.criar(
          { item: item._id, tipo: 'entrada', quantidade: 5 },
          { user_id: 'user123' },
        ),
      ).rejects.toThrow('Limite de estoque excedido');
      expect(repositoryMock.criar).not.toHaveBeenCalled();
    });

    it('grava saldo e movimentação na mesma transação', async () => {
      const item = makeItem();
      Item.findOne.mockResolvedValue(item);
      Estoque.findOneAndUpdate.mockResolvedValue(
        makeEstoque({ quantidade: 7 }),
      );
      repositoryMock.criar.mockResolvedValue(makeMovimentacao());

      await service.criar(
        { item: item._id, tipo: 'saida', quantidade: 3 },
        { user_id: 'user123' },
      );
      expect(mongoose.connection.transaction).toHaveBeenCalledTimes(1);
      expect(repositoryMock.criar).toHaveBeenCalledWith(
        expect.any(Object),
        sessao,
      );
    });

    it('não recalcula o item se gravar a movimentação falhar', async () => {
      const item = makeItem();
      Item.findOne.mockResolvedValue(item);
      Estoque.findOneAndUpdate.mockResolvedValue(
        makeEstoque({ quantidade: 7 }),
      );
      repositoryMock.criar.mockRejectedValue(new Error('falha ao gravar'));

      await expect(
        service.criar(
          { item: item._id, tipo: 'saida', quantidade: 3 },
          { user_id: 'user123' },
        ),
      ).rejects.toThrow('falha ao gravar');
      expect(Estoque.atualizarQuantidadeItem).not.toHaveBeenCalled();
    });

    it('usa a sessão recebida sem abrir outra transação', async () => {
      const item = makeItem();
      const sessaoExterna = { id: 'externa' };
      Item.findOne.mockResolvedValue(item);
      Estoque.findOneAndUpdate.mockResolvedValue(
        makeEstoque({ quantidade: 7 }),
      );
      repositoryMock.criar.mockResolvedValue(makeMovimentacao());

      await service.criar(
        { item: item._id, tipo: 'saida', quantidade: 3 },
        { user_id: 'user123' },
        sessaoExterna,
      );
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
      expect(repositoryMock.criar).toHaveBeenCalledWith(
        expect.any(Object),
        sessaoExterna,
      );
      expect(Estoque.atualizarQuantidadeItem).not.toHaveBeenCalled();
    });

    it('deve cadastrar movimentação de saída com sucesso (sem fornecedor)', async () => {
      const item = makeItem({ quantidade: 10 });
      const localizacao = new mongoose.Types.ObjectId();
      const parsedData = {
        item: item._id,
        tipo: 'saida',
        quantidade: 3,
        localizacao: localizacao,
      };
      const req = { user_id: 'user123' };

      Estoque.findOneAndUpdate.mockResolvedValue(
        makeEstoque({ quantidade: 7 }),
      );

      Item.findOne.mockResolvedValue(item);
      repositoryMock.criar.mockResolvedValue(makeMovimentacao(parsedData));

      await service.criar({ ...parsedData }, req);
      expect(Estoque.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ quantidade: { $gte: 3 } }),
        expect.objectContaining({ $inc: { quantidade: -3 } }),
        { new: true, session: sessao },
      );
      expect(repositoryMock.criar).toHaveBeenCalled();
    });

    it('deve lançar erro se item não existir', async () => {
      const req = { user_id: 'user123' };
      Item.findOne.mockResolvedValue(null);
      await expect(
        service.criar(
          {
            item: new mongoose.Types.ObjectId(),
            tipo: 'entrada',
            quantidade: 1,
          },
          req,
        ),
      ).rejects.toThrow(CustomError);
    });

    it('deve lançar erro se quantidade insuficiente na saída', async () => {
      const item = makeItem({ quantidade: 2 });
      const localizacao = new mongoose.Types.ObjectId();
      const parsedData = {
        item: item._id,
        tipo: 'saida',
        quantidade: 5,
        localizacao: localizacao,
      };
      const req = { user_id: 'user123' };

      Estoque.findOneAndUpdate.mockResolvedValue(null);
      Estoque.findOne.mockResolvedValue(makeEstoque({ quantidade: 2 }));

      Item.findOne.mockResolvedValue(item);
      await expect(service.criar(parsedData, req)).rejects.toThrow(
        'Estoque insuficiente (disponível: 2)',
      );
      expect(repositoryMock.criar).not.toHaveBeenCalled();
    });
    it('deve lidar corretamente com tipo diferente de entrada/saida', async () => {
      const item = makeItem({ quantidade: 10 });
      const parsedData = {
        item: item._id,
        tipo: 'outro',
        quantidade: 5,
      };
      const req = { user_id: 'user123' };
      Item.findOne.mockResolvedValue(item);
      repositoryMock.criar.mockResolvedValue(makeMovimentacao(parsedData));

      const result = await service.criar({ ...parsedData }, req);

      expect(repositoryMock.criar).toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('deve retornar todas as movimentações', async () => {
      const req = {};
      const movs = [makeMovimentacao(), makeMovimentacao({ _id: 'mov2' })];
      repositoryMock.listar.mockResolvedValue(movs);
      const result = await service.listar(req);
      expect(result).toEqual(movs);
    });

    it('deve lançar erro inesperado do repository', async () => {
      repositoryMock.listar.mockRejectedValue(new Error('DB error'));
      await expect(service.listar({})).rejects.toThrow('DB error');
    });
  });
});
