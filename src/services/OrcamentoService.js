import OrcamentoRepository from '../repositories/OrcamentoRepository.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';
import OrcamentoModel from '../models/Orcamento.js';

class OrcamentoService {
    constructor() {
        this.repository = new OrcamentoRepository();
    };

    async criar(parsedData, req) {
        parsedData.usuario = req.user_id;
        const data = await this.repository.criar(parsedData);

        return data;
    };

    async listar(req) {
        const data = await this.repository.listar(req);

        return data;
    };

    async atualizar(id, parsedData, req) {
        await this.ensureBudgetExists(id, req);

        const data = await this.repository.atualizar(id, parsedData, req);

        return data;
    };

    async deletar(id, req) {
        await this.ensureBudgetExists(id, req);

        const data = await this.repository.deletar(id, req);

        return data;
    };

    async inativar(id, req) {
        await this.ensureBudgetExists(id, req);

        const data = await this.repository.atualizar(id, { ativo: false }, req);

        return data;
    };

    // Manipular items.

    async adicionarItem(orcamentoId, novoItem, req) {
        return await this.repository.adicionarItem(orcamentoId, novoItem, req);
    };

    async atualizarItem(orcamentoId, itemId, itemAtualizado, req) {
        return await this.repository.atualizarItem(orcamentoId, itemId, itemAtualizado, req);
    };

    async removerItem(orcamentoId, itemId, req) {
        return await this.repository.removerItem(orcamentoId, itemId, req);
    };

    async getItemById(orcamentoId, itemId, req) {
        const orcamento = await this.repository.buscarPorId(orcamentoId, false, req);
        if (!orcamento) return null;

        const items = Array.isArray(orcamento.items) ? orcamento.items : [];
        const comp = items.find(c => c && c._id && c._id.toString() === itemId);

        return comp || null;
    };

    // Métodos auxiliares.

    async ensureBudgetExists(id, req) {
        const orcamentoExistente = await this.repository.buscarPorId(id, false, req);
        if (!orcamentoExistente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Orçamento',
                details: [],
                customMessage: messages.error.resourceNotFound('Orçamento'),
            });
        };

        return orcamentoExistente;
    };
};

export default OrcamentoService;