import ItemController from '../../../modules/item/ItemController.js';
import ItemService from '../../../modules/item/ItemService.js';
import {
  ItemSchema,
  ItemUpdateSchema,
} from '../../../modules/item/ItemSchema.js';
import {
  ItemQuerySchema,
  ItemIdSchema,
} from '../../../modules/item/ItemQuerySchema.js';
import { CommonResponse } from '../../../utils/helpers/index.js';

jest.mock('../../../modules/item/ItemService.js');
jest.mock('../../../modules/item/ItemSchema.js');
jest.mock('../../../modules/item/ItemQuerySchema.js');
jest.mock('../../../utils/helpers/index.js', () => ({
  CommonResponse: {
    created: jest.fn(),
    success: jest.fn(),
  },
}));

describe('ItemController', () => {
  let controller, req, res, serviceMock;

  beforeEach(() => {
    controller = new ItemController();
    req = { body: {}, params: {}, query: {} };
    res = {};
    serviceMock = ItemService.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar item com dados válidos', async () => {
      const item = {
        nome: 'Resistor',
        toObject: () => ({ nome: 'Resistor', _id: '1', ativo: false }),
      };
      ItemSchema.parse.mockReturnValue({ nome: 'Resistor' });
      serviceMock.criar.mockResolvedValue(item);

      await controller.criar(req, res);

      expect(ItemSchema.parse).toHaveBeenCalledWith(req.body);
      expect(serviceMock.criar).toHaveBeenCalledWith({ nome: 'Resistor' }, req);
      expect(CommonResponse.created).toHaveBeenCalledWith(res, {
        nome: 'Resistor',
        _id: '1',
        ativo: false,
      });
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      ItemSchema.parse.mockImplementation(() => {
        throw { name: 'ZodError' };
      });
      await expect(controller.criar(req, res)).rejects.toEqual(
        expect.objectContaining({ name: 'ZodError' }),
      );
    });
  });

  describe('listar', () => {
    it('deve listar itens sem filtros', async () => {
      serviceMock.listar.mockResolvedValue([{ nome: 'Resistor' }]);
      await controller.listar(req, res);
      expect(serviceMock.listar).toHaveBeenCalledWith(req);
      expect(CommonResponse.success).toHaveBeenCalledWith(res, [
        { nome: 'Resistor' },
      ]);
    });

    it('deve validar id se presente', async () => {
      req.params = { id: '123' };
      ItemIdSchema.parse.mockReturnValue('123');
      serviceMock.listar.mockResolvedValue([{ nome: 'Resistor' }]);
      await controller.listar(req, res);
      expect(ItemIdSchema.parse).toHaveBeenCalledWith('123');
    });

    it('deve validar query se presente', async () => {
      req.query = { nome: 'Teste' };
      ItemQuerySchema.parseAsync.mockResolvedValue(req.query);
      serviceMock.listar.mockResolvedValue([{ nome: 'Resistor' }]);
      await controller.listar(req, res);
      expect(ItemQuerySchema.parseAsync).toHaveBeenCalledWith(req.query);
    });

    it('deve retornar erro 400 para filtro inválido', async () => {
      req.query = { nome: 123 };
      ItemQuerySchema.parseAsync.mockRejectedValue({ name: 'ZodError' });
      await expect(controller.listar(req, res)).rejects.toEqual(
        expect.objectContaining({ name: 'ZodError' }),
      );
    });
  });

  describe('atualizar', () => {
    it('deve atualizar item com dados válidos', async () => {
      req.params = { id: '1' };
      req.body = { nome: 'Atualizado' };
      ItemIdSchema.parse.mockReturnValue('1');
      ItemUpdateSchema.parse.mockReturnValue({ nome: 'Atualizado' });
      serviceMock.atualizar.mockResolvedValue({ nome: 'Atualizado' });

      await controller.atualizar(req, res);

      expect(ItemIdSchema.parse).toHaveBeenCalledWith('1');
      expect(ItemUpdateSchema.parse).toHaveBeenCalledWith(req.body);
      expect(serviceMock.atualizar).toHaveBeenCalledWith(
        '1',
        { nome: 'Atualizado' },
        req,
      );
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { nome: 'Atualizado' },
        200,
        'Item atualizado com sucesso. Porém, a quantidade só pode ser alterada por movimentação.',
      );
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      req.params = { id: '1' };
      ItemIdSchema.parse.mockReturnValue('1');
      ItemUpdateSchema.parse.mockImplementation(() => {
        throw { name: 'ZodError' };
      });
      await expect(controller.atualizar(req, res)).rejects.toEqual(
        expect.objectContaining({ name: 'ZodError' }),
      );
    });

    it('deve retornar erro 404 para item inexistente', async () => {
      req.params = { id: '1' };
      ItemIdSchema.parse.mockReturnValue('1');
      ItemUpdateSchema.parse.mockReturnValue({ nome: 'Atualizado' });
      serviceMock.atualizar.mockRejectedValue({ status: 404 });
      await expect(controller.atualizar(req, res)).rejects.toEqual(
        expect.objectContaining({ status: 404 }),
      );
    });
  });

  describe('inativar', () => {
    it('deve inativar item existente', async () => {
      req.params = { id: '1' };
      ItemIdSchema.parse.mockReturnValue('1');
      serviceMock.inativar.mockResolvedValue({ nome: 'Item', ativo: false });

      await controller.inativar(req, res);

      expect(ItemIdSchema.parse).toHaveBeenCalledWith('1');
      expect(serviceMock.inativar).toHaveBeenCalledWith('1', req);
      expect(CommonResponse.success).toHaveBeenCalledWith(
        res,
        { nome: 'Item', ativo: false },
        200,
        'Item inativado com sucesso.',
      );
    });

    it('deve retornar erro 404 ao tentar inativar item inexistente', async () => {
      req.params = { id: '1' };
      ItemIdSchema.parse.mockReturnValue('1');
      serviceMock.inativar.mockRejectedValue({ status: 404 });
      await expect(controller.inativar(req, res)).rejects.toEqual(
        expect.objectContaining({ status: 404 }),
      );
    });
  });

  describe('erros inesperados', () => {
    it('deve retornar erro 500 para falha inesperada em criar', async () => {
      ItemSchema.parse.mockReturnValue({ nome: 'Erro' });
      serviceMock.criar.mockRejectedValue({ status: 500 });
      await expect(controller.criar(req, res)).rejects.toEqual(
        expect.objectContaining({ status: 500 }),
      );
    });

    it('deve retornar erro 500 para falha inesperada em listar', async () => {
      serviceMock.listar.mockRejectedValue({ status: 500 });
      await expect(controller.listar(req, res)).rejects.toEqual(
        expect.objectContaining({ status: 500 }),
      );
    });

    it('deve retornar erro 500 para falha inesperada em atualizar', async () => {
      req.params = { id: '1' };
      ItemIdSchema.parse.mockReturnValue('1');
      ItemUpdateSchema.parse.mockReturnValue({ nome: 'Erro' });
      serviceMock.atualizar.mockRejectedValue({ status: 500 });
      await expect(controller.atualizar(req, res)).rejects.toEqual(
        expect.objectContaining({ status: 500 }),
      );
    });
  });
});
