import EmprestimoRepository from './EmprestimoRepository.js';
import MovimentacaoService from '../movimentacao/MovimentacaoService.js';
import Item from '../item/ItemModel.js';
import Localizacao from '../localizacao/LocalizacaoModel.js';
import Estoque from '../estoque/EstoqueModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import EmailService from '../../utils/services/EmailService.js';
import EmprestimoModel from './EmprestimoModel.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Emprestimo, DevolucaoEmprestimo, AtualizarEmprestimo } from './EmprestimoSchema.js';

class EmprestimoService {
  private repository: EmprestimoRepository;
  private movimentacaoService: MovimentacaoService;

  constructor() {
    this.repository = new EmprestimoRepository();
    this.movimentacaoService = new MovimentacaoService();
  }

  async criar(parsedData: Emprestimo, req: AuthenticatedRequest) {
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

    if (data['solicitante_email']) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (EmailService as any)
        .enviarEmailNovoEmprestimo(data['solicitante_nome'], data['solicitante_email'], data)
        .catch((err: unknown) => console.error('Erro ao enviar e-mail de novo emprestimo:', err));
    }

    if (
      data['solicitante_email'] &&
      data['data_prevista_devolucao'] &&
      new Date(data['data_prevista_devolucao'] as string) < new Date()
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (EmailService as any)
        .enviarEmailEmprestimoAtrasado(data['solicitante_nome'], data['solicitante_email'], data)
        .then(() => EmprestimoModel.updateOne({ _id: data['_id'] }, { email_atraso_enviado: true }))
        .catch((err: unknown) => console.error('Erro ao enviar e-mail de atraso na criacao:', err));
    }

    return data;
  }

  async listar(req: AuthenticatedRequest) {
    return this.repository.listar(req);
  }

  async devolver(id: string, parsedData: DevolucaoEmprestimo, req: AuthenticatedRequest) {
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

    const empItem = emprestimo.item as unknown as Record<string, unknown>;
    const empLoc = emprestimo.localizacao as unknown as Record<string, unknown>;
    const itemId = String(empItem['_id'] ?? emprestimo.item);
    const localizacaoId = String(empLoc['_id'] ?? emprestimo.localizacao);

    await this.movimentacaoService.criar(
      {
        tipo: 'entrada',
        quantidade: parsedData.quantidade_devolvida,
        item: itemId,
        localizacao: localizacaoId,
      },
      req,
    );

    const novaQuantidadeDevolvida =
      emprestimo.quantidade_devolvida + parsedData.quantidade_devolvida;
    const novaQuantidadeAberta = emprestimo.quantidade_emprestada - novaQuantidadeDevolvida;

    const payload: Record<string, unknown> = {
      quantidade_devolvida: novaQuantidadeDevolvida,
      quantidade_aberta: Math.max(0, novaQuantidadeAberta),
      observacoes_devolucao: parsedData.observacoes_devolucao ?? '',
      data_devolucao_total: novaQuantidadeAberta <= 0 ? new Date() : emprestimo.data_devolucao_total,
    };

    const emprestimoAtualizado = await this.repository.atualizarDevolucao(id, payload);

    if (emprestimoAtualizado['solicitante_email']) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (EmailService as any)
        .enviarEmailDevolucaoEmprestimo(
          emprestimoAtualizado['solicitante_nome'],
          emprestimoAtualizado['solicitante_email'],
          emprestimoAtualizado,
          parsedData.quantidade_devolvida,
        )
        .catch((err: unknown) => console.error('Erro ao enviar e-mail de devolucao:', err));
    }

    return emprestimoAtualizado;
  }

  async atualizar(id: string, parsedData: AtualizarEmprestimo, _req: AuthenticatedRequest) {
    return this.repository.atualizar(id, parsedData as Record<string, unknown>);
  }

  async excluir(id: string) {
    return this.repository.excluir(id);
  }
}

export default EmprestimoService;
