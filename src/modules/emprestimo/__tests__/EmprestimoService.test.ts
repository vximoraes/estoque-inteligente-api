import mongoose from 'mongoose';
import EmprestimoService from '../EmprestimoService.js';
import EmprestimoRepository from '../EmprestimoRepository.js';
import MovimentacaoService from '../../movimentacao/MovimentacaoService.js';
import PatrimonioService from '../../patrimonio/PatrimonioService.js';
import PatrimonioModel from '../../patrimonio/PatrimonioModel.js';
import Item from '../../item/ItemModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';
import Estoque from '../../estoque/EstoqueModel.js';
import { CustomError } from '../../../utils/helpers/index.js';

jest.mock('../EmprestimoRepository.js');
jest.mock('../../movimentacao/MovimentacaoService.js');
jest.mock('../../patrimonio/PatrimonioService.js');

const makeId = () => new mongoose.Types.ObjectId();

describe('EmprestimoService', () => {
  let service: EmprestimoService;
  let repositoryMock: {
    criar: jest.Mock;
    listar: jest.Mock;
    buscarPorId: jest.Mock;
    atualizarDevolucao: jest.Mock;
    atualizar: jest.Mock;
    excluir: jest.Mock;
  };
  let movimentacaoServiceMock: { criar: jest.Mock };
  let patrimonioServiceMock: {
    emprestarUnidade: jest.Mock;
    devolverUnidade: jest.Mock;
  };
  const req = { user_id: 'user1' } as any;

  beforeEach(() => {
    (EmprestimoRepository as jest.Mock).mockClear();
    (MovimentacaoService as jest.Mock).mockClear();
    (PatrimonioService as jest.Mock).mockClear();

    repositoryMock = {
      criar: jest.fn(),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      atualizarDevolucao: jest.fn(),
      atualizar: jest.fn(),
      excluir: jest.fn(),
    };
    (EmprestimoRepository as jest.Mock).mockImplementation(
      () => repositoryMock,
    );

    movimentacaoServiceMock = { criar: jest.fn().mockResolvedValue({}) };
    (MovimentacaoService as jest.Mock).mockImplementation(
      () => movimentacaoServiceMock,
    );

    patrimonioServiceMock = {
      emprestarUnidade: jest.fn(),
      devolverUnidade: jest.fn().mockResolvedValue({}),
    };
    (PatrimonioService as jest.Mock).mockImplementation(
      () => patrimonioServiceMock,
    );

    service = new EmprestimoService();
  });

  describe('criar — item de consumo (regressão)', () => {
    it('mantém o fluxo por quantidade sem tocar em patrimônio', async () => {
      const itemId = makeId();
      Item.findById = jest
        .fn()
        .mockResolvedValue({ _id: itemId, tipo: 'consumo' });
      Localizacao.findById = jest.fn().mockResolvedValue({ _id: makeId() });
      Estoque.findOne = jest.fn().mockResolvedValue({ quantidade: 10 });

      const criado = { _id: makeId(), quantidade_aberta: 3 };
      repositoryMock.criar.mockResolvedValue(criado);

      const resultado = await service.criar(
        {
          item: itemId.toString(),
          localizacao: makeId().toString(),
          quantidade_emprestada: 3,
          solicitante_nome: 'Fulano',
        } as any,
        req,
      );

      expect(resultado).toBe(criado);
      expect(movimentacaoServiceMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'saida', quantidade: 3 }),
        req,
      );
      expect(repositoryMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_controle: 'quantidade',
          quantidade_aberta: 3,
        }),
      );
      expect(patrimonioServiceMock.emprestarUnidade).not.toHaveBeenCalled();
    });

    it('rejeita quando o estoque é insuficiente', async () => {
      Item.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId(), tipo: 'consumo' });
      Localizacao.findById = jest.fn().mockResolvedValue({ _id: makeId() });
      Estoque.findOne = jest.fn().mockResolvedValue({ quantidade: 1 });

      await expect(
        service.criar(
          {
            item: makeId().toString(),
            localizacao: makeId().toString(),
            quantidade_emprestada: 5,
            solicitante_nome: 'Fulano',
          } as any,
          req,
        ),
      ).rejects.toThrow(CustomError);
      expect(repositoryMock.criar).not.toHaveBeenCalled();
    });
  });

  describe('criar — empréstimo de unidade patrimonial', () => {
    it('sem "patrimonio" no payload, cai no fluxo por quantidade (exige item/localizacao/estoque)', async () => {
      Item.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId(), tipo: 'consumo' });
      Localizacao.findById = jest.fn().mockResolvedValue({ _id: makeId() });
      Estoque.findOne = jest.fn().mockResolvedValue({ quantidade: 0 });

      await expect(
        service.criar(
          {
            item: makeId().toString(),
            localizacao: makeId().toString(),
            quantidade_emprestada: 1,
            solicitante_nome: 'Fulano',
          } as any,
          req,
        ),
      ).rejects.toThrow('Estoque insuficiente');
      expect(repositoryMock.criar).not.toHaveBeenCalled();
      expect(patrimonioServiceMock.emprestarUnidade).not.toHaveBeenCalled();
    });

    it('retorna 409 quando a unidade já está emprestada (concorrência)', async () => {
      const patrimonioId = makeId();
      PatrimonioModel.findById = jest.fn().mockResolvedValue({
        _id: patrimonioId,
        ativo: true,
      });
      patrimonioServiceMock.emprestarUnidade.mockResolvedValue(null);

      await expect(
        service.criar(
          {
            solicitante_nome: 'Fulano',
            patrimonio: patrimonioId.toString(),
          } as any,
          req,
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(repositoryMock.criar).not.toHaveBeenCalled();
    });

    it('monta o registro com quantidade 1 e a localização real da unidade, ignorando o que foi enviado', async () => {
      const patrimonioId = makeId();
      const localizacaoReal = makeId();
      const localizacaoEnviada = makeId().toString();

      PatrimonioModel.findById = jest.fn().mockResolvedValue({
        _id: patrimonioId,
        ativo: true,
      });
      patrimonioServiceMock.emprestarUnidade.mockResolvedValue({
        _id: patrimonioId,
        localizacao: localizacaoReal,
        status: 'Emprestado',
      });

      const criado = { _id: makeId(), quantidade_aberta: 1 };
      repositoryMock.criar.mockResolvedValue(criado);

      const resultado = await service.criar(
        {
          localizacao: localizacaoEnviada,
          quantidade_emprestada: 999,
          solicitante_nome: 'Fulano',
          patrimonio: patrimonioId.toString(),
        } as any,
        req,
      );

      expect(resultado).toBe(criado);
      expect(patrimonioServiceMock.emprestarUnidade).toHaveBeenCalledWith(
        patrimonioId.toString(),
        req,
      );
      expect(movimentacaoServiceMock.criar).not.toHaveBeenCalled();
      expect(repositoryMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_controle: 'unidade',
          patrimonio: patrimonioId,
          localizacao: localizacaoReal,
          quantidade_emprestada: 1,
          quantidade_devolvida: 0,
          quantidade_aberta: 1,
        }),
      );
    });

    it('compensa devolvendo a unidade se a criação do registro falhar depois da transição', async () => {
      const patrimonioId = makeId();
      PatrimonioModel.findById = jest.fn().mockResolvedValue({
        _id: patrimonioId,
        ativo: true,
      });
      patrimonioServiceMock.emprestarUnidade.mockResolvedValue({
        _id: patrimonioId,
        localizacao: makeId(),
        status: 'Emprestado',
      });
      repositoryMock.criar.mockRejectedValue(new Error('falha de escrita'));

      await expect(
        service.criar(
          {
            solicitante_nome: 'Fulano',
            patrimonio: patrimonioId.toString(),
          } as any,
          req,
        ),
      ).rejects.toThrow('falha de escrita');

      expect(patrimonioServiceMock.devolverUnidade).toHaveBeenCalledWith(
        patrimonioId.toString(),
        {},
        req,
      );
    });
  });

  describe('devolver', () => {
    it('empréstimo de unidade: transiciona a unidade e não chama movimentacaoService', async () => {
      const patrimonioId = makeId();
      repositoryMock.buscarPorId.mockResolvedValue({
        tipo_controle: 'unidade',
        patrimonio: patrimonioId,
        quantidade_aberta: 1,
        quantidade_devolvida: 0,
        quantidade_emprestada: 1,
      });
      repositoryMock.atualizarDevolucao.mockResolvedValue({
        quantidade_aberta: 0,
      });

      await service.devolver('emp1', { quantidade_devolvida: 1 } as any, req);

      expect(patrimonioServiceMock.devolverUnidade).toHaveBeenCalledWith(
        patrimonioId.toString(),
        {},
        req,
      );
      expect(movimentacaoServiceMock.criar).not.toHaveBeenCalled();
      expect(repositoryMock.atualizarDevolucao).toHaveBeenCalledWith(
        'emp1',
        expect.objectContaining({
          quantidade_devolvida: 1,
          quantidade_aberta: 0,
        }),
      );
    });

    it('empréstimo de quantidade: continua chamando movimentacaoService (regressão)', async () => {
      repositoryMock.buscarPorId.mockResolvedValue({
        tipo_controle: 'quantidade',
        item: { _id: makeId() },
        localizacao: { _id: makeId() },
        quantidade_aberta: 3,
        quantidade_devolvida: 0,
        quantidade_emprestada: 3,
      });
      repositoryMock.atualizarDevolucao.mockResolvedValue({
        quantidade_aberta: 1,
      });

      await service.devolver('emp1', { quantidade_devolvida: 2 } as any, req);

      expect(movimentacaoServiceMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'entrada', quantidade: 2 }),
        req,
      );
      expect(patrimonioServiceMock.devolverUnidade).not.toHaveBeenCalled();
    });
  });

  describe('desfazerDevolucao', () => {
    it('empréstimo de unidade: reempresta a unidade via emprestarUnidade', async () => {
      const patrimonioId = makeId();
      repositoryMock.buscarPorId.mockResolvedValue({
        tipo_controle: 'unidade',
        patrimonio: patrimonioId,
        quantidade_devolvida: 1,
        quantidade_emprestada: 1,
      });
      patrimonioServiceMock.emprestarUnidade.mockResolvedValue({
        status: 'Emprestado',
      });
      repositoryMock.atualizarDevolucao.mockResolvedValue({});

      await service.desfazerDevolucao('emp1', req);

      expect(patrimonioServiceMock.emprestarUnidade).toHaveBeenCalledWith(
        patrimonioId.toString(),
        req,
      );
      expect(movimentacaoServiceMock.criar).not.toHaveBeenCalled();
    });

    it('empréstimo de unidade: 400 se a unidade não está mais Disponível', async () => {
      const patrimonioId = makeId();
      repositoryMock.buscarPorId.mockResolvedValue({
        tipo_controle: 'unidade',
        patrimonio: patrimonioId,
        quantidade_devolvida: 1,
        quantidade_emprestada: 1,
      });
      patrimonioServiceMock.emprestarUnidade.mockResolvedValue(null);

      await expect(service.desfazerDevolucao('emp1', req)).rejects.toThrow(
        'não é possível desfazer',
      );
    });
  });

  describe('excluir', () => {
    it('bloqueia exclusão de empréstimo em aberto', async () => {
      repositoryMock.buscarPorId.mockResolvedValue({ quantidade_aberta: 2 });

      await expect(service.excluir('emp1')).rejects.toThrow(CustomError);
      expect(repositoryMock.excluir).not.toHaveBeenCalled();
    });

    it('permite excluir quando não há quantidade em aberto', async () => {
      repositoryMock.buscarPorId.mockResolvedValue({ quantidade_aberta: 0 });
      repositoryMock.excluir.mockResolvedValue({ message: 'ok' });

      const resultado = await service.excluir('emp1');
      expect(resultado).toEqual({ message: 'ok' });
    });
  });
});
