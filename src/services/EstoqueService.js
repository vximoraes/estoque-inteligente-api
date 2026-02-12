import EstoqueRepository from '../repositories/EstoqueRepository.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';
import ComponenteModel from '../models/Componente.js';
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

    async listarPorComponente(req) {
        const data = await this.repository.listarPorComponente(req);

        return data;
    };
};

export default EstoqueService;