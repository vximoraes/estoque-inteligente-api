import RotaService from './RotaService.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import {
  RotaQuerySchema,
  RotaIdSchema,
} from './RotaQuerySchema.js';
import {
  RotaSchema,
  RotaUpdateSchema,
} from './RotaSchema.js';

class RotaController {
  constructor() {
    this.service = new RotaService();
  }

  async listar(req, res) {
    const { id } = req.params || null;
    if (id) {
      RotaIdSchema.parse(id);
    }

    const query = req.query || {};
    if (Object.keys(query).length !== 0) {
      const validatedQuery = RotaQuerySchema.parse(req.query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async criar(req, res) {
    const parsedData = RotaSchema.parse(req.body);
    const data = await this.service.criar(parsedData);
    return CommonResponse.created(res, data);
  }

  async atualizar(req, res) {
    const { id } = req.params || null;
    if (id) {
      RotaIdSchema.parse(id);
    }

    const parsedData = RotaUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(parsedData, id);
    return CommonResponse.success(res, data);
  }

  async deletar(req, res) {
    const { id } = req.params || null;
    if (id) {
      RotaIdSchema.parse(id);
    }

    const data = await this.service.deletar(req, id);
    return CommonResponse.success(res, data);
  }
}

export default RotaController;
