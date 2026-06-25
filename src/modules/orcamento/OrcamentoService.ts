import OrcamentoRepository from './OrcamentoRepository.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class OrcamentoService {
  private repository: OrcamentoRepository;

  constructor() {
    this.repository = new OrcamentoRepository();
  }

  async criar(parsedData: Record<string, unknown>, req: AuthenticatedRequest) {
    const dataToCreate = { ...parsedData, usuario: req.user_id };
    return await this.repository.criar(dataToCreate);
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async atualizar(id: string, parsedData: Record<string, unknown>, req: AuthenticatedRequest) {
    await this.ensureBudgetExists(id, req);
    return await this.repository.atualizar(id, parsedData, req);
  }

  async deletar(id: string, req: AuthenticatedRequest) {
    await this.ensureBudgetExists(id, req);
    return await this.repository.deletar(id, req);
  }

  async inativar(id: string, req: AuthenticatedRequest) {
    await this.ensureBudgetExists(id, req);
    return await this.repository.atualizar(id, { ativo: false }, req);
  }

  async adicionarItem(orcamentoId: string, novoItem: Record<string, unknown>, req: AuthenticatedRequest) {
    return await this.repository.adicionarItem(orcamentoId, novoItem, req);
  }

  async atualizarItem(orcamentoId: string, itemId: string, itemAtualizado: Record<string, unknown>, req: AuthenticatedRequest) {
    return await this.repository.atualizarItem(orcamentoId, itemId, itemAtualizado, req);
  }

  async removerItem(orcamentoId: string, itemId: string, req: AuthenticatedRequest) {
    return await this.repository.removerItem(orcamentoId, itemId, req);
  }

  async getItemById(orcamentoId: string, itemId: string, req: AuthenticatedRequest) {
    const orcamento = await this.repository.buscarPorId(orcamentoId, false, req);
    if (!orcamento) return null;
    const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
    return itens.find((c) => c && c._id && c._id.toString() === itemId) ?? null;
  }

  async ensureBudgetExists(id: string, req: AuthenticatedRequest) {
    const orcamentoExistente = await this.repository.buscarPorId(id, false, req);
    if (!orcamentoExistente) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Orçamento',
        details: [],
        customMessage: messages.error.resourceNotFound('Orçamento'),
      });
    }
    return orcamentoExistente;
  }
}

export default OrcamentoService;
