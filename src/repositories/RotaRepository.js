// src/repositories/RotaRepository.js

import RotaModel from '../models/Rota.js';
import RotaFilterBuilder from './filters/RotaFilterBuilder.js';
import { CustomError, messages } from '../utils/helpers/index.js';

class RotaRepository {
    constructor({
        rotaModel = RotaModel,
    } = {}) {
        this.model = rotaModel;
    }

    /**
 * Método buscar por ID - Deve ser chamado por controllers ou services.
 * para retornar um usuário e ser utilizado em outras funções de validação
 * cujo listar não atende por exigir req.
 */
    async buscarPorId(id) {
        const rota = await this.model.findById(id);
        if (!rota) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Rota',
                details: [],
                customMessage: messages.error.resourceNotFound('Rota')
            });
        }
        return rota;
    }

    /**
     * Método para listar rotas no banco de dados.
     */
    async listar(req) {
        const id = req?.params?.id || null;

        // Se um ID foi fornecido, retornar a rota correspondente
        if (id) {
            const data = await this.model.findById(id);
            if (!data) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: 'Rotas',
                    details: [],
                    customMessage: messages.error.resourceNotFound('Rotas'),
                });
            }
            return data;
        }

        // Extrair os filtros da query
        const { rota, dominio, ativo, buscar, enviar, substituir, modificar, excluir, page = 1, } = req.query;

        // Garantir que o limite não ultrapasse 100
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        // Construir os filtros
        const filterBuilder = new RotaFilterBuilder()
            .comRota(rota || '')
            .comDominio(dominio || '')
            .comAtivo(ativo || '')
            .comGet(buscar || '')
            .comPost(enviar || '')
            .comPut(substituir || '')
            .comPatch(modificar || '')
            .comDelete(excluir || '');

        // Validação do filtro de unidade para evitar erro de cast    
        if (typeof filterBuilder.build !== 'function') {
            throw new CustomError({
                statusCode: 500,
                errorType: 'internalServerError',
                field: 'Rota',
                details: [],
                customMessage: messages.error.internalServerError('Rota')
            });
        }

        // Construir os filtros
        const filtros = filterBuilder.build();

        // Configurar a paginação
        const options = {
            page: parseInt(page),
            limit: parseInt(limite),
        };

        // Aplicar os filtros na busca com paginação
        const data = await this.model.paginate(filtros, options);
        return data;
    }

    /**
     * Método para criar uma nova rota no banco de dados.
     */
    async criar(dados) {

        const rota = new this.model(dados);
        return await rota.save();
    }

    /**
     * Método para atualizar uma rota existente no banco de dados.
     */
    async atualizar(parsedData, id) {
        const data = await this.model.findByIdAndUpdate(id, parsedData);

        // Garante que a rota exista
        if (!data) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Rota',
                details: [],
                customMessage: messages.error.resourceNotFound('Rota'),
            });
        }
        return data;

    }

    /**
     * Método para deletar uma rota existente no banco de dados.
     */
    async deletar(id) {

        const data = await this.model.findByIdAndDelete(id);

        // Garante que a rota exista
        if (!data) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Rota',
                details: [],
                customMessage: messages.error.resourceNotFound('Rota'),
            });
        }
        return data;
    }
    async buscarRotaPorNome(rota, idIgnorado = null){

        const filtro = {rota: rota}
        if(idIgnorado){
            filtro._id = { $ne: idIgnorado }
        }
        const data = await this.model.findOne(filtro)
        return data
    }
}

export default RotaRepository;
