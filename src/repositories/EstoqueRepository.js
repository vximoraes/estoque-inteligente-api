import EstoqueModel from '../models/Estoque.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class EstoqueRepository {
    constructor({
        estoqueModel = EstoqueModel,
    } = {}) {
        this.model = estoqueModel;
    };

    async criar(parsedData) {
        const estoque = new this.model(parsedData);
        const estoqueSalvo = await estoque.save();
        return await this.model.findById(estoqueSalvo._id)
            .populate('componente')
            .populate('localizacao');
    };

    async listar(req) {
        const { componente, localizacao, quantidade, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filtros = {};

        if (componente) {
            filtros.componente = componente;
        }

        if (localizacao) {
            filtros.localizacao = localizacao;
        }

        if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
            const num = Number(quantidade);
            if (!isNaN(num)) {
                filtros.quantidade = num;
            }
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limite),
            populate: [
                'componente',
                'localizacao'
            ],
            sort: { createdAt: -1 },
        };

        const resultado = await this.model.paginate(filtros, options);

        return resultado;
    };

    async listarPorComponente(req) {
        const { componenteId } = req.params;
        const { localizacao, quantidade, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filtros = { 
            componente: componenteId 
        };

        if (localizacao) {
            filtros.localizacao = localizacao;
        }

        if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
            const num = Number(quantidade);
            if (!isNaN(num)) {
                filtros.quantidade = num;
            }
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limite),
            populate: [
                'componente',
                'localizacao'
            ],
            sort: { createdAt: -1 },
        };

        const resultado = await this.model.paginate(filtros, options);

        return resultado;
    };

    async atualizar(id, parsedData, req) {
        const estoque = await this.model.findOneAndUpdate(
            { _id: id }, 
            parsedData, 
            { new: true }
        )
            .populate('componente')
            .populate('localizacao')
            .lean();
            
        if (!estoque) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Estoque',
                details: [],
                customMessage: messages.error.resourceNotFound('Estoque')
            });
        };

        return estoque;
    };

    async deletar(id, req) {
        const estoque = await this.model.findOne({ _id: id })
            .populate('componente')
            .populate('localizacao');

        if (!estoque) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Estoque',
                details: [],
                customMessage: messages.error.resourceNotFound('Estoque')
            });
        }

        await this.model.findOneAndDelete({ _id: id });
        return estoque;
    };

    // Métodos auxiliares

    async buscarPorId(id, req) {
        const estoque = await this.model.findOne({ _id: id })
            .populate('componente')
            .populate('localizacao');

        if (!estoque) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Estoque',
                details: [],
                customMessage: messages.error.resourceNotFound('Estoque')
            });
        };

        return estoque;
    };
};

export default EstoqueRepository;