import EstoqueController from '../EstoqueController.js';
import EstoqueService from '../EstoqueService.js';
import { EstoqueQuerySchema, EstoqueIdSchema } from '../EstoqueQuerySchema.js';
import { CommonResponse } from '../../../utils/helpers/index.js';

jest.mock('../EstoqueService.js');
jest.mock('../EstoqueQuerySchema.js');
jest.mock('../../../utils/helpers/index.js', () => ({
  CommonResponse: {
    success: jest.fn(),
  },
}));

describe('EstoqueController', () => {
  let controller, req, res, serviceMock;

  beforeEach(() => {
    controller = new EstoqueController();
    req = { params: {}, query: {} };
    res = {};
    serviceMock = EstoqueService.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('deve listar sem validar query quando vazia', async () => {
      serviceMock.listar.mockResolvedValue({ docs: [] });

      await controller.listar(req, res);

      expect(EstoqueQuerySchema.parseAsync).not.toHaveBeenCalled();
      expect(serviceMock.listar).toHaveBeenCalledWith(req);
      expect(CommonResponse.success).toHaveBeenCalledWith(res, { docs: [] });
    });

    it('deve validar query quando presente', async () => {
      req.query = { localizacao: 'loc1' };
      EstoqueQuerySchema.parseAsync = jest.fn().mockResolvedValue({});
      serviceMock.listar.mockResolvedValue({ docs: [] });

      await controller.listar(req, res);

      expect(EstoqueQuerySchema.parseAsync).toHaveBeenCalledWith(req.query);
    });
  });

  describe('buscarPorId', () => {
    it('deve validar o id e retornar o estoque', async () => {
      req.params = { id: 'est1' };
      EstoqueIdSchema.parse = jest.fn().mockReturnValue('est1');
      serviceMock.buscarPorId.mockResolvedValue({ _id: 'est1' });

      await controller.buscarPorId(req, res);

      expect(EstoqueIdSchema.parse).toHaveBeenCalledWith('est1');
      expect(serviceMock.buscarPorId).toHaveBeenCalledWith(req);
      expect(CommonResponse.success).toHaveBeenCalledWith(res, { _id: 'est1' });
    });
  });

  describe('listarPorItem', () => {
    it('deve validar o itemId e listar estoques do item', async () => {
      req.params = { itemId: 'item1' };
      EstoqueIdSchema.parse = jest.fn().mockReturnValue('item1');
      serviceMock.listarPorItem.mockResolvedValue({ docs: [] });

      await controller.listarPorItem(req, res);

      expect(EstoqueIdSchema.parse).toHaveBeenCalledWith('item1');
      expect(serviceMock.listarPorItem).toHaveBeenCalledWith(req);
      expect(CommonResponse.success).toHaveBeenCalledWith(res, { docs: [] });
    });
  });
});
