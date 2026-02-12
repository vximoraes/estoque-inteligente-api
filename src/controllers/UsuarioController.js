import UsuarioService from '../services/UsuarioService.js';
import { UsuarioQuerySchema, UsuarioIdSchema } from '../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js';
import { UsuarioSchema, UsuarioUpdateSchema } from '../utils/validators/schemas/zod/UsuarioSchema.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';

class UsuarioController {
    constructor() {
        this.service = new UsuarioService();
    };

    async criar(req, res) {
        const parsedData = UsuarioSchema.parse(req.body);
        let data = await this.service.criar(parsedData);

        let usuarioLimpo = data.toObject();
        delete usuarioLimpo.senha;

        return CommonResponse.created(res, usuarioLimpo);
    };

    async criarComSenha(req, res) {
        const parsedData = UsuarioSchema.parse(req.body);
        let data = await this.service.criar(parsedData, req);

        let usuarioLimpo = data.toObject();

        return CommonResponse.created(res, usuarioLimpo);
    }

    async listar(req, res) {
        const { id } = req.params || {};
        if (id) {
            UsuarioIdSchema.parse(id);
        };

        const query = req.query || {};
        if (Object.keys(query).length !== 0) {
            await UsuarioQuerySchema.parseAsync(query);
        };

        const data = await this.service.listar(req);

        return CommonResponse.success(res, data);
    };

    async atualizar(req, res) {
        const { id } = req.params;
        UsuarioIdSchema.parse(id);

        const parsedData = UsuarioUpdateSchema.parse(req.body);
        const data = await this.service.atualizar(id, parsedData, req);

        delete data.senha;

        return CommonResponse.success(res, data, 200, 'Usuário atualizado com sucesso. Porém, o e-mail é ignorado em tentativas de atualização, pois é operação proibida.');
    };

    async deletar(req, res) {
        const { id } = req.params || {};
        UsuarioIdSchema.parse(id);

        const data = await this.service.deletar(id, req);

        return CommonResponse.success(res, data, 200, 'Usuário excluído com sucesso.');
    };
    async uploadFoto(req, res) {
        const { id } = req.params || {};;
        UsuarioIdSchema.parse(id);

        const data = await this.service.uploadFoto(req, id);
        return CommonResponse.success(res, data, 201, 'Foto atualizada com sucesso.');
    };

    async deletarFoto(req, res) {
        const { id } = req.params || {}
        UsuarioIdSchema.parse(id)

        const data = await this.service.deletarFoto(req, id)
        return CommonResponse.success(res, data, 200, "Foto deletada com sucesso.")

    }

    async convidarUsuario(req, res) {
        const { nome, email } = req.body;

        if (!nome || !email) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'nome, email',
                details: [
                    { path: 'nome', message: 'Nome é obrigatório' },
                    { path: 'email', message: 'E-mail é obrigatório' }
                ],
                customMessage: 'Nome e e-mail são obrigatórios.'
            });
        }

        const data = await this.service.convidarUsuario(nome, email);
        return CommonResponse.created(res, data);
    }

    async ativarConta(req, res) {
        const { token } = req.query;
        const { senha } = req.body;

        if (!token) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'token',
                details: [{ path: 'token', message: 'Token é obrigatório' }],
                customMessage: 'Token de convite é obrigatório.'
            });
        }

        if (!senha) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'senha',
                details: [{ path: 'senha', message: 'Senha é obrigatória' }],
                customMessage: 'Senha é obrigatória.'
            });
        }

        const senhaValidada = UsuarioUpdateSchema.parse({ senha });

        const data = await this.service.ativarConta(token, senhaValidada.senha);
        return CommonResponse.success(res, data, 200, data.message);
    }

    async reenviarConvite(req, res) {
        const { id } = req.params;
        UsuarioIdSchema.parse(id);

        const data = await this.service.reenviarConvite(id);
        return CommonResponse.success(res, data, 200, data.message);
    }
};

export default UsuarioController;
