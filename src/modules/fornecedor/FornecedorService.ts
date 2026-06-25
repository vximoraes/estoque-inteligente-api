import FornecedorRepository from './FornecedorRepository.js';
import { CustomError, HttpStatusCodes, messages } from '../../utils/helpers/index.js';
import type { Fornecedor, FornecedorUpdate } from './FornecedorSchema.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class FornecedorService {
  private repository: FornecedorRepository;

  constructor() {
    this.repository = new FornecedorRepository();
  }

  async criar(parsedData: Fornecedor, req: AuthenticatedRequest) {
    await this.validateNome(parsedData.nome, null, req);

    const dataToCreate = { ...parsedData, usuario: req.user_id };
    const data = await this.repository.criar(dataToCreate);

    return data;
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async atualizar(id: string, parsedData: FornecedorUpdate, req: AuthenticatedRequest) {
    await this.ensureSupplierExists(id, req);
    await this.validateNome(parsedData.nome ?? '', id, req);

    return await this.repository.atualizar(id, parsedData as Record<string, unknown>, req);
  }

  async inativar(id: string, req: AuthenticatedRequest) {
    await this.ensureSupplierExists(id, req);
    return await this.repository.atualizar(id, { ativo: false }, req);
  }

  async validateNome(nome: string, id: string | null = null, _req?: AuthenticatedRequest) {
    const fornecedorExistente = await this.repository.buscarPorNome(nome, id);
    if (fornecedorExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'nome',
        details: [{ path: 'nome', message: 'Nome já está em uso.' }],
        customMessage: 'Nome já está em uso.',
      });
    }
  }

  async ensureSupplierExists(id: string, _req?: AuthenticatedRequest) {
    const fornecedorExistente = await this.repository.buscarPorId(id);
    if (!fornecedorExistente) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Fornecedor',
        details: [],
        customMessage: messages.error.resourceNotFound('Fornecedor'),
      });
    }
    return fornecedorExistente;
  }
}

export default FornecedorService;
