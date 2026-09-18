import EmprestimoController from '../EmprestimoController.js';
import EmprestimoService from '../EmprestimoService.js';
import {
  EmprestimoSchema,
  DevolucaoEmprestimoSchema,
  AtualizarEmprestimoSchema,
} from '../EmprestimoSchema.js';
import {
  EmprestimoIdSchema,
  EmprestimoQuerySchema,
  EmprestimoTendenciaQuerySchema,
} from '../EmprestimoQuerySchema.js';
import { CommonResponse } from '../../../utils/helpers/index.js';

jest.mock('../EmprestimoService.js');
jest.mock('../EmprestimoSchema.js');
jest.mock('../EmprestimoQuerySchema.js');
jest.mock('../../../utils/helpers/index.js', () => ({
  CommonResponse: {
    created: jest.fn(),
    success: jest.fn(),
  },
}));

describe('EmprestimoController', () => {
  let controller, req, res, serviceMock;

  beforeEach(() => {
    controller = new EmprestimoController();
    req = { body: {}, params: {}, query: {} };
    res = {};
    serviceMock = EmprestimoService.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve validar payload e criar empréstimo', async () => {
      EmprestimoSchema.parse.mockReturnValue({ item: 'i1' });
      serviceMock.criar.mockResolvedValue({ _id: 'e1' });

      await controller.criar(req, res);

      expect(EmprestimoSchema.parse).toHaveBeenCalledWith(req.body);
      expect(serviceMock.criar).toHaveBeenCalledWith({ item: 'i1' }, req);
      expect(CommonResponse.created).toHaveBeenCalledWith(res, { _id: 'e1' });
    });
  });

  describe('listar', () => {
    it('deve validar id quando presente', async () => {
      req.params = { id: 'e1' };
      EmprestimoIdSchema.parse = jest.fn();
      serviceMock.listar.mockResolvedValue({ _id: 'e1' });

      await controller.listar(req, res);

      expect(EmprestimoIdSchema.parse).toHaveBeenCalledWith('e1');
    });

    it('deve validar query quando presente', async () => {
      req.query = { busca: 'fulano' };
      EmprestimoQuerySchema.parseAsync = jest.fn().mockResolvedValue({});
      serviceMock.listar.mockResolvedValue({ docs: [] });

      await controller.listar(req, res);

      expect(EmprestimoQuerySchema.parseAsync).toHaveBeenCalledWith(req.query);
      expect(CommonResponse.success).toHaveBeenCalledWith(res, { docs: [] });
    });
  });

  describe('tendencia', () => {
    it('deve validar query e retornar tendência', async () => {
      EmprestimoTendenciaQuerySchema.parseAsync = jest
        .fn()
        .mockResolvedValue({});
      serviceMock.tendencia.mockResolvedValue({ pontos: [] });

      await controller.tendencia(req, res);

      expect(EmprestimoTendenciaQuerySchema.parseAsync).toHaveBeenCalledWith(
        req.query,
      );
      expect(CommonResponse.success).toHaveBeenCalledWith(res, {
        pontos: [],
      });
    });
  });

  describe('devolver', () => {
    it('deve validar id e payload, registrar devolução', async () => {
      req.params = { id: 'e1' };
      req.body = { quantidade_devolvida: 2 };
      EmprestimoIdSchema.parse = jest.fn();
      DevolucaoEmprestimoSchema.parse.mockReturnValue({
        quantidade_devolvida: 2,
      });
      serviceMock.devolver.mockResolvedValue({ _id: 'e1' });

      await controller.devolver(req, res);

      expect(serviceMock.devolver).toHaveBeenCalledWith(
        'e1',
        { quantidade_devolvida: 2 },
        req,
      );
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { _id: 'e1' },
        200,
        'Devolucao de emprestimo registrada com sucesso.',
      );
    });
  });

  describe('desfazerDevolucao', () => {
    it('deve validar id e desfazer devolução', async () => {
      req.params = { id: 'e1' };
      EmprestimoIdSchema.parse = jest.fn();
      serviceMock.desfazerDevolucao.mockResolvedValue({ _id: 'e1' });

      await controller.desfazerDevolucao(req, res);

      expect(serviceMock.desfazerDevolucao).toHaveBeenCalledWith('e1', req);
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { _id: 'e1' },
        200,
        'Devolucao desfeita com sucesso.',
      );
    });
  });

  describe('atualizar', () => {
    it('deve validar id e payload, atualizar empréstimo', async () => {
      req.params = { id: 'e1' };
      EmprestimoIdSchema.parse = jest.fn();
      AtualizarEmprestimoSchema.parse.mockReturnValue({
        solicitante_nome: 'Novo',
      });
      serviceMock.atualizar.mockResolvedValue({ _id: 'e1' });

      await controller.atualizar(req, res);

      expect(serviceMock.atualizar).toHaveBeenCalledWith(
        'e1',
        { solicitante_nome: 'Novo' },
        req,
      );
    });
  });

  describe('excluir', () => {
    it('deve validar id e excluir empréstimo', async () => {
      req.params = { id: 'e1' };
      EmprestimoIdSchema.parse = jest.fn();
      serviceMock.excluir.mockResolvedValue({ _id: 'e1' });

      await controller.excluir(req, res);

      expect(serviceMock.excluir).toHaveBeenCalledWith('e1');
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { _id: 'e1' },
        200,
        'Emprestimo excluido com sucesso.',
      );
    });
  });
});
