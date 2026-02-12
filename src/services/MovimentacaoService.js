import MovimentacaoRepository from '../repositories/MovimentacaoRepository.js';
import Componente from '../models/Componente.js';
import Estoque from '../models/Estoque.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class MovimentacaoService {
    constructor() {
        this.repository = new MovimentacaoRepository();
    };

    async criar(parsedData, req) {
        const componente = await Componente.findOne({ _id: parsedData.componente });
        if (!componente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Componente',
                details: [],
                customMessage: messages.error.resourceNotFound('Componente')
            });
        };

        const estoqueAtual = await Estoque.findOne({
            componente: parsedData.componente,
            localizacao: parsedData.localizacao
        });
        
        const quantidadeDisponivel = estoqueAtual ? estoqueAtual.quantidade : 0;

        if (parsedData.tipo === 'saida') {
            if (quantidadeDisponivel < parsedData.quantidade) {
                throw new CustomError({
                    statusCode: 400,
                    errorType: 'validationError',
                    field: 'quantidade',
                    details: [{ path: 'quantidade', message: `Estoque insuficiente (disponível: ${quantidadeDisponivel})` }],
                    customMessage: `Estoque insuficiente (disponível: ${quantidadeDisponivel})`
                });
            }
        } else if (parsedData.tipo === 'entrada') {
            const quantidadeResultante = quantidadeDisponivel + parsedData.quantidade;
            if (quantidadeResultante > 999999999) {
                throw new CustomError({
                    statusCode: 400,
                    errorType: 'validationError',
                    field: 'quantidade',
                    details: [{ path: 'quantidade', message: `Limite de estoque excedido (máx: 999.999.999)` }],
                    customMessage: `Limite de estoque excedido (máx: 999.999.999)`
                });
            }
        }

        const now = new Date();
        now.setHours(now.getHours() - 4);
        now.setDate(now.getDate() - 1);
        parsedData.data_hora = now.toISOString().slice(0, 23).replace('T', ' ');

        parsedData.usuario = req.user_id;
        const data = await this.repository.criar(parsedData);
        return data;
    };

    async listar(req) {
        const data = await this.repository.listar(req);

        return data;
    };
};

export default MovimentacaoService;