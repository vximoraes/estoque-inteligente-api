import mongoose, { type ClientSession } from 'mongoose';
import MovimentacaoRepository from './MovimentacaoRepository.js';
import Item from '../item/ItemModel.js';
import Estoque from '../estoque/EstoqueModel.js';
import Localizacao from '../localizacao/LocalizacaoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Movimentacao } from './MovimentacaoSchema.js';

const LIMITE_ESTOQUE = 999999999;

interface FiltroEstoque {
  item: Movimentacao['item'];
  localizacao: Movimentacao['localizacao'];
}

class MovimentacaoService {
  private repository: MovimentacaoRepository;

  constructor() {
    this.repository = new MovimentacaoRepository();
  }

  async criar(
    parsedData: Movimentacao,
    req: AuthenticatedRequest,
    session?: ClientSession,
  ) {
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

    const gravar = async (sessao: ClientSession) => {
      if (parsedData.tipo === 'saida') {
        await this.reservarSaida(filtroEstoque, quantidade, req, sessao);
      } else if (parsedData.tipo === 'entrada') {
        await this.somarEntrada(filtroEstoque, quantidade, req, sessao);
      }
      return await this.repository.criar(
        { ...parsedData, data_hora: new Date(), usuario: req.user_id },
        sessao,
      );
    };

    if (session) return await gravar(session);

    const movimentacao = await mongoose.connection.transaction(gravar);
    await Estoque.atualizarQuantidadeItem(item._id);
    return movimentacao;
  }

  private async reservarSaida(
    filtroEstoque: FiltroEstoque,
    quantidade: number,
    req: AuthenticatedRequest,
    sessao: ClientSession,
  ) {
    const reservado = await Estoque.findOneAndUpdate(
      { ...filtroEstoque, quantidade: { $gte: quantidade } },
      { $inc: { quantidade: -quantidade }, $set: { usuario: req.user_id } },
      { new: true, session: sessao },
    );
    if (reservado) return;

    const estoqueAtual = await Estoque.findOne(filtroEstoque, null, {
      session: sessao,
    });
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

  private async somarEntrada(
    filtroEstoque: FiltroEstoque,
    quantidade: number,
    req: AuthenticatedRequest,
    sessao: ClientSession,
  ) {
    await Estoque.updateOne(
      filtroEstoque,
      { $setOnInsert: { quantidade: 0, usuario: req.user_id } },
      { upsert: true, session: sessao },
    );
    const reservado = await Estoque.findOneAndUpdate(
      { ...filtroEstoque, quantidade: { $lte: LIMITE_ESTOQUE - quantidade } },
      { $inc: { quantidade }, $set: { usuario: req.user_id } },
      { new: true, session: sessao },
    );
    if (reservado) return;

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
