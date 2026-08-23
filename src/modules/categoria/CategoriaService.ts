import CategoriaRepository from './CategoriaRepository.js';
import ItemModel from '../item/ItemModel.js';
import {
  CustomError,
  HttpStatusCodes,
  messages,
} from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Categoria, CategoriaUpdate } from './CategoriaSchema.js';

class CategoriaService {
  private repository: CategoriaRepository;

  constructor() {
    this.repository = new CategoriaRepository();
  }

  async criar(parsedData: Categoria, req: AuthenticatedRequest) {
    await this.validateNome(parsedData.nome, null, req);
    return await this.repository.criar({ ...parsedData, usuario: req.user_id });
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async atualizar(
    id: string,
    parsedData: CategoriaUpdate,
    req: AuthenticatedRequest,
  ) {
    await this.ensureCategoryExists(id, req);
    if (parsedData.nome) {
      await this.validateNome(parsedData.nome, id, req);
    }
    return await this.repository.atualizar(
      id,
      parsedData as Record<string, unknown>,
      req,
    );
  }

  async inativar(id: string, req: AuthenticatedRequest) {
    await this.ensureCategoryExists(id, req);

    const existeItemAtivo = await ItemModel.exists({
      categoria: id,
      ativo: true,
    });

    if (existeItemAtivo) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'resourceInUse',
        field: 'Categoria',
        details: [],
        customMessage: 'Categoria vinculada a itens ativos.',
      });
    }

    return await this.repository.atualizar(id, { ativo: false }, req);
  }

  private async validateNome(
    nome: string,
    id: string | null = null,
    req: AuthenticatedRequest,
  ) {
    const categoriaExistente = await this.repository.buscarPorNome(
      nome,
      id,
      req,
    );
    if (categoriaExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'nome',
        details: [{ path: 'nome', message: 'Nome já está em uso.' }],
        customMessage: 'Nome já está em uso.',
      });
    }
  }

  private async ensureCategoryExists(id: string, req: AuthenticatedRequest) {
    const categoriaExistente = await this.repository.buscarPorId(
      id,
      false,
      req,
    );
    if (!categoriaExistente) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Categoria',
        details: [],
        customMessage: messages.error.resourceNotFound('Categoria'),
      });
    }
    return categoriaExistente;
  }
}

export default CategoriaService;
