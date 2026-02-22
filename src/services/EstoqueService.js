import EstoqueRepository from '../repositories/EstoqueRepository.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';
import ItemModel from '../models/Item.js';
import LocalizacaoModel from '../models/Localizacao.js';

class EstoqueService {
    constructor() {
        this.repository = new EstoqueRepository();
    };

    async listar(req) {
        const data = await this.repository.listar(req);

        return data;
    };

    async buscarPorId(req) {
        const data = await this.repository.buscarPorId(req.params.id, req);

        return data;
    };

    async listarPorItem(req) {
        const data = await this.repository.listarPorItem(req);

        return data;
    };
};

export default EstoqueService;