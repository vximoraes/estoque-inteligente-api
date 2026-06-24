import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import OrcamentoFilterBuilder from './OrcamentoFilterBuilder.js';
import OrcamentoModel from './OrcamentoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';

class OrcamentoRepository {
  constructor({ orcamentoModel = OrcamentoModel } = {}) {
    this.model = orcamentoModel;
  }

  async criar(parsedData) {
    const orcamento = new this.model(parsedData);
    const orcamentoSalvo = await orcamento.save();
    return await this.model.findById(orcamentoSalvo._id);
  }

  async listar(req) {
    const id = req.params.id || null;

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

      const dataWithStats = {
        ...data.toObject(),
      };

      return dataWithStats;
    }

    const { nome, page = 1 } = req.query;
    const limite = Math.min(parseInt(req.query.limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);

    const filterBuilder = new OrcamentoFilterBuilder().comNome(nome || '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.internalServerError('Orçamento'),
      });
    }

    const filtros = { ...filterBuilder.build(), ativo: true };

    const options = {
      page: parseInt(page),
      limit: parseInt(limite),
      sort: { nome: 1 },
    };

    const resultado = await this.model.paginate(filtros, options);

    resultado.docs = resultado.docs.map((doc) => {
      const orcamentoObj =
        typeof doc.toObject === 'function' ? doc.toObject() : doc;

      return {
        ...orcamentoObj,
      };
    });

    return resultado;
  }

  async atualizar(id, parsedData, req) {
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

  async deletar(id, req) {
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

  async adicionarItem(orcamentoId, novoItem, req) {
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

    orcamento.itens.push(novoItem);
    orcamento.total = parseFloat(
      orcamento.itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
    );
    await orcamento.save();

    return orcamento;
  }

  async atualizarItem(orcamentoId, itemId, itemAtualizado, req) {
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

    const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
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

    itens[idx] = {
      ...(typeof itens[idx].toObject === 'function'
        ? itens[idx].toObject()
        : itens[idx]),
      ...itemAtualizado,
    };
    orcamento.itens = itens;
    orcamento.total = parseFloat(
      itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
    );
    await orcamento.save();

    return orcamento;
  }

  async removerItem(orcamentoId, itemId, req) {
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
      (c) => c._id.toString() !== itemId,
    );
    orcamento.total = parseFloat(
      orcamento.itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
    );
    await orcamento.save();

    return orcamento;
  }

  async buscarPorId(id, includeTokens = false, req) {
    const query = this.model.findOne({ _id: id, ativo: true });
    const orcamento = await query;
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
