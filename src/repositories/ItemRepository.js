import ItemFilterBuilder from './filters/ItemFilterBuilder.js';
import ItemModel from '../models/Item.js';
import MovimentacaoModel from '../models/Movimentacao.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class ItemRepository {
    constructor({
        itemModel = ItemModel,
    } = {}) {
        this.model = itemModel;
    };

    async criar(parsedData) {
        const item = new this.model(parsedData);
        const itemSalvo = await item.save();
        return await this.model.findById(itemSalvo._id)
            .populate('categoria')
    };

    async listar(req) {
        const id = req.params.id || null;

        // Se um ID for fornecido, retorna o item enriquecido com estatísticas.
        if (id) {
            const data = await this.model.findOne({ _id: id })
                .populate('categoria');

            if (!data) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'Item',
                    details: [],
                    customMessage: messages.error.resourceNotFound('Item')
                });
            };

            const dataWithStats = {
                ...data.toObject()
            };

            return dataWithStats;
        };

        const { nome, quantidade, estoque_minimo, categoria, ativo, status, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filterBuilder = new ItemFilterBuilder()
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
                field: 'Item',
                details: [],
                customMessage: messages.error.internalServerError('Item')
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

        // Enriquecer cada item com estatísticas utilizando o length dos arrays.
        resultado.docs = resultado.docs.map(doc => {
            const itemObj = typeof doc.toObject === 'function' ? doc.toObject() : doc;

            return {
                ...itemObj
            };
        });

        return resultado;
    };

    async atualizar(id, parsedData, req) {
        const item = await this.model.findOneAndUpdate({ _id: id }, parsedData, { new: true })
            .populate('categoria')
            .lean();
        if (!item) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Item',
                details: [],
                customMessage: messages.error.resourceNotFound('Item')
            });
        };

        return item;
    };

    async deletar(id, req) {
        const existeMovimentacao = await MovimentacaoModel.exists({ item: id });
        if (existeMovimentacao) {
            throw new CustomError({
                statusCode: 400,
                errorType: 'resourceInUse',
                field: 'Item',
                details: [],
                customMessage: 'Não é possível deletar: item está vinculado a movimentações.'
            });
        };

        const item = await this.model.findOne({ _id: id })
            .populate('categoria');

        if (!item) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Item',
                details: [],
                customMessage: messages.error.resourceNotFound('Item')
            });
        }

        await this.model.findOneAndDelete({ _id: id });
        return item;
    };

    // Métodos auxiliares.

    async buscarPorId(id, includeTokens = false, req) {
        let query = this.model.findOne({ _id: id })
            .populate('categoria');

        const item = await query;

        if (!item) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Item',
                details: [],
                customMessage: messages.error.resourceNotFound('Item')
            });
        };

        return item;
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

export default ItemRepository;