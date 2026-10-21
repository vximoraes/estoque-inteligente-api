import MovimentacaoRepository from './MovimentacaoRepository.js';
import Item from '../item/ItemModel.js';
import Estoque from '../estoque/EstoqueModel.js';
import Localizacao from '../localizacao/LocalizacaoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Movimentacao } from './MovimentacaoSchema.js';

const LIMITE_ESTOQUE = 999999999;

class MovimentacaoService {
  private repository: MovimentacaoRepository;

  constructor() {
    this.repository = new MovimentacaoRepository();
  }

  async criar(parsedData: Movimentacao, req: AuthenticatedRequest) {
    const item = await Item.findOne({ _id: parsedData.item, ativo: true });
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: messages.error.resourceNotFound('Item'),
      });
    }

    const localizacaoAtiva = await Localizacao.exists({
      _id: parsedData.localizacao,
      ativo: true,
    });
    if (!localizacaoAtiva) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Localizacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Localização'),
      });
    }

    const quantidade = parsedData.quantidade ?? 0;
    const filtroEstoque = {
      item: parsedData.item,
      localizacao: parsedData.localizacao,
    };

    if (parsedData.tipo === 'saida') {
      const reservado = await Estoque.findOneAndUpdate(
        { ...filtroEstoque, quantidade: { $gte: quantidade } },
        { $inc: { quantidade: -quantidade }, $set: { usuario: req.user_id } },
        { new: true },
      );
      if (!reservado) {
        const estoqueAtual = await Estoque.findOne(filtroEstoque);
        const quantidadeDisponivel = estoqueAtual?.quantidade ?? 0;
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
      const somarEntrada = () =>
        Estoque.findOneAndUpdate(
          {
            ...filtroEstoque,
            quantidade: { $lte: LIMITE_ESTOQUE - quantidade },
          },
          { $inc: { quantidade }, $set: { usuario: req.user_id } },
          { new: true },
        );
      let reservado = await somarEntrada();
      if (!reservado && !(await Estoque.exists(filtroEstoque))) {
        try {
          reservado = await Estoque.create({
            ...filtroEstoque,
            quantidade,
            usuario: req.user_id,
          });
        } catch {
          reservado = await somarEntrada();
        }
      }
      if (!reservado) {
        throw new CustomError({
          statusCode: 400,
          errorType: 'validationError',
          field: 'quantidade',
          details: [
            {
              path: 'quantidade',
              message: `Limite de estoque excedido (máx: 999.999.999)`,
            },
          ],
          customMessage: `Limite de estoque excedido (máx: 999.999.999)`,
        });
      }
    }

    const ajuste =
      parsedData.tipo === 'saida'
        ? quantidade
        : parsedData.tipo === 'entrada'
          ? -quantidade
          : 0;
    try {
      const movimentacao = await this.repository.criar({
        ...parsedData,
        data_hora: new Date(),
        usuario: req.user_id,
      });
      await Estoque.atualizarQuantidadeItem(item._id);
      return movimentacao;
    } catch (erro) {
      if (ajuste !== 0) {
        await Estoque.updateOne(filtroEstoque, {
          $inc: { quantidade: ajuste },
        });
      }
      throw erro;
    }
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async resumo(req: AuthenticatedRequest) {
    return await this.repository.resumo(req);
  }

  async tendencia(req: AuthenticatedRequest) {
    return await this.repository.tendencia(req);
  }
}

export default MovimentacaoService;
