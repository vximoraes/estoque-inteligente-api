import EmprestimoFilterBuilder from './filters/EmprestimoFilterBuilder.js';
import EmprestimoModel from '../models/Emprestimo.js';
import { CustomError, messages } from '../utils/helpers/index.js';

class EmprestimoRepository {
  constructor({ emprestimoModel = EmprestimoModel } = {}) {
    this.model = emprestimoModel;
  }

  calcularStatus(emprestimo) {
    if (!emprestimo) return 'Ativo';

    if (emprestimo.quantidade_aberta <= 0) {
      return 'Devolvido';
    }

    if (!emprestimo.data_prevista_devolucao) {
      return 'Ativo';
    }

    const hoje = new Date();
    return new Date(emprestimo.data_prevista_devolucao) < hoje
      ? 'Atrasado'
      : 'Ativo';
  }

  async criar(parsedData) {
    const emprestimo = new this.model(parsedData);
    const emprestimoSalvo = await emprestimo.save();

    const documento = await this.model
      .findById(emprestimoSalvo._id)
      .populate('item')
      .populate('localizacao')
      .populate('usuario_responsavel', 'nome email');

    const objeto = documento.toObject();
    return {
      ...objeto,
      status: this.calcularStatus(objeto),
    };
  }

  async listar(req) {
    const id = req.params.id || null;

    if (id) {
      const data = await this.model
        .findOne({ _id: id, ativo: true })
        .populate('item')
        .populate('localizacao')
        .populate('usuario_responsavel', 'nome email');

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Emprestimo',
          details: [],
          customMessage: messages.error.resourceNotFound('Emprestimo'),
        });
      }

      const objeto = data.toObject();
      return {
        ...objeto,
        status: this.calcularStatus(objeto),
      };
    }

    const {
      item,
      localizacao,
      solicitante_nome,
      apenas_abertos,
      atrasados,
      data_saida_inicio,
      data_saida_fim,
      page = 1,
    } = req.query;
    const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);
    const dataSaidaInicio = data_saida_inicio
      ? new Date(data_saida_inicio)
      : null;
    const dataSaidaFim = data_saida_fim ? new Date(data_saida_fim) : null;

    const filterBuilder = new EmprestimoFilterBuilder()
      .comSolicitanteNome(solicitante_nome || '')
      .comApenasAbertos(apenas_abertos === true || apenas_abertos === 'true')
      .comAtrasados(atrasados === true || atrasados === 'true')
      .comDataSaidaInicio(dataSaidaInicio)
      .comDataSaidaFim(dataSaidaFim);

    await filterBuilder.comItem(item || '');
    await filterBuilder.comLocalizacao(localizacao || '');

    const filtros = { ...filterBuilder.build(), ativo: true };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limite, 10),
      populate: ['item', 'localizacao', 'usuario_responsavel'],
      sort: { data_saida: -1 },
    };

    const resultado = await this.model.paginate(filtros, options);

    resultado.docs = resultado.docs.map((doc) => {
      const emprestimoObj =
        typeof doc.toObject === 'function' ? doc.toObject() : doc;

      return {
        ...emprestimoObj,
        status: this.calcularStatus(emprestimoObj),
      };
    });

    return resultado;
  }

  async buscarPorId(id) {
    const emprestimo = await this.model
      .findOne({ _id: id, ativo: true })
      .populate('item')
      .populate('localizacao')
      .populate('usuario_responsavel', 'nome email');

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

  async atualizarDevolucao(id, payload) {
    const emprestimoAtualizado = await this.model
      .findOneAndUpdate({ _id: id, ativo: true }, payload, {
        new: true,
      })
      .populate('item')
      .populate('localizacao')
      .populate('usuario_responsavel', 'nome email');

    if (!emprestimoAtualizado) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Emprestimo',
        details: [],
        customMessage: messages.error.resourceNotFound('Emprestimo'),
      });
    }

    const objeto = emprestimoAtualizado.toObject();
    return {
      ...objeto,
      status: this.calcularStatus(objeto),
    };
  }
}

export default EmprestimoRepository;
