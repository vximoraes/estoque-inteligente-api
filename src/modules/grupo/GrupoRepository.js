import { PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT } from '../../config/PaginationConfig.js';

import GrupoModel from './GrupoModel.js';
import UsuarioModel from '../../models/Usuario.js';
import RotaModel from '../rota/RotaModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import GrupoFilterBuilder from './GrupoFilterBuilder.js';

class GrupoRepository {
  constructor({
    grupoModel = GrupoModel,
    rotaModel = RotaModel,
    usuarioModel = UsuarioModel,
    customError = CustomError,
  } = {}) {
    this.model = grupoModel;
    this.rotaModel = rotaModel;
    this.usuarioModel = usuarioModel;
    this.customError = customError;
  }

  async obterParesRotaDominioUnicos(permissoes) {
    const combinacoes = permissoes.map(
      (p) => `${p.rota}_${p.dominio || 'undefined'}`,
    );
    const combinacoesUnicas = [...new Set(combinacoes)];
    return combinacoesUnicas.map((combinacao) => {
      const [rota, dominio] = combinacao.split('_');
      return { rota, dominio: dominio === 'undefined' ? null : dominio };
    });
  }

  obterPermissoesDuplicadas(permissoes, combinacoesRecebidas) {
    const combinacoes = permissoes.map(
      (permissao) => `${permissao.rota}_${permissao.dominio}`,
    );
    const counts = {};
    combinacoes.forEach((combinacao) => {
      counts[combinacao] = (counts[combinacao] || 0) + 1;
    });
    const duplicates = Object.keys(counts).filter(
      (combinacao) => counts[combinacao] > 1,
    );
    const uniqueDuplicates = [];
    const seen = new Set();
    permissoes.forEach((permissao) => {
      const combinacao = `${permissao.rota}_${permissao.dominio}`;
      if (duplicates.includes(combinacao) && !seen.has(combinacao)) {
        seen.add(combinacao);
        uniqueDuplicates.push(permissao);
      }
    });
    return uniqueDuplicates;
  }

  async buscarPorNome(nome, idIgnorado = null) {
    const filtro = { nome };

    if (idIgnorado) {
      filtro._id = { $ne: idIgnorado };
    }

    const documento = await this.model.findOne(filtro);

    return documento;
  }

  async buscarPorId(id) {
    const group = await this.model.findById(id);
    if (!group) {
      throw new this.customError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.resourceNotFound('Grupo'),
      });
    }
    return group;
  }

  async buscarPorPermissao(permissoes) {
    const query = permissoes.map((p) => ({
      rota: p.rota,
      dominio: p.dominio || null,
    }));

    const rotasEncontradas = await this.rotaModel.find({ $or: query });
    return rotasEncontradas;
  }

  async listar(req) {
    try {
      const id = req.params.id || null;

      if (id) {
        const data = await this.model.findById(id).populate('permissoes');

        if (!data) {
          throw new this.customError({
            statusCode: 404,
            errorType: 'resourceNotFound',
            field: 'Grupo',
            details: [],
            customMessage: messages.error.resourceNotFound('Grupo'),
          });
        }

        const totalPermissoes = data.permissoes ? data.permissoes.length : 0;

        const dataWithStats = {
          ...data.toObject(),
          estatisticas: {
            totalPermissoes,
          },
        };

        return data;
      }

      const { nome, descricao, ativo = 'true', page = 1 } = req.query;

      const limite = Math.min(parseInt(req.query.limite, 10) || PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);

      const filterBuilder = new GrupoFilterBuilder()
        .comNome(nome || '')
        .comDescricao(descricao || '')
        .comAtivo(ativo || '');

      const filtros = filterBuilder.build();
      console.log('Filtros construídos:', filtros);

      const options = {
        page: parseInt(page),
        limit: parseInt(limite),
        populate: ['permissoes'],
        sort: { nome: 1 },
      };

      const resultado = await this.model.paginate(filtros, options);
      console.log('Resultado da paginação:', resultado);

      resultado.docs = resultado.docs.map((doc) => {
        const grupoObj =
          typeof doc.toObject === 'function' ? doc.toObject() : doc;

        const totalPermissoes = grupoObj.permissoes
          ? grupoObj.permissoes.length
          : 0;

        return {
          ...grupoObj,
          estatisticas: {
            totalPermissoes,
          },
        };
      });

      return resultado;
    } catch (error) {
      console.error('Erro ao listar grupos:', error);
      if (error.statusCode) {
        throw error;
      }
      throw new this.customError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async verificarUsuariosAssociados(id) {
    try {
      const usuariosAssociados = await this.usuarioModel.findOne({
        grupos: id,
      });
      return usuariosAssociados;
    } catch (error) {
      console.error('Erro ao verificar usuários associados:', error);
      throw new this.customError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async criar(parsedData) {
    const grupo = new this.model(parsedData);
    return await grupo.save();
  }

  async atualizar(id, parsedData) {
    try {
      const grupo = await this.model.findByIdAndUpdate(id, parsedData, {
        new: true,
      });

      if (!grupo) {
        throw new this.customError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Grupo',
          details: [],
          customMessage: messages.error.resourceNotFound('Grupo'),
        });
      }
      return grupo;
    } catch (error) {
      console.error('Erro ao atualizar grupo:', error);
      if (error.statusCode) {
        throw error;
      }
      throw new this.customError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async deletar(id) {
    try {
      const grupoDeletado = await this.model.findByIdAndDelete(id);

      if (!grupoDeletado) {
        throw new this.customError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Grupo',
          details: [],
          customMessage: messages.error.resourceNotFound('Grupo'),
        });
      }
      return grupoDeletado;
    } catch (error) {
      console.error('Erro ao deletar grupo:', error);
      if (error.statusCode) {
        throw error;
      }
      throw new this.customError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Grupo',
        details: [],
        customMessage: messages.error.internalServerError('Grupo'),
      });
    }
  }

  async adiciotarRota(id, rota) {
    try {
      const grupo = await this.model.findById(id);
      grupo.permissoes.push(rota);
      const data = await grupo.save();
      console.log('aqui');
      return data;
    } catch (error) {
      console.error('Erro ao adicionar rota:', error);
      if (error.statusCode) {
        throw error;
      }
      throw new this.customError({
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
