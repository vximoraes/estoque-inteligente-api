import EmprestimoRepository from '../repositories/EmprestimoRepository.js';
import MovimentacaoService from './MovimentacaoService.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';
import Estoque from '../modules/estoque/EstoqueModel.js';
import { CustomError, messages } from '../utils/helpers/index.js';
import EmailService from './EmailService.js';
import EmprestimoModel from '../models/Emprestimo.js';

class EmprestimoService {
  constructor() {
    this.repository = new EmprestimoRepository();
    this.movimentacaoService = new MovimentacaoService();
  }

  async criar(parsedData, req) {
    const item = await Item.findById(parsedData.item);
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: messages.error.resourceNotFound('Item'),
      });
    }

    const localizacao = await Localizacao.findById(parsedData.localizacao);
    if (!localizacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Localizacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Localizacao'),
      });
    }

    const estoqueAtual = await Estoque.findOne({
      item: parsedData.item,
      localizacao: parsedData.localizacao,
    });

    const quantidadeDisponivel = estoqueAtual ? estoqueAtual.quantidade : 0;
    if (quantidadeDisponivel < parsedData.quantidade_emprestada) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'quantidade_emprestada',
        details: [
          {
            path: 'quantidade_emprestada',
            message: `Estoque insuficiente (disponivel: ${quantidadeDisponivel})`,
          },
        ],
        customMessage: `Estoque insuficiente (disponivel: ${quantidadeDisponivel})`,
      });
    }

    await this.movimentacaoService.criar(
      {
        tipo: 'saida',
        quantidade: parsedData.quantidade_emprestada,
        item: parsedData.item,
        localizacao: parsedData.localizacao,
      },
      req,
    );

    const data = await this.repository.criar({
      ...parsedData,
      quantidade_devolvida: 0,
      quantidade_aberta: parsedData.quantidade_emprestada,
      usuario_responsavel: req.user_id,
      data_saida: new Date(),
    });

    if (data.solicitante_email) {
      EmailService.enviarEmailNovoEmprestimo(data.solicitante_nome, data.solicitante_email, data).catch(
        (err) => console.error('Erro ao enviar e-mail de novo empréstimo:', err),
      );
    }

    if (
      data.solicitante_email &&
      data.data_prevista_devolucao &&
      new Date(data.data_prevista_devolucao) < new Date()
    ) {
      EmailService.enviarEmailEmprestimoAtrasado(data.solicitante_nome, data.solicitante_email, data)
        .then(() => EmprestimoModel.updateOne({ _id: data._id }, { email_atraso_enviado: true }))
        .catch((err) => console.error('Erro ao enviar e-mail de atraso na criação:', err));
    }

    return data;
  }

  async listar(req) {
    return this.repository.listar(req);
  }

  async devolver(id, parsedData, req) {
    const emprestimo = await this.repository.buscarPorId(id);

    if (emprestimo.quantidade_aberta <= 0) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'emprestimo',
        details: [
          {
            path: 'emprestimo',
            message: 'Emprestimo ja foi totalmente devolvido.',
          },
        ],
        customMessage: 'Emprestimo ja foi totalmente devolvido.',
      });
    }

    if (parsedData.quantidade_devolvida > emprestimo.quantidade_aberta) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'quantidade_devolvida',
        details: [
          {
            path: 'quantidade_devolvida',
            message: `Quantidade devolvida maior que a quantidade em aberto (${emprestimo.quantidade_aberta}).`,
          },
        ],
        customMessage: `Quantidade devolvida maior que a quantidade em aberto (${emprestimo.quantidade_aberta}).`,
      });
    }

    await this.movimentacaoService.criar(
      {
        tipo: 'entrada',
        quantidade: parsedData.quantidade_devolvida,
        item: emprestimo.item._id || emprestimo.item,
        localizacao: emprestimo.localizacao._id || emprestimo.localizacao,
      },
      req,
    );

    const novaQuantidadeDevolvida =
      emprestimo.quantidade_devolvida + parsedData.quantidade_devolvida;
    const novaQuantidadeAberta =
      emprestimo.quantidade_emprestada - novaQuantidadeDevolvida;

    const payload = {
      quantidade_devolvida: novaQuantidadeDevolvida,
      quantidade_aberta: Math.max(0, novaQuantidadeAberta),
      observacoes_devolucao: parsedData.observacoes_devolucao || '',
      data_devolucao_total:
        novaQuantidadeAberta <= 0 ? new Date() : emprestimo.data_devolucao_total,
    };

    const emprestimoAtualizado = await this.repository.atualizarDevolucao(id, payload);

    if (emprestimoAtualizado.solicitante_email) {
      EmailService.enviarEmailDevolucaoEmprestimo(
        emprestimoAtualizado.solicitante_nome,
        emprestimoAtualizado.solicitante_email,
        emprestimoAtualizado,
        parsedData.quantidade_devolvida,
      ).catch((err) => console.error('Erro ao enviar e-mail de devolução:', err));
    }

    return emprestimoAtualizado;
  }
  async atualizar(id, parsedData, req) {
    return this.repository.atualizar(id, parsedData);
  }

  async excluir(id) {
    return this.repository.excluir(id);
  }
}

export default EmprestimoService;
