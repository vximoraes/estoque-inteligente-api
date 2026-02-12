import CategoriaRepository from '../repositories/CategoriaRepository.js';
import ComponenteModel from '../models/Componente.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class CategoriaService {
    constructor() {
        this.repository = new CategoriaRepository();
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
        await this.ensureCategoryExists(id, req);
        await this.validateNome(parsedData.nome, id, req);

        const data = await this.repository.atualizar(id, parsedData, req);

        return data;
    };

    async inativar(id, req) {
        await this.ensureCategoryExists(id, req);

        // Verificar se existem componentes ativos vinculados a esta categoria
        const existeComponenteAtivo = await ComponenteModel.exists({ 
            categoria: id, 
            ativo: true 
        });

        if (existeComponenteAtivo) {
            throw new CustomError({
                statusCode: 400,
                errorType: 'resourceInUse',
                field: 'Categoria',
                details: [],
                customMessage: 'Categoria vinculada a componentes ativos.'
            });
        }

        const data = await this.repository.atualizar(id, { ativo: false }, req);

        return data;
    };

    // Métodos auxiliares.

    async validateNome(nome, id = null, req) {
        const categoriaExistente = await this.repository.buscarPorNome(nome, id, req);
        if (categoriaExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'nome',
                details: [{ path: 'nome', message: 'Nome já está em uso.' }],
                customMessage: 'Nome já está em uso.',
            });
        };
    };

    async ensureCategoryExists(id, req) {
        const categoriaExistente = await this.repository.buscarPorId(id, false, req);
        if (!categoriaExistente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Categoria',
                details: [],
                customMessage: messages.error.resourceNotFound('Categoria'),
            });
        };

        return categoriaExistente;
    };
};

export default CategoriaService;