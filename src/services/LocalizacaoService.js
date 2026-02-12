import LocalizacaoRepository from '../repositories/LocalizacaoRepository.js';
import EstoqueModel from '../models/Estoque.js';
import ComponenteModel from '../models/Componente.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class LocalizacaoService {
    constructor() {
        this.repository = new LocalizacaoRepository();
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
        await this.ensureLocationExists(id, req);
        await this.validateNome(parsedData.nome, id, req);

        const data = await this.repository.atualizar(id, parsedData, req);

        return data;
    };

    async inativar(id, req) {
        await this.ensureLocationExists(id, req);

        // Verificar se existem estoques nesta localização vinculados a componentes ativos
        const estoques = await EstoqueModel.find({ 
            localizacao: id 
        }).populate('componente');

        const temComponenteAtivo = estoques.some(estoque => 
            estoque.componente && estoque.componente.ativo === true
        );

        if (temComponenteAtivo) {
            throw new CustomError({
                statusCode: 400,
                errorType: 'resourceInUse',
                field: 'Localizacao',
                details: [],
                customMessage: 'Localização possui estoque de componentes ativos.'
            });
        }

        const data = await this.repository.atualizar(id, { ativo: false }, req);

        return data;
    };

    // Métodos auxiliares.

    async validateNome(nome, id = null, req) {
        const localizacaoExistente = await this.repository.buscarPorNome(nome, id, req);
        if (localizacaoExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'nome',
                details: [{ path: 'nome', message: 'Nome já está em uso.' }],
                customMessage: 'Nome já está em uso.',
            });
        };
    };

    async ensureLocationExists(id, req) {
        const localizacaoExistente = await this.repository.buscarPorId(id, false, req);
        if (!localizacaoExistente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Localizacao',
                details: [],
                customMessage: messages.error.resourceNotFound('Localizacao'),
            });
        };

        return localizacaoExistente;
    };
};

export default LocalizacaoService;