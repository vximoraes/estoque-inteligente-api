import mongoose from 'mongoose';
import PatrimonioService from '../PatrimonioService.js';
import PatrimonioRepository from '../PatrimonioRepository.js';
import PatrimonioModel from '../PatrimonioModel.js';
import PatrimonioEventoModel from '../PatrimonioEventoModel.js';
import CategoriaModel from '../../categoria/CategoriaModel.js';
import LocalizacaoModel from '../../localizacao/LocalizacaoModel.js';
import { CustomError } from '../../../utils/helpers/index.js';

jest.mock('../PatrimonioRepository.js');

const makeId = () => new mongoose.Types.ObjectId();

function mockPopulateChain(finalValue) {
  return { populate: jest.fn().mockResolvedValue(finalValue) };
}

describe('PatrimonioService', () => {
  let service;
  let repositoryMock;
  const req = { user_id: 'user1' };

  beforeEach(() => {
    PatrimonioRepository.mockClear();
    repositoryMock = {
      criar: jest.fn(),
      criarMuitos: jest.fn(),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      buscarEventosPorPatrimonio: jest.fn(),
    };
    PatrimonioRepository.mockImplementation(() => repositoryMock);
    service = new PatrimonioService();

    jest.restoreAllMocks();
    PatrimonioEventoModel.create = jest.fn().mockResolvedValue({});
    PatrimonioEventoModel.insertMany = jest.fn().mockResolvedValue([]);
  });

  describe('criar', () => {
    it('deve rejeitar categoria que não existe', async () => {
      CategoriaModel.findById = jest.fn().mockResolvedValue(null);
      await expect(
        service.criar(
          {
            categoria: makeId().toString(),
            numero_patrimonio: 'NB-0001',
            localizacao: makeId().toString(),
          },
          req,
        ),
      ).rejects.toThrow(CustomError);
    });

    it('deve rejeitar categoria do tipo consumo', async () => {
      CategoriaModel.findById = jest
        .fn()
        .mockResolvedValue({ tipo: 'consumo' });
      await expect(
        service.criar(
          {
            categoria: makeId().toString(),
            numero_patrimonio: 'NB-0001',
            localizacao: makeId().toString(),
          },
          req,
        ),
      ).rejects.toThrow('permanente');
    });

    it('deve rejeitar localizacao inexistente', async () => {
      CategoriaModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId(), tipo: 'permanente' });
      LocalizacaoModel.findById = jest.fn().mockResolvedValue(null);
      await expect(
        service.criar(
          {
            categoria: makeId().toString(),
            numero_patrimonio: 'NB-0001',
            localizacao: makeId().toString(),
          },
          req,
        ),
      ).rejects.toThrow(CustomError);
    });

    it('deve criar a unidade e gravar evento de cadastro', async () => {
      const categoriaId = makeId();
      CategoriaModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: categoriaId, tipo: 'permanente' });
      LocalizacaoModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId() });

      const criado = { _id: makeId(), numero_patrimonio: 'NB-0001' };
      repositoryMock.criar.mockResolvedValue(criado);

      const localizacaoId = makeId().toString();
      const resultado = await service.criar(
        {
          categoria: categoriaId.toString(),
          numero_patrimonio: 'NB-0001',
          localizacao: localizacaoId,
        },
        req,
      );

      expect(resultado).toBe(criado);
      expect(repositoryMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Disponível',
          ativo: true,
          usuario: 'user1',
        }),
      );
      expect(PatrimonioEventoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patrimonio: criado._id,
          tipo: 'cadastro',
          status_anterior: null,
          status_novo: 'Disponível',
        }),
      );
    });

    it('deve honrar status explícito no cadastro', async () => {
      const categoriaId = makeId();
      CategoriaModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: categoriaId, tipo: 'permanente' });
      LocalizacaoModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId() });

      const criado = { _id: makeId(), numero_patrimonio: 'NB-0002' };
      repositoryMock.criar.mockResolvedValue(criado);

      await service.criar(
        {
          categoria: categoriaId.toString(),
          numero_patrimonio: 'NB-0002',
          localizacao: makeId().toString(),
          status: 'Baixado',
        },
        req,
      );

      expect(repositoryMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Baixado' }),
      );
      expect(PatrimonioEventoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ status_novo: 'Baixado' }),
      );
    });

    it('deve repassar modelo, fabricante e campos_personalizados ao repository', async () => {
      const categoriaId = makeId();
      CategoriaModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: categoriaId, tipo: 'permanente' });
      LocalizacaoModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId() });
      repositoryMock.criar.mockResolvedValue({ _id: makeId() });

      const campos = [{ chave: 'Número de série', valor: 'SN123456' }];
      await service.criar(
        {
          categoria: categoriaId.toString(),
          numero_patrimonio: 'NB-0001',
          modelo: 'ThinkPad T14',
          fabricante: 'Lenovo',
          localizacao: makeId().toString(),
          campos_personalizados: campos,
        },
        req,
      );

      expect(repositoryMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          modelo: 'ThinkPad T14',
          fabricante: 'Lenovo',
          campos_personalizados: campos,
        }),
      );
    });
  });

  describe('criarLote', () => {
    it('deve gerar numeração sequencial e criar N unidades', async () => {
      const categoriaId = makeId();
      CategoriaModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: categoriaId, tipo: 'permanente' });
      LocalizacaoModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId() });

      const criados = [
        { _id: makeId(), numero_patrimonio: 'NB-0005' },
        { _id: makeId(), numero_patrimonio: 'NB-0006' },
        { _id: makeId(), numero_patrimonio: 'NB-0007' },
      ];
      repositoryMock.criarMuitos.mockResolvedValue(criados);

      const resultado = await service.criarLote(
        {
          categoria: categoriaId.toString(),
          localizacao: makeId().toString(),
          quantidade: 3,
          prefixo: 'NB',
          numero_inicial: 5,
        },
        req,
      );

      expect(resultado).toBe(criados);
      const unidadesEnviadas = repositoryMock.criarMuitos.mock.calls[0][0];
      expect(unidadesEnviadas).toHaveLength(3);
      expect(unidadesEnviadas.map((u) => u.numero_patrimonio)).toEqual([
        'NB-0005',
        'NB-0006',
        'NB-0007',
      ]);
      expect(PatrimonioEventoModel.insertMany).toHaveBeenCalledTimes(1);
      expect(PatrimonioEventoModel.insertMany.mock.calls[0][0]).toHaveLength(3);
    });

    it('deve rejeitar categoria do tipo consumo antes de gerar qualquer unidade', async () => {
      CategoriaModel.findById = jest
        .fn()
        .mockResolvedValue({ tipo: 'consumo' });
      await expect(
        service.criarLote(
          {
            categoria: makeId().toString(),
            localizacao: makeId().toString(),
            quantidade: 3,
            prefixo: 'NB',
            numero_inicial: 1,
          },
          req,
        ),
      ).rejects.toThrow('permanente');
      expect(repositoryMock.criarMuitos).not.toHaveBeenCalled();
    });
  });

  describe('transicionar', () => {
    it('deve rejeitar destino "Emprestado"', async () => {
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Disponível' });
      await expect(
        service.transicionar('id1', { status: 'Emprestado' }, req),
      ).rejects.toThrow('fluxo de empréstimo');
    });

    it('deve rejeitar transição a partir de "Emprestado"', async () => {
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Emprestado' });
      await expect(
        service.transicionar('id1', { status: 'Manutenção' }, req),
      ).rejects.toThrow('devolva o empréstimo');
    });

    it('deve rejeitar transição para o mesmo status', async () => {
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Disponível' });
      await expect(
        service.transicionar('id1', { status: 'Disponível' }, req),
      ).rejects.toThrow('já está em');
    });

    it('deve rejeitar transição sem mapeamento (Baixado -> Manutenção)', async () => {
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Baixado' });
      await expect(
        service.transicionar('id1', { status: 'Manutenção' }, req),
      ).rejects.toThrow('não é permitida');
    });

    it('deve transicionar Disponível -> Manutenção e gravar evento manutencao_entrada', async () => {
      const patrimonioId = makeId().toString();
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Disponível' });

      const atualizado = { _id: patrimonioId, status: 'Manutenção' };
      PatrimonioModel.findOneAndUpdate = jest
        .fn()
        .mockReturnValue(mockPopulateChain(atualizado));

      const resultado = await service.transicionar(
        patrimonioId,
        { status: 'Manutenção' },
        req,
      );

      expect(resultado).toBe(atualizado);
      expect(PatrimonioEventoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'manutencao_entrada',
          status_anterior: 'Disponível',
          status_novo: 'Manutenção',
        }),
      );
    });

    it('deve transicionar Baixado -> Disponível como reativacao', async () => {
      const patrimonioId = makeId().toString();
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Baixado' });
      PatrimonioModel.findOneAndUpdate = jest
        .fn()
        .mockReturnValue(mockPopulateChain({ status: 'Disponível' }));

      await service.transicionar(patrimonioId, { status: 'Disponível' }, req);

      expect(PatrimonioEventoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'reativacao' }),
      );
    });
  });

  describe('transferir', () => {
    it('deve rejeitar transferência de unidade emprestada', async () => {
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Emprestado' });
      await expect(
        service.transferir('id1', { localizacao: makeId().toString() }, req),
      ).rejects.toThrow('empréstimo/devolução');
    });

    it('deve transferir e gravar evento de transferencia', async () => {
      const localizacaoAnterior = makeId();
      PatrimonioModel.findById = jest.fn().mockResolvedValue({
        status: 'Disponível',
        localizacao: localizacaoAnterior,
      });
      LocalizacaoModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: makeId() });

      const atualizado = { status: 'Disponível' };
      PatrimonioModel.findOneAndUpdate = jest
        .fn()
        .mockReturnValue(mockPopulateChain(atualizado));

      const novaLocalizacao = makeId().toString();
      const resultado = await service.transferir(
        'id1',
        { localizacao: novaLocalizacao },
        req,
      );

      expect(resultado).toBe(atualizado);
      expect(PatrimonioEventoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'transferencia',
          localizacao_anterior: localizacaoAnterior,
          localizacao_nova: novaLocalizacao,
        }),
      );
    });
  });

  describe('inativar', () => {
    it('deve rejeitar inativação de unidade emprestada', async () => {
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Emprestado' });
      await expect(service.inativar('id1', req)).rejects.toThrow(
        'devolva antes',
      );
    });

    it('deve inativar via repository.atualizar', async () => {
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({ status: 'Disponível' });
      repositoryMock.atualizar.mockResolvedValue({ ativo: false });

      const resultado = await service.inativar('id1', req);
      expect(resultado).toEqual({ ativo: false });
      expect(repositoryMock.atualizar).toHaveBeenCalledWith(
        'id1',
        { ativo: false },
        req,
      );
    });
  });

  describe('emprestarUnidade', () => {
    it('deve lançar 404 se a unidade não existir', async () => {
      PatrimonioModel.exists = jest.fn().mockResolvedValue(null);
      await expect(
        service.emprestarUnidade('id-inexistente', req),
      ).rejects.toThrow(CustomError);
    });

    it('deve retornar null se a unidade não estava Disponível (concorrência)', async () => {
      PatrimonioModel.exists = jest.fn().mockResolvedValue(true);
      PatrimonioModel.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      const resultado = await service.emprestarUnidade('id1', req);
      expect(resultado).toBeNull();
      expect(PatrimonioEventoModel.create).not.toHaveBeenCalled();
    });

    it('deve transicionar para Emprestado atomicamente e gravar evento', async () => {
      PatrimonioModel.exists = jest.fn().mockResolvedValue(true);
      const atualizado = { _id: 'id1', status: 'Emprestado' };
      PatrimonioModel.findOneAndUpdate = jest
        .fn()
        .mockResolvedValue(atualizado);

      const resultado = await service.emprestarUnidade('id1', req);

      expect(resultado).toBe(atualizado);
      expect(PatrimonioModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'id1', status: 'Disponível' },
        { status: 'Emprestado' },
        { new: true },
      );
      expect(PatrimonioEventoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'emprestimo',
          status_novo: 'Emprestado',
        }),
      );
    });
  });

  describe('devolverUnidade', () => {
    it('deve lançar 400 se a unidade não estava emprestada', async () => {
      const localizacaoAtual = makeId();
      PatrimonioModel.findById = jest
        .fn()
        .mockResolvedValue({
          status: 'Disponível',
          localizacao: localizacaoAtual,
        });
      PatrimonioModel.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(service.devolverUnidade('id1', {}, req)).rejects.toThrow(
        'não está emprestada',
      );
    });

    it('deve devolver para a localização original quando nenhuma é informada', async () => {
      const localizacaoAtual = makeId();
      PatrimonioModel.findById = jest.fn().mockResolvedValue({
        status: 'Emprestado',
        localizacao: localizacaoAtual,
      });
      const atualizado = { status: 'Disponível' };
      PatrimonioModel.findOneAndUpdate = jest
        .fn()
        .mockResolvedValue(atualizado);

      const resultado = await service.devolverUnidade('id1', {}, req);

      expect(resultado).toBe(atualizado);
      expect(PatrimonioModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'id1', status: 'Emprestado' },
        { status: 'Disponível', localizacao: localizacaoAtual.toString() },
        { new: true },
      );
      expect(PatrimonioEventoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'devolucao' }),
      );
    });

    it('deve devolver para localizacaoRetorno quando informada', async () => {
      const localizacaoAtual = makeId();
      const localizacaoRetorno = makeId().toString();
      PatrimonioModel.findById = jest.fn().mockResolvedValue({
        status: 'Emprestado',
        localizacao: localizacaoAtual,
      });
      PatrimonioModel.findOneAndUpdate = jest
        .fn()
        .mockResolvedValue({ status: 'Disponível' });

      await service.devolverUnidade('id1', { localizacaoRetorno }, req);

      expect(PatrimonioModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'id1', status: 'Emprestado' },
        { status: 'Disponível', localizacao: localizacaoRetorno },
        { new: true },
      );
    });
  });
});
