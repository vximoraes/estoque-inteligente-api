import NotificacaoService from "../services/NotificacaoService.js";
import { NotificacaoSchema } from "../utils/validators/schemas/zod/NotificacaoSchema.js";
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class NotificacaoController {
    constructor() {
        this.service = new NotificacaoService();
    };

    async listar(req, res) {
        const notificacoes = await this.service.listarTodas(req);
        return CommonResponse.success(res, notificacoes);
    };

    async buscarPorId(req, res) {
        const { id } = req.params;

        const notificacao = await this.service.buscarPorId(id, req);
        if (!notificacao) {
            return CommonResponse.error(res, { message: "Notificação não encontrada" }, HttpStatusCodes.NOT_FOUND);
        }

        return CommonResponse.success(res, notificacao);
    };

    async criar(req, res) {
        const parsedData = NotificacaoSchema.parse(req.body);

        let data = await this.service.criar(parsedData, req);
        return CommonResponse.created(res, data);
    };

    async marcarComoVisualizada(req, res) {
        const { id } = req.params;
        const notificacao = await this.service.buscarPorId(id, req);
        if (!notificacao) {
            return CommonResponse.error(res, { message: "Notificação não encontrada" }, HttpStatusCodes.NOT_FOUND);
        }

        const atualizada = await this.service.marcarComoVisualizada(id, req);
        return CommonResponse.success(res, atualizada);
    };

    async inativar(req, res) {
        const { id } = req.params;
        const notificacao = await this.service.buscarPorId(id, req);
        if (!notificacao) {
            return CommonResponse.error(res, { message: "Notificação não encontrada" }, HttpStatusCodes.NOT_FOUND);
        }

        const inativada = await this.service.inativar(id, req);
        return CommonResponse.success(res, inativada);
    };
};

export default NotificacaoController;