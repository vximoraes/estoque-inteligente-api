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

    // Manipular componentes.

    async adicionarComponente(orcamentoId, novoComponente, req) {
        return await this.repository.adicionarComponente(orcamentoId, novoComponente, req);
    };

    async atualizarComponente(orcamentoId, componenteId, componenteAtualizado, req) {
        return await this.repository.atualizarComponente(orcamentoId, componenteId, componenteAtualizado, req);
    };

    async removerComponente(orcamentoId, componenteId, req) {
        return await this.repository.removerComponente(orcamentoId, componenteId, req);
    };

    async getComponenteById(orcamentoId, componenteId, req) {
        const orcamento = await this.repository.buscarPorId(orcamentoId, false, req);
        if (!orcamento) return null;

        const componentes = Array.isArray(orcamento.componentes) ? orcamento.componentes : [];
        const comp = componentes.find(c => c && c._id && c._id.toString() === componenteId);

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