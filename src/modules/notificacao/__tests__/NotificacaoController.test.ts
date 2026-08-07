import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import NotificacaoController from '../NotificacaoController.js';
import NotificacaoService from '../NotificacaoService.js';
import { CommonResponse } from '../../../utils/helpers/index.js';
import { NotificacaoSchema } from '../NotificacaoSchema.js';

// Mockando CommonResponse e HttpStatusCodes
jest.mock('../../../utils/helpers/index.js', () => ({
  CommonResponse: {
    success: jest.fn(),
    error: jest.fn(),
    created: jest.fn(),
  },
  HttpStatusCodes: {
    OK: { code: 200, message: 'OK' },
    CREATED: { code: 201, message: 'Created' },
    BAD_REQUEST: { code: 400, message: 'Bad Request' },
    NOT_FOUND: { code: 404, message: 'Not Found' },
    INTERNAL_SERVER_ERROR: { code: 500, message: 'Internal Server Error' },
  },
}));

describe('NotificacaoController', () => {
  let controller;
  let mockService;
  let mockReq, mockRes;

  beforeEach(() => {
    mockService = new NotificacaoService();
    controller = new NotificacaoController();
    controller.service = mockService;

    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('deve retornar lista de notificações', async () => {
      const mockNotificacoes = [{ id: '1', mensagem: 'Teste' }];
      mockService.listarTodas = jest.fn().mockResolvedValue(mockNotificacoes);

      await controller.listar(mockReq, mockRes);

      expect(mockService.listarTodas).toHaveBeenCalledWith(mockReq);
      expect(CommonResponse.success).toHaveBeenCalledWith(
        mockRes,
        mockNotificacoes,
      );
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar notificação quando encontrada', async () => {
      mockReq.params.id = '123';
      const mockNotificacao = { id: '123', mensagem: 'Teste' };
      mockService.buscarPorId = jest.fn().mockResolvedValue(mockNotificacao);

      await controller.buscarPorId(mockReq, mockRes);

      expect(mockService.buscarPorId).toHaveBeenCalledWith('123', mockReq);
      expect(CommonResponse.success).toHaveBeenCalledWith(
        mockRes,
        mockNotificacao,
      );
    });

    it('deve retornar erro 404 quando não encontrada', async () => {
      mockReq.params.id = '123';
      mockService.buscarPorId = jest.fn().mockResolvedValue(null);

      await controller.buscarPorId(mockReq, mockRes);

      expect(CommonResponse.error).toHaveBeenCalledWith(
        mockRes,
        404,
        'resourceNotFound',
        'Notificação',
      );
    });
  });

  describe('criar', () => {
    it('deve criar nova notificação aplicando valores padrão do schema', async () => {
      const inputData = {
        mensagem: 'Nova notificação',
        usuario: new mongoose.Types.ObjectId().toHexString(), // ID válido para ObjectId
      };
      mockReq.body = inputData;

      const parsedData = NotificacaoSchema.parse(inputData);

      mockService.criar = jest
        .fn()
        .mockResolvedValue({ ...parsedData, id: '1' });

      await controller.criar(mockReq, mockRes);

      expect(mockService.criar).toHaveBeenCalledWith(parsedData, mockReq);
      expect(CommonResponse.created).toHaveBeenCalledWith(mockRes, {
        ...parsedData,
        id: '1',
      });
    });
  });

  describe('marcarComoVisualizada', () => {
    it('deve marcar como visualizada', async () => {
      mockReq.params.id = '123';
      const mockNotificacao = { id: '123', visualizada: false };
      const mockUpdated = { id: '123', visualizada: true };

      mockService.buscarPorId = jest.fn().mockResolvedValue(mockNotificacao);
      mockService.marcarComoVisualizada = jest
        .fn()
        .mockResolvedValue(mockUpdated);

      await controller.marcarComoVisualizada(mockReq, mockRes);

      expect(mockService.buscarPorId).toHaveBeenCalledWith('123', mockReq);
      expect(mockService.marcarComoVisualizada).toHaveBeenCalledWith(
        '123',
        mockReq,
      );
      expect(CommonResponse.success).toHaveBeenCalledWith(mockRes, mockUpdated);
    });
  });
});
