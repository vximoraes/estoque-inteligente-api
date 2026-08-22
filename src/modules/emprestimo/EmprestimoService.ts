import EmprestimoRepository from './EmprestimoRepository.js';
import MovimentacaoService from '../movimentacao/MovimentacaoService.js';
import Item from '../item/ItemModel.js';
import Localizacao from '../localizacao/LocalizacaoModel.js';
import Estoque from '../estoque/EstoqueModel.js';
import PatrimonioService from '../patrimonio/PatrimonioService.js';
import PatrimonioModel from '../patrimonio/PatrimonioModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import EmailService, {
  type EmprestimoEmailData,
} from '../../utils/services/EmailService.js';
import EmprestimoModel from './EmprestimoModel.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type {
  Emprestimo,
  DevolucaoEmprestimo,
  AtualizarEmprestimo,
} from './EmprestimoSchema.js';

class EmprestimoService {
  private repository: EmprestimoRepository;
  private movimentacaoService: MovimentacaoService;
  private patrimonioService: PatrimonioService;

  constructor() {
    this.repository = new EmprestimoRepository();
    this.movimentacaoService = new MovimentacaoService();
    this.patrimonioService = new PatrimonioService();
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

    if (item.tipo === 'permanente') {
      const dadosPatrimonio = await this.prepararEmprestimoDeUnidade(
        parsedData,
        req,
      );

      try {
        const data = await this.repository.criar({
          ...parsedData,
          ...dadosPatrimonio,
          usuario_responsavel: req.user_id,
          data_saida: parsedData.data_saida ?? new Date(),
        });

        return await this.finalizarCriacao(data);
      } catch (erro) {
        // Sem transação no banco: se o registro de Emprestimo falhar depois
        // que a unidade já foi marcada como Emprestado, a devolução
        // compensa manualmente para não deixar a unidade travada.
        await this.patrimonioService.devolverUnidade(
          dadosPatrimonio.patrimonio.toString(),
          {},
          req,
        );
        throw erro;
      }
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
      tipo_controle: 'quantidade',
      quantidade_devolvida: 0,
      quantidade_aberta: parsedData.quantidade_emprestada,
      usuario_responsavel: req.user_id,
      data_saida: parsedData.data_saida ?? new Date(),
    });

    return await this.finalizarCriacao(data);
  }

  // Valida a unidade patrimonial e a transiciona atomicamente para
  // 'Emprestado' (via PatrimonioService.emprestarUnidade — 409 se outra
  // requisição chegou primeiro). Devolve os campos que sobrescrevem
  // `parsedData` no registro de Emprestimo: quantidade sempre 1 e
  // `localizacao` é sempre a real da unidade, nunca a enviada pelo cliente.
  private async prepararEmprestimoDeUnidade(
    parsedData: Emprestimo,
    req: AuthenticatedRequest,
  ) {
    const patrimonioId = parsedData.patrimonio;
    if (!patrimonioId) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'patrimonio',
        details: [],
        customMessage:
          'Item de patrimônio: selecione a unidade a emprestar (campo "patrimonio").',
      });
    }

    const patrimonio = await PatrimonioModel.findById(patrimonioId);
    if (!patrimonio) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Patrimonio',
        details: [],
        customMessage: messages.error.resourceNotFound('Patrimônio'),
      });
    }
    if (patrimonio.item.toString() !== parsedData.item) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'patrimonio',
        details: [],
        customMessage: 'Esta unidade não pertence ao item informado.',
      });
    }
    if (!patrimonio.ativo) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'patrimonio',
        details: [],
        customMessage: 'Esta unidade está inativa.',
      });
    }

    const transicionada = await this.patrimonioService.emprestarUnidade(
      patrimonioId,
      req,
    );
    if (!transicionada) {
      throw new CustomError({
        statusCode: 409,
        errorType: 'conflictError',
        field: 'patrimonio',
        details: [],
        customMessage: 'Esta unidade já está emprestada.',
      });
    }

    return {
      tipo_controle: 'unidade' as const,
      patrimonio: transicionada._id,
      localizacao: transicionada.localizacao,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
    };
  }

  // Trecho final de `criar`, comum aos dois tipos de controle: e-mails de
  // aviso. Extraído para não duplicar entre o ramo de unidade e o de
  // quantidade.
  private async finalizarCriacao(data: Record<string, unknown>) {
    if (data['solicitante_email']) {
      EmailService.enviarEmailNovoEmprestimo(
        data['solicitante_nome'] as string,
        data['solicitante_email'] as string,
        data as unknown as EmprestimoEmailData,
      ).catch((err: unknown) =>
        console.error('Erro ao enviar e-mail de novo emprestimo:', err),
      );
    }

    if (
      data['solicitante_email'] &&
      data['data_prevista_devolucao'] &&
      new Date(data['data_prevista_devolucao'] as string) < new Date()
    ) {
      EmailService.enviarEmailEmprestimoAtrasado(
        data['solicitante_nome'] as string,
        data['solicitante_email'] as string,
        data as unknown as EmprestimoEmailData,
      )
        .then(() =>
          EmprestimoModel.updateOne(
            { _id: data['_id'] },
            { email_atraso_enviado: true },
          ),
        )
        .catch((err: unknown) =>
          console.error('Erro ao enviar e-mail de atraso na criacao:', err),
        );
    }

    return data;
  }

  async listar(req: AuthenticatedRequest) {
    return this.repository.listar(req);
  }

  async desfazerDevolucao(id: string, req: AuthenticatedRequest) {
    const emprestimo = await this.repository.buscarPorId(id);

    if (emprestimo.quantidade_devolvida <= 0) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'emprestimo',
        details: [
          {
            path: 'emprestimo',
            message: 'Nao ha devolucao registrada para desfazer.',
          },
        ],
        customMessage: 'Nao ha devolucao registrada para desfazer.',
      });
    }

    if (emprestimo.tipo_controle === 'unidade') {
      // Reaproveita `emprestarUnidade` — a transição Disponível→Emprestado é
      // idêntica, seja a origem um empréstimo novo ou o estorno de uma
      // devolução. O evento gravado fica com `tipo:'emprestimo'`; não há um
      // tipo de evento próprio de "estorno" no ledger de patrimônio.
      // `emprestimo.patrimonio` vem populado por `repository.buscarPorId`
      // (`.populate('patrimonio', ...)`) — `String()` direto num doc
      // populado retorna "[object Object]", não o id.
      const empPatrimonio = emprestimo.patrimonio as unknown as Record<
        string,
        unknown
      >;
      const patrimonioId = String(
        empPatrimonio?.['_id'] ?? emprestimo.patrimonio,
      );
      const transicionada = await this.patrimonioService.emprestarUnidade(
        patrimonioId,
        req,
      );
      if (!transicionada) {
        throw new CustomError({
          statusCode: 400,
          errorType: 'validationError',
          field: 'patrimonio',
          details: [],
          customMessage:
            'A unidade não está mais disponível (foi para manutenção ou baixa); não é possível desfazer a devolução.',
        });
      }
    } else {
      const empItem = emprestimo.item as unknown as Record<string, unknown>;
      const empLoc = emprestimo.localizacao as unknown as Record<
        string,
        unknown
      >;
      const itemId = String(empItem['_id'] ?? emprestimo.item);
      const localizacaoId = String(empLoc['_id'] ?? emprestimo.localizacao);

      await this.movimentacaoService.criar(
        {
          tipo: 'saida',
          quantidade: emprestimo.quantidade_devolvida,
          item: itemId,
          localizacao: localizacaoId,
        },
        req,
      );
    }

    const payload: Record<string, unknown> = {
      quantidade_devolvida: 0,
      quantidade_aberta: emprestimo.quantidade_emprestada,
      observacoes_devolucao: '',
      data_devolucao_total: null,
    };

    return this.repository.atualizarDevolucao(id, payload);
  }

  async devolver(
    id: string,
    parsedData: DevolucaoEmprestimo,
    req: AuthenticatedRequest,
  ) {
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

    let payload: Record<string, unknown>;

    if (emprestimo.tipo_controle === 'unidade') {
      // Devolução de unidade não é parcial: `quantidade_devolvida` do body é
      // ignorada de propósito (a unidade volta inteira ou não volta).
      // Mesmo cuidado do desfazerDevolucao: `patrimonio` vem populado.
      const empPatrimonio = emprestimo.patrimonio as unknown as Record<
        string,
        unknown
      >;
      const patrimonioId = String(
        empPatrimonio?.['_id'] ?? emprestimo.patrimonio,
      );
      await this.patrimonioService.devolverUnidade(patrimonioId, {}, req);

      payload = {
        quantidade_devolvida: 1,
        quantidade_aberta: 0,
        observacoes_devolucao: parsedData.observacoes_devolucao ?? '',
        data_devolucao_total: new Date(),
      };
    } else {
      const empItem = emprestimo.item as unknown as Record<string, unknown>;
      const empLoc = emprestimo.localizacao as unknown as Record<
        string,
        unknown
      >;
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
      const novaQuantidadeAberta =
        emprestimo.quantidade_emprestada - novaQuantidadeDevolvida;

      payload = {
        quantidade_devolvida: novaQuantidadeDevolvida,
        quantidade_aberta: Math.max(0, novaQuantidadeAberta),
        observacoes_devolucao: parsedData.observacoes_devolucao ?? '',
        data_devolucao_total:
          novaQuantidadeAberta <= 0
            ? new Date()
            : emprestimo.data_devolucao_total,
      };
    }

    const emprestimoAtualizado = await this.repository.atualizarDevolucao(
      id,
      payload,
    );

    if (emprestimoAtualizado['solicitante_email']) {
      EmailService.enviarEmailDevolucaoEmprestimo(
        emprestimoAtualizado['solicitante_nome'] as string,
        emprestimoAtualizado['solicitante_email'] as string,
        emprestimoAtualizado as unknown as EmprestimoEmailData,
        parsedData.quantidade_devolvida,
      ).catch((err: unknown) =>
        console.error('Erro ao enviar e-mail de devolucao:', err),
      );
    }

    return emprestimoAtualizado;
  }

  async atualizar(
    id: string,
    parsedData: AtualizarEmprestimo,
    _req: AuthenticatedRequest,
  ) {
    return this.repository.atualizar(id, parsedData as Record<string, unknown>);
  }

  async excluir(id: string) {
    const emprestimo = await this.repository.buscarPorId(id);

    // Excluir um empréstimo em aberto travaria a unidade em 'Emprestado'
    // (ou a quantidade descontada do consumo) sem forma de destravar pela
    // UI — vale para os dois tipos de controle.
    if (emprestimo.quantidade_aberta > 0) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'emprestimo',
        details: [
          {
            path: 'emprestimo',
            message:
              'Empréstimo em aberto; registre a devolução antes de excluir.',
          },
        ],
        customMessage:
          'Empréstimo em aberto; registre a devolução antes de excluir.',
      });
    }

    return this.repository.excluir(id);
  }
}

export default EmprestimoService;
