import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/PaginationConfig.js';
import OrcamentoFilterBuilder from './OrcamentoFilterBuilder.js';
import OrcamentoModel, {
  type OrcamentoDocument,
  type IItemOrcamento,
} from './OrcamentoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

class OrcamentoRepository {
  private model: mongoose.PaginateModel<OrcamentoDocument>;

  constructor({
    orcamentoModel = OrcamentoModel,
  }: { orcamentoModel?: mongoose.PaginateModel<OrcamentoDocument> } = {}) {
    this.model = orcamentoModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const orcamento = new this.model(parsedData);
    const orcamentoSalvo = await orcamento.save();
    return await this.model.findById(orcamentoSalvo._id);
  }

  async listar(req: AuthenticatedRequest) {
    const id = req.params?.['id'] ?? null;

    if (id) {
      const data = await this.model.findOne({ _id: id, ativo: true });
      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Orçamento',
          details: [],
          customMessage: messages.error.resourceNotFound('Orçamento'),
        });
      }
      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const { nome, valorMin, valorMax, dataInicio, dataFim, page = '1' } = query;
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new OrcamentoFilterBuilder()
      .comNome(nome ?? '')
      .comValor(
        valorMin != null ? Number(valorMin) : undefined,
        valorMax != null ? Number(valorMax) : undefined,
      )
      .comPeriodo(dataInicio, dataFim);

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.internalServerError('Orçamento'),
      });
    }

    const filtros: mongoose.FilterQuery<OrcamentoDocument> = {
      ...filterBuilder.build(),
      ativo: true,
    };
    const options = { page: parseInt(page), limit: limite, sort: { nome: 1 } };

    const resultado = await this.model.paginate(filtros, options);
    return {
      ...resultado,
      docs: resultado.docs.map((doc) => ({
        ...(typeof doc.toObject === 'function' ? doc.toObject() : doc),
      })),
    };
  }

  async atualizar(
    id: string,
    parsedData: Record<string, unknown>,
    _req?: AuthenticatedRequest,
  ) {
    const orcamento = await this.model
      .findOneAndUpdate({ _id: id }, parsedData, { new: true })
      .lean();
    if (!orcamento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.resourceNotFound('Orçamento'),
      });
    }
    return orcamento;
  }

  async deletar(id: string, _req?: AuthenticatedRequest) {
    const orcamento = await this.model.findOne({ _id: id, ativo: true });
    if (!orcamento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.resourceNotFound('Orçamento'),
      });
    }
    await this.model.findOneAndDelete({ _id: id });
    return orcamento;
  }

  async adicionarItem(
    orcamentoId: string,
    novoItem: Record<string, unknown>,
    _req?: AuthenticatedRequest,
  ) {
    const orcamento = await this.model.findOne({
      _id: orcamentoId,
      ativo: true,
    });
    if (!orcamento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.resourceNotFound('Orçamento'),
      });
    }
    orcamento.itens.push(novoItem as unknown as IItemOrcamento);
    orcamento.total = parseFloat(
      orcamento.itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
    );
    await orcamento.save();
    return orcamento;
  }

  async atualizarItem(
    orcamentoId: string,
    itemId: string,
    itemAtualizado: Record<string, unknown>,
    _req?: AuthenticatedRequest,
  ) {
    const orcamento = await this.model.findOne({
      _id: orcamentoId,
      ativo: true,
    });
    if (!orcamento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.resourceNotFound('Orçamento'),
      });
    }

    const itens = Array.isArray(orcamento.itens) ? [...orcamento.itens] : [];
    const idx = itens.findIndex(
      (c) => c && c._id && c._id.toString() === itemId,
    );
    if (idx === -1) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: 'Item não encontrado.',
      });
    }

    const existing = itens[idx];
    if (!existing) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: 'Item não encontrado.',
      });
    }

    const existingRaw =
      typeof (
        existing as unknown as { toObject?: () => Record<string, unknown> }
      ).toObject === 'function'
        ? (
            existing as unknown as { toObject: () => Record<string, unknown> }
          ).toObject()
        : { ...existing };
    itens[idx] = {
      ...existingRaw,
      ...itemAtualizado,
    } as unknown as IItemOrcamento;

    orcamento.itens = itens as OrcamentoDocument['itens'];
    orcamento.total = parseFloat(
      itens.reduce((acc, comp) => acc + (comp.subtotal ?? 0), 0).toFixed(2),
    );
    await orcamento.save();
    return orcamento;
  }

  async removerItem(
    orcamentoId: string,
    itemId: string,
    _req?: AuthenticatedRequest,
  ) {
    const orcamento = await this.model.findOne({
      _id: orcamentoId,
      ativo: true,
    });
    if (!orcamento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.resourceNotFound('Orçamento'),
      });
    }
    orcamento.itens = orcamento.itens.filter(
      (c) => c._id?.toString() !== itemId,
    ) as OrcamentoDocument['itens'];
    orcamento.total = parseFloat(
      orcamento.itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
    );
    await orcamento.save();
    return orcamento;
  }

  async buscarPorId(
    id: string,
    _includeTokens = false,
    _req?: AuthenticatedRequest,
  ) {
    const orcamento = await this.model.findOne({ _id: id, ativo: true });
    if (!orcamento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.resourceNotFound('Orçamento'),
      });
    }
    return orcamento;
  }
}

export default OrcamentoRepository;
