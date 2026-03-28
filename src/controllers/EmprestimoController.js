import EmprestimoService from '../services/EmprestimoService.js';
import {
  EmprestimoSchema,
  DevolucaoEmprestimoSchema,
} from '../utils/validators/schemas/zod/EmprestimoSchema.js';
import {
  EmprestimoIdSchema,
  EmprestimoQuerySchema,
} from '../utils/validators/schemas/zod/querys/EmprestimoQuerySchema.js';
import { CommonResponse } from '../utils/helpers/index.js';

class EmprestimoController {
  constructor() {
    this.service = new EmprestimoService();
  }

  async criar(req, res) {
    const parsedData = EmprestimoSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    return CommonResponse.created(res, data);
  }

  async listar(req, res) {
    const { id } = req.params || {};
    if (id) {
      EmprestimoIdSchema.parse(id);
    }

    const query = req.query || {};
    if (Object.keys(query).length !== 0) {
      await EmprestimoQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async devolver(req, res) {
    const { id } = req.params || {};
    EmprestimoIdSchema.parse(id);

    const parsedData = DevolucaoEmprestimoSchema.parse(req.body);
    const data = await this.service.devolver(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Devolucao de emprestimo registrada com sucesso.',
    );
  }
}

export default EmprestimoController;
