import ComponenteFilterBuilder from './filters/ComponenteFilterBuilder.js';
import ComponenteModel from '../models/Componente.js';
import MovimentacaoModel from '../models/Movimentacao.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class ComponenteRepository {
    constructor({
        componenteModel = ComponenteModel,
    } = {}) {
        this.model = componenteModel;
    };

    async criar(parsedData) {
        const componente = new this.model(parsedData);
        const componenteSalvo = await componente.save();
        return await this.model.findById(componenteSalvo._id)
            .populate('categoria')
    };

    async listar(req) {
        const id = req.params.id || null;

        // Se um ID for fornecido, retorna o componente enriquecido com estatísticas.
        if (id) {
            const data = await this.model.findOne({ _id: id })
                .populate('categoria');

            if (!data) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'Componente',
                    details: [],
                    customMessage: messages.error.resourceNotFound('Componente')
                });
            };

            const dataWithStats = {
                ...data.toObject()
            };

            return dataWithStats;
        };

        const { nome, quantidade, estoque_minimo, categoria, ativo, status, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filterBuilder = new ComponenteFilterBuilder()
            .comNome(nome || '')
            .comQuantidade(quantidade || '')
            .comEstoqueMinimo(estoque_minimo || '')
            .comAtivo(ativo || 'true')
            .comStatus(status || '');

        await filterBuilder.comCategoria(categoria || '');

        if (typeof filterBuilder.build !== 'function') {
            throw new CustomError({
                statusCode: 500,
                errorType: 'internalServerError',
                field: 'Componente',
                details: [],
                customMessage: messages.error.internalServerError('Componente')
            });
        };

        const filtros = { ...filterBuilder.build() };

        const options = {
            page: parseInt(page),
            limit: parseInt(limite),
            populate: [
                'categoria'
            ],
            sort: { nome: 1 },
        };

        const resultado = await this.model.paginate(filtros, options);

        // Enriquecer cada componente com estatísticas utilizando o length dos arrays.
        resultado.docs = resultado.docs.map(doc => {
            const componenteObj = typeof doc.toObject === 'function' ? doc.toObject() : doc;

            return {
                ...componenteObj
            };
        });

        return resultado;
    };

    async atualizar(id, parsedData, req) {
        const componente = await this.model.findOneAndUpdate({ _id: id }, parsedData, { new: true })
            .populate('categoria')
            .lean();
        if (!componente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Componente',
                details: [],
                customMessage: messages.error.resourceNotFound('Componente')
            });
        };

        return componente;
    };

    async deletar(id, req) {
        const existeMovimentacao = await MovimentacaoModel.exists({ componente: id });
        if (existeMovimentacao) {
            throw new CustomError({
                statusCode: 400,
                errorType: 'resourceInUse',
                field: 'Componente',
                details: [],
                customMessage: 'Não é possível deletar: componente está vinculado a movimentações.'
            });
        };

        const componente = await this.model.findOne({ _id: id })
            .populate('categoria');

        if (!componente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Componente',
                details: [],
                customMessage: messages.error.resourceNotFound('Componente')
            });
        }

        await this.model.findOneAndDelete({ _id: id });
        return componente;
    };

    // Métodos auxiliares.

    async buscarPorId(id, includeTokens = false, req) {
        let query = this.model.findOne({ _id: id })
            .populate('categoria');

        const componente = await query;

        if (!componente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Componente',
                details: [],
                customMessage: messages.error.resourceNotFound('Componente')
            });
        };

        return componente;
    };

    async buscarPorNome(nome, idIgnorado, req) {
        const filtro = { nome, ativo: true };

        if (idIgnorado) {
            filtro._id = { $ne: idIgnorado }
        };

        const documento = await this.model.findOne(filtro)
            .populate('categoria');

        return documento;
    };
};

export default ComponenteRepository;