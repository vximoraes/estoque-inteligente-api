import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/paginationConfig.js';
import MovimentacaoFilterBuilder from './MovimentacaoFilterBuilder.js';
import MovimentacaoModel, {
  type MovimentacaoDocument,
  type IMovimentacaoModel,
} from './MovimentacaoModel.js';
import { MOVIMENTACAO_SORT_FIELDS } from './MovimentacaoQuerySchema.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import { resolveSort } from '../../utils/resolveSort.js';
import { resolverJanelaMensal } from '../../utils/janelaMensal.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

export interface MovimentacaoResumo {
  total_movimentacoes: number;
  entradas: number;
  saidas: number;
  quantidade_entrada: number;
  quantidade_saida: number;
  saldo: number;
}

export interface MovimentacaoTendenciaPonto {
  mes: string;
  entradas: number;
  saidas: number;
  quantidade_entrada: number;
  quantidade_saida: number;
}

class MovimentacaoRepository {
  private model: IMovimentacaoModel;

  constructor({
    movimentacaoModel = MovimentacaoModel,
  }: { movimentacaoModel?: IMovimentacaoModel } = {}) {
    this.model = movimentacaoModel;
  }

  async criar(parsedData: Record<string, unknown>) {
    const movimentacao = new this.model(parsedData);
    const movimentacaoSalva = await movimentacao.save();

    return await this.model
      .findById(movimentacaoSalva._id)
      .populate('item')
      .populate('localizacao');
  }

  async listar(req: AuthenticatedRequest) {
    const id = req?.params?.['id'] ?? null;

    if (id) {
      const data = await this.model
        .findOne({ _id: id })
        .populate('item')
        .populate('localizacao');

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Movimentacao',
          details: [],
          customMessage: messages.error.resourceNotFound('Movimentacao'),
        });
      }

      return { ...data.toObject() };
    }

    const query = req.query as Record<string, string | undefined>;
    const { tipo, data, data_inicio, data_fim, quantidade, item, localizacao } =
      query;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );

    const filterBuilder = new MovimentacaoFilterBuilder()
      .comTipo(tipo ?? '')
      .comData(data ?? '')
      .comDataInicio(data_inicio ? new Date(data_inicio) : undefined)
      .comDataFim(data_fim ? new Date(data_fim) : undefined)
      .comQuantidade(quantidade ?? '');

    await filterBuilder.comItem(item ?? '');
    await filterBuilder.comLocalizacao(localizacao ?? '');

    if (typeof filterBuilder.build !== 'function') {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Movimentacao',
        details: [],
        customMessage: messages.error.internalServerError('Movimentacao'),
      });
    }

    const filtros = { ...filterBuilder.build() };

    const options = {
      page: parseInt(page, 10),
      limit: limite,
      populate: ['item', 'localizacao', 'usuario'],
      sort: resolveSort(query['ordenar'], MOVIMENTACAO_SORT_FIELDS, {
        data_hora: -1,
      }),
    };

    const resultado = await this.model.paginate(
      filtros as mongoose.FilterQuery<MovimentacaoDocument>,
      options,
    );

    return {
      ...resultado,
      docs: resultado.docs.map((doc) => ({ ...doc.toObject() })),
    };
  }

  async resumo(req: AuthenticatedRequest): Promise<MovimentacaoResumo> {
    const query = req.query as Record<string, string | undefined>;
    const { tipo, data_inicio, data_fim, item, localizacao } = query;

    const filterBuilder = new MovimentacaoFilterBuilder()
      .comTipo(tipo ?? '')
      .comDataInicio(data_inicio ? new Date(data_inicio) : undefined)
      .comDataFim(data_fim ? new Date(data_fim) : undefined);

    await filterBuilder.comItem(item ?? '');
    await filterBuilder.comLocalizacao(localizacao ?? '');

    const match =
      filterBuilder.build() as mongoose.FilterQuery<MovimentacaoDocument>;

    const porTipo = (await this.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 },
          quantidade: { $sum: '$quantidade' },
        },
      },
    ])) as Array<{
      _id: 'entrada' | 'saida';
      count: number;
      quantidade: number;
    }>;

    const resumo: MovimentacaoResumo = {
      total_movimentacoes: 0,
      entradas: 0,
      saidas: 0,
      quantidade_entrada: 0,
      quantidade_saida: 0,
      saldo: 0,
    };

    for (const row of porTipo) {
      resumo.total_movimentacoes += row.count;
      if (row._id === 'entrada') {
        resumo.entradas = row.count;
        resumo.quantidade_entrada = row.quantidade;
      } else if (row._id === 'saida') {
        resumo.saidas = row.count;
        resumo.quantidade_saida = row.quantidade;
      }
    }
    resumo.saldo = resumo.quantidade_entrada - resumo.quantidade_saida;

    return resumo;
  }

  async tendencia(
    req: AuthenticatedRequest,
  ): Promise<MovimentacaoTendenciaPonto[]> {
    const query = req.query as Record<string, string | undefined>;
    const { dataInicio, dataFim, chavesMes } = resolverJanelaMensal({
      meses: query['meses'] ? parseInt(query['meses'], 10) : undefined,
      data_inicio: query['data_inicio']
        ? new Date(query['data_inicio'])
        : undefined,
      data_fim: query['data_fim'] ? new Date(query['data_fim']) : undefined,
    });

    const porMesTipo = (await this.model.aggregate([
      { $match: { data_hora: { $gte: dataInicio, $lte: dataFim } } },
      {
        $group: {
          _id: {
            mes: { $dateToString: { format: '%Y-%m', date: '$data_hora' } },
            tipo: '$tipo',
          },
          count: { $sum: 1 },
          quantidade: { $sum: '$quantidade' },
        },
      },
    ])) as Array<{
      _id: { mes: string; tipo: 'entrada' | 'saida' };
      count: number;
      quantidade: number;
    }>;

    const porMes = new Map<string, MovimentacaoTendenciaPonto>();
    for (const chave of chavesMes) {
      porMes.set(chave, {
        mes: chave,
        entradas: 0,
        saidas: 0,
        quantidade_entrada: 0,
        quantidade_saida: 0,
      });
    }

    for (const row of porMesTipo) {
      const ponto = porMes.get(row._id.mes);
      if (!ponto) continue;
      if (row._id.tipo === 'entrada') {
        ponto.entradas = row.count;
        ponto.quantidade_entrada = row.quantidade;
      } else {
        ponto.saidas = row.count;
        ponto.quantidade_saida = row.quantidade;
      }
    }

    return Array.from(porMes.values());
  }

  async buscarPorId(
    id: string,
    _includeTokens = false,
    _req?: AuthenticatedRequest,
  ) {
    const movimentacao = await this.model.findOne({ _id: id });

    if (!movimentacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Movimentacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Movimentacao'),
      });
    }

    return movimentacao;
  }
}

export default MovimentacaoRepository;
