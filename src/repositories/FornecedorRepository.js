import FornecedorFilterBuilder from './filters/FornecedorFilterBuilder.js';
import FornecedorModel from '../models/Fornecedor.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class FornecedorRepository {
    constructor({
        fornecedorModel = FornecedorModel,
    } = {}) {
        this.model = fornecedorModel;
    };

    async criar(parsedData) {
        const fornecedor = new this.model(parsedData);
        return await fornecedor.save();
    };

    async listar(req) {
        const id = req.params.id || null;

        // Se um ID for fornecido, retorna o fornecedor enriquecido com estatísticas.
        if (id) {
            const data = await this.model.findOne({ _id: id, ativo: true });

            if (!data) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'Fornecedor',
                    details: [],
                    customMessage: messages.error.resourceNotFound('Fornecedor')
                });
            };

            const dataWithStats = {
                ...data.toObject()
            };

            return dataWithStats;
        };

        const { nome, contato, descricao, url, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filterBuilder = new FornecedorFilterBuilder()
            .comNome(nome || '')
            .comContato(contato || '')
            .comDescricao(descricao || '')
            .comUrl(url || '');

        if (typeof filterBuilder.build !== 'function') {
            throw new CustomError({
                statusCode: 500,
                errorType: 'internalServerError',
                field: 'Fornecedor',
                details: [],
                customMessage: messages.error.internalServerError('Fornecedor')
            });
        };

        const filtros = { ...filterBuilder.build(), ativo: true };

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limite, 10),
            sort: { nome: 1 }
        };

        const resultado = await this.model.paginate(filtros, options);

        // Enriquecer cada fornecedor com estatísticas utilizando o length dos arrays.
        resultado.docs = resultado.docs.map(doc => {
            const fornecedorObj = typeof doc.toObject === 'function' ? doc.toObject() : doc;

            return {
                ...fornecedorObj,
            };
        });

        return resultado;
    };

    async atualizar(id, parsedData, req) {
        const fornecedor = await this.model.findOneAndUpdate({ _id: id }, parsedData, { new: true }).lean();
        if (!fornecedor) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Fornecedor',
                details: [],
                customMessage: messages.error.resourceNotFound('Fornecedor')
            });
        };

        return fornecedor;
    };

    // Métodos auxiliares.

    async buscarPorNome(nome, idIgnorado, req) {
        const filtro = { nome, ativo: true };

        if (idIgnorado) {
            filtro._id = { $ne: idIgnorado };
        };

        const documento = await this.model.findOne(filtro);

        return documento;
    };

    async buscarPorId(id, includeTokens = false, req) {
        let query = this.model.findOne({ _id: id, ativo: true });

        const fornecedor = await query;

        if (!fornecedor) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Fornecedor',
                details: [],
                customMessage: messages.error.resourceNotFound('Fornecedor')
            });
        };

        return fornecedor;
    };
};

export default FornecedorRepository;