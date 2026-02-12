import NotificacaoRepository from "../repositories/NotificacaoRepository.js";
import Notificacao from "../models/Notificacao.js";
import Usuario from "../models/Usuario.js";
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class NotificacaoService {
    constructor() {
        this.repository = new NotificacaoRepository();
    };

    async listarTodas(req) {
        const userId = req.user_id || req.user?.id;
        
        const data = await this.repository.listar(userId, req);

        return data;
    };

    async buscarPorId(id, req) {
        const userId = req.user_id || req.user?.id;
        const data = await this.repository.buscarPorId(id, userId);

        return data;
    };

    async criar(parsedData, req) {
        const userId = req.user_id || req.user?.id;
        parsedData.usuario = userId;
        const data2 = await this.repository.criar(parsedData);

        return data2;
    };

    async marcarComoVisualizada(id, req) {
        const userId = req.user_id || req.user?.id;
        const data = await this.repository.marcarComoVisualizada(id, userId);
        return data;
    };

    async inativar(id, req) {
        const userId = req.user_id || req.user?.id;
        const data = await this.repository.inativar(id, userId);
        return data;
    };
};

export default NotificacaoService;