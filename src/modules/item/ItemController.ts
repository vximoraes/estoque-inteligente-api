import type { Response } from 'express';
import ItemService from './ItemService.js';
import { ItemQuerySchema, ItemIdSchema } from './ItemQuerySchema.js';
import { ItemSchema, ItemUpdateSchema } from './ItemSchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import { UsuarioIdSchema } from '../usuario/UsuarioQuerySchema.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class ItemController {
  private service: ItemService;

  constructor() {
    this.service = new ItemService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = ItemSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    return CommonResponse.created(res, data?.toObject() ?? data);
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      ItemIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await ItemQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async stats(req: AuthenticatedRequest, res: Response) {
    const data = await this.service.stats(req);
    return CommonResponse.success(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
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

  async inativar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    ItemIdSchema.parse(id);

    const data = await this.service.inativar(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Item inativado com sucesso.',
    );
  }

  async uploadFoto(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    UsuarioIdSchema.parse(id);

    const data = await this.service.uploadFoto(req, id);
    return CommonResponse.success(res, data, 201, 'Foto enviada com sucesso.');
  }

  async deletarFoto(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    ItemIdSchema.parse(id);

    const data = await this.service.deletarFoto(req, id);

    return CommonResponse.success(res, data, 200, 'Foto deletada com sucesso.');
  }
}

export default ItemController;
