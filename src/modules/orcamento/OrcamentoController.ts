import type { Response } from 'express';
import OrcamentoService from './OrcamentoService.js';
import {
  OrcamentoQuerySchema,
  OrcamentoIdSchema,
} from './OrcamentoQuerySchema.js';
import {
  OrcamentoSchema,
  OrcamentoUpdateSchema,
  ItemOrcamentoSchema,
  ItemOrcamentoUpdateSchema,
} from './OrcamentoSchema.js';
import { CommonResponse, CustomError } from '../../utils/helpers/index.js';
import Item from '../item/ItemModel.js';
import Fornecedor from '../fornecedor/FornecedorModel.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class OrcamentoController {
  private service: OrcamentoService;

  constructor() {
    this.service = new OrcamentoService();
  }

  async criar(req: AuthenticatedRequest, res: Response) {
    const parsedData = OrcamentoSchema.parse(req.body);

    const itensProcessados: Record<string, unknown>[] = [];
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

    const orcamentoParaSalvar: Record<string, unknown> = {
      nome: parsedData.nome,
      descricao: parsedData.descricao,
      itens: itensProcessados,
    };

    const data = await this.service.criar(orcamentoParaSalvar, req);
    const orcamentoLimpo = data!.toObject();

    return CommonResponse.created(res, orcamentoLimpo);
  }

  async listar(req: AuthenticatedRequest, res: Response) {
    const id = req.params?.['id'] as string | undefined;
    if (id) {
      OrcamentoIdSchema.parse(id);
    }

    const query = req.query ?? {};
    if (Object.keys(query).length !== 0) {
      await OrcamentoQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async atualizar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    const parsedData = OrcamentoUpdateSchema.parse(req.body);
    const orcamentoAtualizado = await this.service.atualizar(
      id,
      parsedData as Record<string, unknown>,
      req,
    );
    return CommonResponse.success(
      res,
      orcamentoAtualizado,
      200,
      'Orçamento atualizado com sucesso.',
    );
  }

  async deletar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    OrcamentoIdSchema.parse(id);
    const data = await this.service.deletar(id, req);
    return CommonResponse.success(
      res,
      data,
      200,
      'Orçamento excluído com sucesso.',
    );
  }

  async inativar(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    OrcamentoIdSchema.parse(id);
    const data = await this.service.inativar(id, req);
    return CommonResponse.success(
      res,
      data,
      200,
      'Orçamento inativado com sucesso.',
    );
  }

  async adicionarItem(req: AuthenticatedRequest, res: Response) {
    const orcamentoId = req.params['orcamentoId'] as string;
    const parsedItem = ItemOrcamentoSchema.parse(req.body);

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

    const novoItem: Record<string, unknown> = {
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

  async atualizarItem(req: AuthenticatedRequest, res: Response) {
    const orcamentoId = req.params['orcamentoId'] as string;
    const id = req.params['id'] as string;
    const itemData = req.body as Record<string, unknown>;

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

    const itemAtualizado: Record<string, unknown> = {
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

  async removerItem(req: AuthenticatedRequest, res: Response) {
    const orcamentoId = req.params['orcamentoId'] as string;
    const id = req.params['id'] as string;
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
