import PatrimonioController from '../PatrimonioController.js';
import PatrimonioService from '../PatrimonioService.js';
import {
  PatrimonioSchema,
  PatrimonioLoteSchema,
  PatrimonioUpdateSchema,
  PatrimonioStatusSchema,
  PatrimonioLocalizacaoSchema,
} from '../PatrimonioSchema.js';
import {
  PatrimonioQuerySchema,
  PatrimonioIdSchema,
} from '../PatrimonioQuerySchema.js';
import { CommonResponse } from '../../../utils/helpers/index.js';

jest.mock('../PatrimonioService.js');
jest.mock('../PatrimonioSchema.js');
jest.mock('../PatrimonioQuerySchema.js');
jest.mock('../../../utils/helpers/index.js', () => ({
  CommonResponse: {
    created: jest.fn(),
    success: jest.fn(),
  },
}));

describe('PatrimonioController', () => {
  let controller, req, res, serviceMock;

  beforeEach(() => {
    controller = new PatrimonioController();
    req = { body: {}, params: {}, query: {} };
    res = {};
    serviceMock = PatrimonioService.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve validar payload e criar patrimônio', async () => {
      PatrimonioSchema.parse.mockReturnValue({ numero_patrimonio: 'NB-01' });
      serviceMock.criar.mockResolvedValue({ _id: 'p1' });

      await controller.criar(req, res);

      expect(serviceMock.criar).toHaveBeenCalledWith(
        { numero_patrimonio: 'NB-01' },
        req,
      );
      expect(CommonResponse.created).toHaveBeenCalledWith(res, { _id: 'p1' });
    });
  });

  describe('criarLote', () => {
    it('deve validar payload e criar lote com mensagem de quantidade', async () => {
      PatrimonioLoteSchema.parse.mockReturnValue({ quantidade: 2 });
      serviceMock.criarLote.mockResolvedValue([{ _id: 'p1' }, { _id: 'p2' }]);

      await controller.criarLote(req, res);

      expect(CommonResponse.created).toHaveBeenCalledWith(
        res,
        [{ _id: 'p1' }, { _id: 'p2' }],
        '2 unidade(s) de patrimônio criada(s) com sucesso.',
      );
    });
  });

  describe('listar', () => {
    it('deve validar id quando presente', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      serviceMock.listar.mockResolvedValue({ _id: 'p1' });

      await controller.listar(req, res);

      expect(PatrimonioIdSchema.parse).toHaveBeenCalledWith('p1');
    });

    it('deve validar query quando presente', async () => {
      req.query = { status: 'Disponível' };
      PatrimonioQuerySchema.parseAsync = jest.fn().mockResolvedValue({});
      serviceMock.listar.mockResolvedValue({ docs: [] });

      await controller.listar(req, res);

      expect(PatrimonioQuerySchema.parseAsync).toHaveBeenCalledWith(req.query);
    });
  });

  describe('buscarEventos', () => {
    it('deve validar id e retornar eventos', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      serviceMock.buscarEventos.mockResolvedValue({ docs: [] });

      await controller.buscarEventos(req, res);

      expect(serviceMock.buscarEventos).toHaveBeenCalledWith('p1', req);
      expect(CommonResponse.success).toHaveBeenCalledWith(res, { docs: [] });
    });
  });

  describe('atualizar', () => {
    it('deve validar id e payload, atualizar patrimônio', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      PatrimonioUpdateSchema.parse.mockReturnValue({ modelo: 'Novo' });
      serviceMock.atualizar.mockResolvedValue({ _id: 'p1' });

      await controller.atualizar(req, res);

      expect(serviceMock.atualizar).toHaveBeenCalledWith(
        'p1',
        { modelo: 'Novo' },
        req,
      );
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { _id: 'p1' },
        200,
        'Patrimônio atualizado com sucesso.',
      );
    });
  });

  describe('atualizarStatus', () => {
    it('deve validar id e payload, transicionar status', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      PatrimonioStatusSchema.parse.mockReturnValue({ status: 'Manutenção' });
      serviceMock.transicionar.mockResolvedValue({ _id: 'p1' });

      await controller.atualizarStatus(req, res);

      expect(serviceMock.transicionar).toHaveBeenCalledWith(
        'p1',
        { status: 'Manutenção' },
        req,
      );
    });
  });

  describe('atualizarLocalizacao', () => {
    it('deve validar id e payload, transferir localização', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      PatrimonioLocalizacaoSchema.parse.mockReturnValue({ localizacao: 'l1' });
      serviceMock.transferir.mockResolvedValue({ _id: 'p1' });

      await controller.atualizarLocalizacao(req, res);

      expect(serviceMock.transferir).toHaveBeenCalledWith(
        'p1',
        { localizacao: 'l1' },
        req,
      );
    });
  });

  describe('inativar', () => {
    it('deve validar id e inativar patrimônio', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      serviceMock.inativar.mockResolvedValue({ _id: 'p1' });

      await controller.inativar(req, res);

      expect(serviceMock.inativar).toHaveBeenCalledWith('p1', req);
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { _id: 'p1' },
        200,
        'Patrimônio inativado com sucesso.',
      );
    });
  });

  describe('uploadFoto', () => {
    it('deve validar id e enviar foto', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      serviceMock.uploadFoto.mockResolvedValue({ imagem: 'url' });

      await controller.uploadFoto(req, res);

      expect(serviceMock.uploadFoto).toHaveBeenCalledWith(req, 'p1');
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { imagem: 'url' },
        201,
        'Foto enviada com sucesso.',
      );
    });
  });

  describe('deletarFoto', () => {
    it('deve validar id e deletar foto', async () => {
      req.params = { id: 'p1' };
      PatrimonioIdSchema.parse = jest.fn();
      serviceMock.deletarFoto.mockResolvedValue({ imagem: '' });

      await controller.deletarFoto(req, res);

      expect(serviceMock.deletarFoto).toHaveBeenCalledWith(req, 'p1');
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { imagem: '' },
        200,
        'Foto deletada com sucesso.',
      );
    });
  });
});
