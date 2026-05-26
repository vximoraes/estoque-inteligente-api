import OrcamentoService from '../services/OrcamentoService.js';
import {
  OrcamentoQuerySchema,
  OrcamentoIdSchema,
} from '../utils/validators/schemas/zod/querys/OrcamentoQuerySchema.js';
import {
  OrcamentoSchema,
  OrcamentoUpdateSchema,
  ItemOrcamentoSchema,
  ItemOrcamentoUpdateSchema,
} from '../utils/validators/schemas/zod/OrcamentoSchema.js';
import { CommonResponse, CustomError } from '../utils/helpers/index.js';
import Item from '../models/Item.js';
import Fornecedor from '../models/Fornecedor.js';

class OrcamentoController {
  constructor() {
    this.service = new OrcamentoService();
  }

  async criar(req, res) {
    const parsedData = OrcamentoSchema.parse(req.body);

    const itensProcessados = [];
    for (const comp of parsedData.itens) {
      const item = await Item.findById(comp.item);
      if (!item) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'item',
          details: [
            {
              path: 'item',
              message: `Item com ID ${comp.item} não encontrado.`,
            },
          ],
          customMessage: `Item com ID ${comp.item} não encontrado.`,
        });
      }

      const fornecedor = await Fornecedor.findById(comp.fornecedor);
      if (!fornecedor) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'fornecedor',
          details: [
            {
              path: 'fornecedor',
              message: `Fornecedor com ID ${comp.fornecedor} não encontrado.`,
            },
          ],
          customMessage: `Fornecedor com ID ${comp.fornecedor} não encontrado.`,
        });
      }

      itensProcessados.push({
        item: comp.item,
        nome: item.nome,
        fornecedor: comp.fornecedor,
        quantidade: comp.quantidade,
        valor_unitario: comp.valor_unitario,
      });
    }

    const orcamentoParaSalvar = {
      nome: parsedData.nome,
      descricao: parsedData.descricao,
      itens: itensProcessados,
    };

    const data = await this.service.criar(orcamentoParaSalvar, req);
    const orcamentoLimpo = data.toObject();

    return CommonResponse.created(res, orcamentoLimpo);
  }

  async listar(req, res) {
    const { id } = req.params || {};
    if (id) {
      OrcamentoIdSchema.parse(id);
    }

    const query = req.query || {};
    if (Object.keys(query).length !== 0) {
      await OrcamentoQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    return CommonResponse.success(res, data);
  }

  async atualizar(req, res) {
    const { id } = req.params;

    const parsedData = OrcamentoUpdateSchema.parse(req.body);
    const orcamentoAtualizado = await this.service.atualizar(
      id,
      parsedData,
      req,
    );

    return CommonResponse.success(
      res,
      orcamentoAtualizado,
      200,
      'Orçamento atualizado com sucesso.',
    );
  }

  async deletar(req, res) {
    const { id } = req.params || {};
    OrcamentoIdSchema.parse(id);
    const data = await this.service.deletar(id, req);
    return CommonResponse.success(
      res,
      data,
      200,
      'Orçamento excluído com sucesso.',
    );
  }

  async inativar(req, res) {
    const { id } = req.params || {};
    OrcamentoIdSchema.parse(id);

    const data = await this.service.inativar(id, req);

    return CommonResponse.success(
      res,
      data,
      200,
      'Orçamento inativado com sucesso.',
    );
  }

  async adicionarItem(req, res) {
    const { orcamentoId } = req.params;
    const itemData = req.body;
    const parsedItem = ItemOrcamentoSchema.parse(itemData);

    const item = await Item.findById(parsedItem.item);
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'item',
        details: [
          {
            path: 'item',
            message: `Item com ID ${parsedItem.item} não encontrado.`,
          },
        ],
        customMessage: `Item com ID ${parsedItem.item} não encontrado.`,
      });
    }

    const fornecedor = await Fornecedor.findById(parsedItem.fornecedor);
    if (!fornecedor) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'fornecedor',
        details: [
          {
            path: 'fornecedor',
            message: `Fornecedor com ID ${parsedItem.fornecedor} não encontrado.`,
          },
        ],
        customMessage: `Fornecedor com ID ${parsedItem.fornecedor} não encontrado.`,
      });
    }

    const novoItem = {
      item: parsedItem.item,
      nome: item.nome,
      fornecedor: parsedItem.fornecedor,
      quantidade: parsedItem.quantidade,
      valor_unitario: parsedItem.valor_unitario,
    };

    const orcamentoAtualizado = await this.service.adicionarItem(
      orcamentoId,
      novoItem,
      req,
    );
    return CommonResponse.success(
      res,
      orcamentoAtualizado,
      200,
      'Item adicionado com sucesso.',
    );
  }

  async atualizarItem(req, res) {
    const { orcamentoId, id } = req.params;
    const itemData = req.body;
    if (!itemData || Object.keys(itemData).length === 0) {
      return CommonResponse.error(res, 400, 'validationError', 'item', [
        { message: 'Nenhum campo enviado para atualização.' },
      ]);
    }
    const parsedItem = ItemOrcamentoUpdateSchema.parse(itemData);

    const oldItem = await this.service.getItemById(orcamentoId, id, req);
    if (!oldItem) {
      return CommonResponse.error(res, 404, 'resourceNotFound', 'item', [
        { message: 'Item não encontrado.' },
      ]);
    }

    if (
      parsedItem.fornecedor &&
      parsedItem.fornecedor !== oldItem.fornecedor.toString()
    ) {
      const fornecedor = await Fornecedor.findById(parsedItem.fornecedor);
      if (!fornecedor) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'fornecedor',
          details: [
            {
              path: 'fornecedor',
              message: `Fornecedor com ID ${parsedItem.fornecedor} não encontrado.`,
            },
          ],
          customMessage: `Fornecedor com ID ${parsedItem.fornecedor} não encontrado.`,
        });
      }
    }

    const itemAtualizado = {
      ...oldItem,
      ...parsedItem,
      _id: id,
    };

    const orcamentoAtualizado = await this.service.atualizarItem(
      orcamentoId,
      id,
      itemAtualizado,
      req,
    );
    return CommonResponse.success(
      res,
      orcamentoAtualizado,
      200,
      'Item atualizado com sucesso.',
    );
  }

  async removerItem(req, res) {
    const { orcamentoId, id } = req.params;
    const orcamentoAtualizado = await this.service.removerItem(
      orcamentoId,
      id,
      req,
    );
    return CommonResponse.success(
      res,
      orcamentoAtualizado,
      200,
      'Item removido com sucesso.',
    );
  }
}

export default OrcamentoController;
