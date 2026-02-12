import OrcamentoFilterBuilder from './filters/OrcamentoFilterBuilder.js';
import OrcamentoModel from '../models/Orcamento.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class OrcamentoRepository {
    constructor({
        orcamentoModel = OrcamentoModel,
    } = {}) {
        this.model = orcamentoModel;
    };

    async criar(parsedData) {
        const orcamento = new this.model(parsedData);
        const orcamentoSalvo = await orcamento.save();
        return await this.model.findById(orcamentoSalvo._id)
    };

    async listar(req) {
        const id = req.params.id || null;

        // Se um ID for fornecido, retorna o orçamento enriquecido com estatísticas.
        if (id) {
            const data = await this.model.findOne({ _id: id, ativo: true })

            if (!data) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'Orçamento',
                    details: [],
                    customMessage: messages.error.resourceNotFound('Orçamento')
                });
            };

            const dataWithStats = {
                ...data.toObject()
            };

            return dataWithStats;
        };

        const { nome, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filterBuilder = new OrcamentoFilterBuilder()
            .comNome(nome || '')

        if (typeof filterBuilder.build !== 'function') {
            throw new CustomError({
                statusCode: 500,
                errorType: 'internalServerError',
                field: 'Orçamento',
                details: [],
                customMessage: messages.error.internalServerError('Orçamento')
            });
        };

        const filtros = { ...filterBuilder.build(), ativo: true };

        const options = {
            page: parseInt(page),
            limit: parseInt(limite),
            sort: { nome: 1 },
        };

        const resultado = await this.model.paginate(filtros, options);

        // Enriquecer cada orçamento com estatísticas utilizando o length dos arrays.
        resultado.docs = resultado.docs.map(doc => {
            const orcamentoObj = typeof doc.toObject === 'function' ? doc.toObject() : doc;

            return {
                ...orcamentoObj
            };
        });

        return resultado;
    };

    async atualizar(id, parsedData, req) {
        const orcamento = await this.model.findOneAndUpdate({ _id: id }, parsedData, { new: true }).lean();
        if (!orcamento) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Orçamento',
                details: [],
                customMessage: messages.error.resourceNotFound('Orçamento')
            });
        };

        return orcamento;
    };

    async deletar(id, req) {
        const orcamento = await this.model.findOne({ _id: id, ativo: true })
        if (!orcamento) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Orçamento',
                details: [],
                customMessage: messages.error.resourceNotFound('Orçamento')
            });
        }

        await this.model.findOneAndDelete({ _id: id });
        return orcamento;
    };

    // Manipular componentes.

    async adicionarComponente(orcamentoId, novoComponente, req) {
        const orcamento = await this.model.findOne({ _id: orcamentoId, ativo: true });
        if (!orcamento) throw new CustomError({
            statusCode: 404,
            errorType: 'resourceNotFound',
            field: 'Orçamento',
            details: [],
            customMessage: messages.error.resourceNotFound('Orçamento')
        });

        orcamento.componentes.push(novoComponente);
        orcamento.total = parseFloat(orcamento.componentes.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2));
        await orcamento.save();

        return orcamento;
    };

    async atualizarComponente(orcamentoId, componenteId, componenteAtualizado, req) {
        const orcamento = await this.model.findOne({ _id: orcamentoId, ativo: true });
        if (!orcamento) throw new CustomError({
            statusCode: 404,
            errorType: 'resourceNotFound',
            field: 'Orçamento',
            details: [],
            customMessage: messages.error.resourceNotFound('Orçamento')
        });

        const componentes = Array.isArray(orcamento.componentes) ? orcamento.componentes : [];
        const idx = componentes.findIndex(c => c && c._id && c._id.toString() === componenteId);
        if (idx === -1) throw new CustomError({
            statusCode: 404,
            errorType: 'resourceNotFound',
            field: 'Componente',
            details: [],
            customMessage: 'Componente não encontrado.'
        });

        componentes[idx] = { ...((typeof componentes[idx].toObject === 'function') ? componentes[idx].toObject() : componentes[idx]), ...componenteAtualizado };
        orcamento.componentes = componentes;
        orcamento.total = parseFloat(componentes.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2));
        await orcamento.save();

        return orcamento;
    };

    async removerComponente(orcamentoId, componenteId, req) {
        const orcamento = await this.model.findOne({ _id: orcamentoId, ativo: true });
        if (!orcamento) throw new CustomError({
            statusCode: 404,
            errorType: 'resourceNotFound',
            field: 'Orçamento',
            details: [],
            customMessage: messages.error.resourceNotFound('Orçamento')
        });

        orcamento.componentes = orcamento.componentes.filter(c => c._id.toString() !== componenteId);
        orcamento.total = parseFloat(orcamento.componentes.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2));
        await orcamento.save();

        return orcamento;
    };

    // Métodos auxiliares.

    async buscarPorId(id, includeTokens = false, req) {
        let query = this.model.findOne({ _id: id, ativo: true });

        const orcamento = await query;
        if (!orcamento) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Orçamento',
                details: [],
                customMessage: messages.error.resourceNotFound('Orçamento')
            });
        };

        return orcamento;
    };
};

export default OrcamentoRepository;