import type { Response } from 'express';
import EmprestimoService from './EmprestimoService.js';
import {
  EmprestimoSchema,
  DevolucaoEmprestimoSchema,
  AtualizarEmprestimoSchema,
} from './EmprestimoSchema.js';
import {
  EmprestimoIdSchema,
  EmprestimoQuerySchema,
  EmprestimoTendenciaQuerySchema,
} from './EmprestimoQuerySchema.js';
import { CommonResponse } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class EmprestimoController {
  private service: EmprestimoService;

  constructor() {
    this.service = new EmprestimoService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = EmprestimoSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);
    return CommonResponse.created(res, data);
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      EmprestimoIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await EmprestimoQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async tendencia(req: AuthenticatedRequest, res: Response) {
    await EmprestimoTendenciaQuerySchema.parseAsync(req.query ?? {});
    const data = await this.service.tendencia(req);
    return CommonResponse.success(res, data);
  }

  async devolver(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
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

  async desfazerDevolucao(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    EmprestimoIdSchema.parse(id);

    const data = await this.service.desfazerDevolucao(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Devolucao desfeita com sucesso.',
    );
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    EmprestimoIdSchema.parse(id);

    const parsedData = AtualizarEmprestimoSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Emprestimo atualizado com sucesso.',
    );
  }

  async excluir(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    EmprestimoIdSchema.parse(id);

    const data = await this.service.excluir(id);
    return CommonResponse.success(
      res,
      data,
      200,
      'Emprestimo excluido com sucesso.',
    );
  }
}

export default EmprestimoController;
