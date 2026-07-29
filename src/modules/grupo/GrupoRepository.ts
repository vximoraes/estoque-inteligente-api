import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';
import GrupoModel, { type GrupoDocument, type IGrupoPermissao } from './GrupoModel.js';
import UsuarioModel, { type UsuarioDocument } from '../usuario/UsuarioModel.js';
import RotaModel, { type RotaDocument } from '../rota/RotaModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import GrupoFilterBuilder from './GrupoFilterBuilder.js';
import type mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../utils/types.js';

type GrupoPermissaoInput = { rota: string; dominio?: string | null };

class GrupoRepository {
  private model: mongoose.PaginateModel<GrupoDocument>;
  private rotaModel: mongoose.PaginateModel<RotaDocument>;
  private usuarioModel: mongoose.PaginateModel<UsuarioDocument>;

  constructor({
    grupoModel = GrupoModel,
    rotaModel = RotaModel,
    usuarioModel = UsuarioModel,
  }: {
    grupoModel?: mongoose.PaginateModel<GrupoDocument>;
    rotaModel?: mongoose.PaginateModel<RotaDocument>;
    usuarioModel?: mongoose.PaginateModel<UsuarioDocument>;
  } = {}) {
    this.model = grupoModel;
    this.rotaModel = rotaModel;
    this.usuarioModel = usuarioModel;
  }

  async obterParesRotaDominioUnicos(permissoes: GrupoPermissaoInput[]) {
    const combinacoes = permissoes.map((p) => `${p.rota}_${p.dominio || 'undefined'}`);
    const combinacoesUnicas = [...new Set(combinacoes)];
    return combinacoesUnicas.map((combinacao) => {
      const [rota, dominio] = combinacao.split('_');
      return { rota, dominio: dominio === 'undefined' ? null : dominio };
    });
  }

  obterPermissoesDuplicadas(
    permissoes: GrupoPermissaoInput[],
    _combinacoesRecebidas?: unknown,
  ) {
    const combinacoes = permissoes.map((permissao) => `${permissao.rota}_${permissao.dominio}`);
    const counts: Record<string, number> = {};
    combinacoes.forEach((combinacao) => {
      counts[combinacao] = (counts[combinacao] ?? 0) + 1;
    });
    const duplicates = Object.keys(counts).filter((combinacao) => (counts[combinacao] ?? 0) > 1);
    const uniqueDuplicates: GrupoPermissaoInput[] = [];
    const seen = new Set<string>();
    permissoes.forEach((permissao) => {
      const combinacao = `${permissao.rota}_${permissao.dominio}`;
      if (duplicates.includes(combinacao) && !seen.has(combinacao)) {
        seen.add(combinacao);
        uniqueDuplicates.push(permissao);
      }
    });
    return uniqueDuplicates;
  }

  async buscarPorNome(nome: string, idIgnorado: string | null = null) {
    const filtro: mongoose.FilterQuery<GrupoDocument> = { nome };

    if (idIgnorado) {
      filtro['_id'] = { $ne: idIgnorado };
    }

    return await this.model.findOne(filtro);
  }

  async buscarPorId(id: string) {
    const group = await this.model.findById(id);
    if (!group) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.resourceNotFound('Grupo'),
      });
    }
    return group;
  }

  async buscarPorPermissao(permissoes: GrupoPermissaoInput[]) {
    const query = permissoes.map((p) => ({
      rota: p.rota,
      dominio: p.dominio || null,
    }));

    return await this.rotaModel.find({ $or: query } as mongoose.FilterQuery<RotaDocument>);
  }

  async listar(req: AuthenticatedRequest) {
    try {
      const id = req.params?.['id'] ?? null;

      if (id) {
        const data = await this.model.findById(id).populate('permissoes');

        if (!data) {
          throw new CustomError({
            statusCode: 404,
            errorType: 'resourceNotFound',
            field: 'Grupo',
            details: [],
            customMessage: messages.error.resourceNotFound('Grupo'),
          });
        }

        return data;
      }

      const query = req.query as Record<string, string | undefined>;
      const { nome, descricao } = query;
      const ativo = query['ativo'] ?? 'true';
      const page = query['page'] ?? '1';
      const limite = Math.min(
        parseInt(query['limite'] ?? '', 10) || PAGINATION_DEFAULT_LIMIT,
        PAGINATION_MAX_LIMIT,
      );

      const filterBuilder = new GrupoFilterBuilder()
        .comNome(nome ?? '')
        .comDescricao(descricao ?? '')
        .comAtivo(ativo);

      const filtros = filterBuilder.build();

      const options = {
        page: parseInt(page, 10),
        limit: limite,
        populate: ['permissoes'],
        sort: { nome: 1 },
      };

      const resultado = await this.model.paginate(
        filtros as mongoose.FilterQuery<GrupoDocument>,
        options,
      );

      resultado.docs = resultado.docs.map((doc) => {
        const grupoObj =
          typeof doc.toObject === 'function'
            ? (doc.toObject() as unknown as Record<string, unknown>)
            : (doc as unknown as Record<string, unknown>);

        const permissoes = grupoObj['permissoes'] as unknown[] | undefined;
        const totalPermissoes = permissoes ? permissoes.length : 0;

        return {
          ...grupoObj,
          estatisticas: { totalPermissoes },
        } as unknown as GrupoDocument;
      }) as unknown as typeof resultado.docs;

      return resultado;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async verificarUsuariosAssociados(id: string) {
    try {
      return await this.usuarioModel.findOne({ grupos: id });
    } catch {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async criar(parsedData: Record<string, unknown>) {
    const grupo = new this.model(parsedData);
    return await grupo.save();
  }

  async atualizar(id: string, parsedData: Record<string, unknown>) {
    try {
      const grupo = await this.model.findByIdAndUpdate(id, parsedData, { new: true });

      if (!grupo) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Grupo',
          details: [],
          customMessage: messages.error.resourceNotFound('Grupo'),
        });
      }
      return grupo;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async deletar(id: string) {
    try {
      const grupoDeletado = await this.model.findByIdAndDelete(id);

      if (!grupoDeletado) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Grupo',
          details: [],
          customMessage: messages.error.resourceNotFound('Grupo'),
        });
      }
      return grupoDeletado;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async adiciotarRota(id: string, rota: RotaDocument) {
    try {
      const grupo = await this.model.findById(id);
      if (!grupo) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Grupo',
          details: [],
          customMessage: messages.error.resourceNotFound('Grupo'),
        });
      }
      grupo.permissoes.push(rota as unknown as IGrupoPermissao);
      return await grupo.save();
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }
}

export default GrupoRepository;
