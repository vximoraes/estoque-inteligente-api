import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../../config/paginationConfig.js';
import EmprestimoFilterBuilder from './EmprestimoFilterBuilder.js';
import EmprestimoModel, { type EmprestimoDocument } from './EmprestimoModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import { resolveSort } from '../../utils/resolveSort.js';
import { resolverJanelaMensal } from '../../utils/janelaMensal.js';
import { EMPRESTIMO_SORT_FIELDS } from './EmprestimoQuerySchema.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

type EmprestimoPlain = Record<string, unknown>;

export interface EmprestimoTendenciaPonto {
  mes: string;
  emprestimos: number;
  devolucoes: number;
}

interface FacetGrupo {
  _id: string;
  count: number;
}

class EmprestimoRepository {
  private model: mongoose.PaginateModel<EmprestimoDocument>;

  constructor({
    emprestimoModel = EmprestimoModel,
  }: { emprestimoModel?: mongoose.PaginateModel<EmprestimoDocument> } = {}) {
    this.model = emprestimoModel;
  }

  calcularStatus(emprestimo: EmprestimoPlain | null): string {
    if (!emprestimo) return 'Ativo';
    if ((emprestimo['quantidade_aberta'] as number) <= 0) return 'Devolvido';
    if (!emprestimo['data_prevista_devolucao']) return 'Ativo';
    return new Date(emprestimo['data_prevista_devolucao'] as string | Date) <
      new Date()
      ? 'Atrasado'
      : 'Ativo';
  }

  async criar(
    parsedData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const emprestimo = new this.model(parsedData);
    const emprestimoSalvo = await emprestimo.save();

    const documento = await this.model
      .findById(emprestimoSalvo._id)
      .populate('item')
      .populate('localizacao')
      .populate('usuario_responsavel', 'nome email')
      .populate('patrimonio', 'numero_patrimonio status');

    if (!documento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Emprestimo',
        details: [],
        customMessage: messages.error.resourceNotFound('Emprestimo'),
      });
    }

    const objeto = documento.toObject() as unknown as EmprestimoPlain;
    return { ...objeto, status: this.calcularStatus(objeto) };
  }

  async listar(req: AuthenticatedRequest) {
    const id = req?.params?.['id'] ?? null;

    if (id) {
      const data = await this.model
        .findOne({ _id: id, ativo: true })
        .populate('item')
        .populate('localizacao')
        .populate('usuario_responsavel', 'nome email')
        .populate('patrimonio', 'numero_patrimonio status');

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Emprestimo',
          details: [],
          customMessage: messages.error.resourceNotFound('Emprestimo'),
        });
      }

      const objeto = data.toObject() as unknown as EmprestimoPlain;
      return { ...objeto, status: this.calcularStatus(objeto) };
    }

    const query = req.query as Record<string, string | undefined>;
    const {
      busca,
      item,
      tipo_controle,
      localizacao,
      solicitante_nome,
      apenas_abertos,
      atrasados,
      data_saida_inicio,
      data_saida_fim,
    } = query;
    const page = query['page'] ?? '1';
    const limite = Math.min(
      parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
      PAGINATION_MAX_LIMIT,
    );
    const dataSaidaInicio = data_saida_inicio
      ? new Date(data_saida_inicio)
      : null;
    const dataSaidaFim = data_saida_fim ? new Date(data_saida_fim) : null;

    const filterBuilder = new EmprestimoFilterBuilder()
      .comSolicitanteNome(solicitante_nome ?? '')
      .comApenasAbertos(apenas_abertos === 'true')
      .comAtrasados(atrasados === 'true')
      .comTipoControle(tipo_controle ?? '')
      .comDataSaidaInicio(dataSaidaInicio)
      .comDataSaidaFim(dataSaidaFim);

    await filterBuilder.comItem(item ?? '');
    await filterBuilder.comLocalizacao(localizacao ?? '');
    await filterBuilder.comBusca(busca ?? '');

    const filtros = { ...filterBuilder.build(), ativo: true };

    const options = {
      page: parseInt(page, 10),
      limit: limite,
      populate: ['item', 'localizacao', 'usuario_responsavel', 'patrimonio'],
      sort: resolveSort(query['ordenar'], EMPRESTIMO_SORT_FIELDS, {
        data_saida: -1,
      }),
    };

    const resultado = await this.model.paginate(
      filtros as mongoose.FilterQuery<EmprestimoDocument>,
      options,
    );

    return {
      ...resultado,
      docs: resultado.docs.map((doc) => {
        const obj = doc.toObject() as unknown as EmprestimoPlain;
        return { ...obj, status: this.calcularStatus(obj) };
      }),
    };
  }

  async buscarPorId(id: string) {
    const emprestimo = await this.model
      .findOne({ _id: id, ativo: true })
      .populate('item')
      .populate('localizacao')
      .populate('usuario_responsavel', 'nome email')
      .populate('patrimonio', 'numero_patrimonio status');

    if (!emprestimo) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Emprestimo',
        details: [],
        customMessage: messages.error.resourceNotFound('Emprestimo'),
      });
    }

    return emprestimo;
  }

  async atualizarDevolucao(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const emprestimoAtualizado = await this.model
      .findOneAndUpdate({ _id: id, ativo: true }, payload, { new: true })
      .populate('item')
      .populate('localizacao')
      .populate('usuario_responsavel', 'nome email')
      .populate('patrimonio', 'numero_patrimonio status');

    if (!emprestimoAtualizado) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Emprestimo',
        details: [],
        customMessage: messages.error.resourceNotFound('Emprestimo'),
      });
    }

    const objeto =
      emprestimoAtualizado.toObject() as unknown as EmprestimoPlain;
    return { ...objeto, status: this.calcularStatus(objeto) };
  }

  async atualizar(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const emprestimo = await this.model.findOne({ _id: id, ativo: true });

    if (!emprestimo) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Emprestimo',
        details: [],
        customMessage: messages.error.resourceNotFound('Emprestimo'),
      });
    }

    const atualizado = await this.model
      .findOneAndUpdate({ _id: id, ativo: true }, payload, { new: true })
      .populate('item')
      .populate('localizacao')
      .populate('usuario_responsavel', 'nome email')
      .populate('patrimonio', 'numero_patrimonio status');

    if (!atualizado) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Emprestimo',
        details: [],
        customMessage: messages.error.resourceNotFound('Emprestimo'),
      });
    }

    const objeto = atualizado.toObject() as unknown as EmprestimoPlain;
    return { ...objeto, status: this.calcularStatus(objeto) };
  }

  async excluir(id: string) {
    const emprestimo = await this.model.findOne({ _id: id, ativo: true });

    if (!emprestimo) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Emprestimo',
        details: [],
        customMessage: messages.error.resourceNotFound('Emprestimo'),
      });
    }

    await this.model.findOneAndUpdate({ _id: id }, { ativo: false });
    return { message: 'Emprestimo excluido com sucesso.' };
  }

  async tendencia(
    req: AuthenticatedRequest,
  ): Promise<EmprestimoTendenciaPonto[]> {
    const query = req.query as Record<string, string | undefined>;
    const { dataInicio, dataFim, chavesMes } = resolverJanelaMensal({
      meses: query['meses'] ? parseInt(query['meses'], 10) : undefined,
      data_inicio: query['data_inicio']
        ? new Date(query['data_inicio'])
        : undefined,
      data_fim: query['data_fim'] ? new Date(query['data_fim']) : undefined,
    });

    const resultado = (await this.model.aggregate([
      { $match: { ativo: true } },
      {
        $facet: {
          emprestados: [
            { $match: { data_saida: { $gte: dataInicio, $lte: dataFim } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m', date: '$data_saida' },
                },
                count: { $sum: 1 },
              },
            },
          ],
          devolvidos: [
            {
              $match: {
                data_devolucao_total: {
                  $ne: null,
                  $gte: dataInicio,
                  $lte: dataFim,
                },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m',
                    date: '$data_devolucao_total',
                  },
                },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ])) as Array<{ emprestados: FacetGrupo[]; devolvidos: FacetGrupo[] }>;

    const { emprestados = [], devolvidos = [] } = resultado[0] ?? {};

    const porMes = new Map<string, EmprestimoTendenciaPonto>();
    for (const chave of chavesMes) {
      porMes.set(chave, { mes: chave, emprestimos: 0, devolucoes: 0 });
    }

    for (const grupo of emprestados) {
      const ponto = porMes.get(grupo._id);
      if (ponto) ponto.emprestimos = grupo.count;
    }
    for (const grupo of devolvidos) {
      const ponto = porMes.get(grupo._id);
      if (ponto) ponto.devolucoes = grupo.count;
    }

    return Array.from(porMes.values());
  }
}

export default EmprestimoRepository;
