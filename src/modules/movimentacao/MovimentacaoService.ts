import MovimentacaoRepository from './MovimentacaoRepository.js';
import Item from '../item/ItemModel.js';
import Estoque from '../estoque/EstoqueModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Movimentacao } from './MovimentacaoSchema.js';

class MovimentacaoService {
  private repository: MovimentacaoRepository;

  constructor() {
    this.repository = new MovimentacaoRepository();
  }

  async criar(parsedData: Movimentacao, req: AuthenticatedRequest) {
    const item = await Item.findOne({ _id: parsedData.item });
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: messages.error.resourceNotFound('Item'),
      });
    }

    const estoqueAtual = await Estoque.findOne({
      item: parsedData.item,
      localizacao: parsedData.localizacao,
    });

    const quantidadeDisponivel = estoqueAtual ? estoqueAtual.quantidade : 0;
    const quantidade = parsedData.quantidade ?? 0;

    if (parsedData.tipo === 'saida') {
      if (quantidadeDisponivel < quantidade) {
        throw new CustomError({
          statusCode: 400,
          errorType: 'validationError',
          field: 'quantidade',
          details: [
            {
              path: 'quantidade',
              message: `Estoque insuficiente (disponível: ${quantidadeDisponivel})`,
            },
          ],
          customMessage: `Estoque insuficiente (disponível: ${quantidadeDisponivel})`,
        });
      }
    } else if (parsedData.tipo === 'entrada') {
      const quantidadeResultante = quantidadeDisponivel + quantidade;
      if (quantidadeResultante > 999999999) {
        throw new CustomError({
          statusCode: 400,
          errorType: 'validationError',
          field: 'quantidade',
          details: [{ path: 'quantidade', message: `Limite de estoque excedido (máx: 999.999.999)` }],
          customMessage: `Limite de estoque excedido (máx: 999.999.999)`,
        });
      }
    }

    const now = new Date();
    now.setHours(now.getHours() - 4);
    now.setDate(now.getDate() - 1);
    const data_hora = now.toISOString().slice(0, 23).replace('T', ' ');

    return await this.repository.criar({
      ...parsedData,
      data_hora,
      usuario: req.user_id,
    });
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }
}

export default MovimentacaoService;
