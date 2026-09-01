import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/paginationConfig.js';
import FornecedorFilterBuilder from './FornecedorFilterBuilder.js';
import FornecedorModel, { type FornecedorDocument } from './FornecedorModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import { resolveSort } from '../../utils/resolveSort.js';
import { FORNECEDOR_SORT_FIELDS } from './FornecedorQuerySchema.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

type FornecedorModel = mongoose.PaginateModel<FornecedorDocument>;

class FornecedorRepository {
  private model: FornecedorModel;

  constructor({
    fornecedorModel = FornecedorModel as unknown as FornecedorModel,
  } = {}) {
    this.model = fornecedorModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const fornecedor = new this.model(parsedData);
    return await fornecedor.save();
  }

  async listar(req: AuthenticatedRequest) {
    const id = req.params?.['id'] ?? null;

    if (id) {
      const data = await this.model.findOne({ _id: id, ativo: true });

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Fornecedor',
          details: [],
          customMessage: messages.error.resourceNotFound('Fornecedor'),
        });
      }

      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const { nome, contato, descricao, url } = query;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new FornecedorFilterBuilder()
      .comNome(nome ?? '')
      .comContato(contato ?? '')
      .comDescricao(descricao ?? '')
      .comUrl(url ?? '');

    const filtros = { ...filterBuilder.build(), ativo: true };
    const options = {
      page: parseInt(page, 10),
      limit: limite,
      sort: resolveSort(query['ordenar'], FORNECEDOR_SORT_FIELDS, { nome: 1 }),
    };

    const resultado = await this.model.paginate(filtros, options);

    return {
      ...resultado,
      docs: resultado.docs.map((doc) => {
        const fornecedorObj =
          typeof doc.toObject === 'function' ? doc.toObject() : doc;
        return { ...fornecedorObj };
      }),
    };
  }

  async atualizar(
    id: string,
    parsedData: Record<string, unknown>,
    _req?: AuthenticatedRequest,
  ) {
    const fornecedor = await this.model
      .findOneAndUpdate({ _id: id }, parsedData, { new: true })
      .lean();
    if (!fornecedor) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Fornecedor',
        details: [],
        customMessage: messages.error.resourceNotFound('Fornecedor'),
      });
    }
    return fornecedor;
  }

  async buscarPorNome(
    nome: string,
    idIgnorado?: string | null,
    _req?: AuthenticatedRequest,
  ) {
    const filtro: mongoose.FilterQuery<FornecedorDocument> = {
      nome,
      ativo: true,
    };

    if (idIgnorado) {
      filtro['_id'] = { $ne: idIgnorado };
    }

    return await this.model.findOne(filtro);
  }

  async buscarPorId(
    id: string,
    _includeTokens = false,
    _req?: AuthenticatedRequest,
  ) {
    const fornecedor = await this.model.findOne({ _id: id, ativo: true });

    if (!fornecedor) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Fornecedor',
        details: [],
        customMessage: messages.error.resourceNotFound('Fornecedor'),
      });
    }

    return fornecedor;
  }
}

export default FornecedorRepository;
