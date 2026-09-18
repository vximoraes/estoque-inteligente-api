import RotaController from '../RotaController.js';
import RotaService from '../RotaService.js';
import { RotaQuerySchema, RotaIdSchema } from '../RotaQuerySchema.js';
import { RotaSchema, RotaUpdateSchema } from '../RotaSchema.js';
import { CommonResponse } from '../../../utils/helpers/index.js';

jest.mock('../RotaService.js');
jest.mock('../RotaQuerySchema.js');
jest.mock('../RotaSchema.js');
jest.mock('../../../utils/helpers/index.js', () => ({
  CommonResponse: {
    created: jest.fn(),
    success: jest.fn(),
  },
}));

describe('RotaController', () => {
  let controller, req, res, serviceMock;

  beforeEach(() => {
    controller = new RotaController();
    req = { body: {}, params: {}, query: {} };
    res = {};
    serviceMock = RotaService.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('deve validar id quando presente', async () => {
      req.params = { id: 'r1' };
      RotaIdSchema.parse = jest.fn();
      serviceMock.listar.mockResolvedValue({ _id: 'r1' });

      await controller.listar(req, res);

      expect(RotaIdSchema.parse).toHaveBeenCalledWith('r1');
      expect(CommonResponse.success).toHaveBeenCalledWith(res, { _id: 'r1' });
    });

    it('deve validar query quando presente', async () => {
      req.query = { rota: 'itens' };
      RotaQuerySchema.parse = jest.fn().mockReturnValue({});
      serviceMock.listar.mockResolvedValue({ docs: [] });

      await controller.listar(req, res);

      expect(RotaQuerySchema.parse).toHaveBeenCalledWith(req.query);
    });
  });

  describe('criar', () => {
    it('deve validar payload e criar rota', async () => {
      RotaSchema.parse.mockReturnValue({ rota: 'itens' });
      serviceMock.criar.mockResolvedValue({ _id: 'r1' });

      await controller.criar(req, res);

      expect(serviceMock.criar).toHaveBeenCalledWith({ rota: 'itens' });
      expect(CommonResponse.created).toHaveBeenCalledWith(res, { _id: 'r1' });
    });
  });

  describe('atualizar', () => {
    it('deve validar id e payload, atualizar rota', async () => {
      req.params = { id: 'r1' };
      RotaIdSchema.parse = jest.fn();
      RotaUpdateSchema.parse.mockReturnValue({ rota: 'novo' });
      serviceMock.atualizar.mockResolvedValue({ _id: 'r1', rota: 'novo' });

      await controller.atualizar(req, res);

      expect(serviceMock.atualizar).toHaveBeenCalledWith(
        { rota: 'novo' },
        'r1',
      );
      expect(CommonResponse.success).toHaveBeenCalledWith(res, {
        _id: 'r1',
        rota: 'novo',
      });
    });
  });

  describe('deletar', () => {
    it('deve validar id e deletar rota', async () => {
      req.params = { id: 'r1' };
      RotaIdSchema.parse = jest.fn();
      serviceMock.deletar.mockResolvedValue({ _id: 'r1' });

      await controller.deletar(req, res);

      expect(serviceMock.deletar).toHaveBeenCalledWith(req, 'r1');
      expect(CommonResponse.success).toHaveBeenCalledWith(res, { _id: 'r1' });
    });
  });
});
