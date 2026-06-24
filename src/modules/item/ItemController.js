import ItemService from './ItemService.js';
import {
  ItemQuerySchema,
  ItemIdSchema,
} from './ItemQuerySchema.js';
import {
  ItemSchema,
  ItemUpdateSchema,
} from './ItemSchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import { UsuarioIdSchema } from '../../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js';

class ItemController {
  constructor() {
    this.service = new ItemService();
  }

  async criar(req, res) {
    const parsedData = ItemSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    const itemLimpo = data.toObject();

    return CommonResponse.created(res, itemLimpo);
  }

  async listar(req, res) {
    const { id } = req.params || {};
    if (id) {
      ItemIdSchema.parse(id);
    }

    const query = req.query || {};
    if (Object.keys(query).length !== 0) {
      await ItemQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async stats(req, res) {
    const data = await this.service.stats(req);

    return CommonResponse.success(res, data);
  }

  async atualizar(req, res) {
    const { id } = req.params;
    ItemIdSchema.parse(id);

    const parsedData = ItemUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Item atualizado com sucesso. Porém, a quantidade só pode ser alterada por movimentação.',
    );
  }

  async inativar(req, res) {
    const { id } = req.params || {};
    ItemIdSchema.parse(id);

    const data = await this.service.inativar(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Item inativado com sucesso.',
    );
  }

  async uploadFoto(req, res) {
    const { id } = req.params || {};
    UsuarioIdSchema.parse(id);

    const data = await this.service.uploadFoto(req, id);
    return CommonResponse.success(res, data, 201, 'Foto enviada com sucesso.');
  }

  async deletarFoto(req, res) {
    const { id } = req.params || {};
    ItemIdSchema.parse(id);

    const data = await this.service.deletarFoto(req, id);

    return CommonResponse.success(res, data, 200, 'Foto deletada com sucesso.');
  }
}

export default ItemController;
