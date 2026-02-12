import FornecedorRepository from '../repositories/FornecedorRepository.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class FornecedorService {
    constructor() {
        this.repository = new FornecedorRepository();
    };

    async criar(parsedData, req) {
        await this.validateNome(parsedData.nome, null, req);

        parsedData.usuario = req.user_id;
        const data = await this.repository.criar(parsedData);

        return data;
    };

    async listar(req) {
        const data = await this.repository.listar(req);

        return data;
    };

    async atualizar(id, parsedData, req) {
        await this.ensureSupplierExists(id, req);
        await this.validateNome(parsedData.nome, id, req);

        const data = await this.repository.atualizar(id, parsedData, req);

        return data;
    };

    async inativar(id, req) {
        await this.ensureSupplierExists(id, req);

        const data = await this.repository.atualizar(id, { ativo: false }, req);

        return data;
    };

    // Métodos auxiliares.

    async validateNome(nome, id = null, req) {
        const fornecedorExistente = await this.repository.buscarPorNome(nome, id, req);
        if (fornecedorExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'nome',
                details: [{ path: 'nome', message: 'Nome já está em uso.' }],
                customMessage: 'Nome já está em uso.',
            });
        };
    };

    async ensureSupplierExists(id, req) {
        const fornecedorExistente = await this.repository.buscarPorId(id, false, req);
        if (!fornecedorExistente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Fornecedor',
                details: [],
                customMessage: messages.error.resourceNotFound('Fornecedor'),
            });
        };

        return fornecedorExistente;
    };
};

export default FornecedorService;