import bcrypt from 'bcrypt';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import GrupoRepository from '../repositories/GrupoRepository.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';
import minioClient from '../config/MinIO.js';
import path from 'path';
import compress from '../config/SharpConfig.js';
import EmailService from './EmailService.js';
import tokenUtil from '../utils/TokenUtil.js';

class UsuarioService {
    constructor() {
        this.repository = new UsuarioRepository();
        this.grupoRepository = new GrupoRepository();
    };

    async criar(parsedData, req) {
        const userId = req?.user_id || null;
        await this.validateEmail(parsedData.email, null, userId);

        if (parsedData.senha) {
            const saltRounds = 10;
            parsedData.senha = await bcrypt.hash(parsedData.senha, saltRounds);
        };

        if (!parsedData.permissoes || parsedData.permissoes.length === 0) {
            try {
                const grupoUsuario = await this.grupoRepository.buscarPorNome("Usuario", null, userId);
                if (grupoUsuario) {
                    parsedData.permissoes = grupoUsuario.permissoes || [];
                }
            } catch (error) {
                console.warn('Não foi possível buscar o grupo "Usuario" padrão:', error.message);
            }
        }

        parsedData.usuarioId = userId;
        const data = await this.repository.criar(parsedData);

        return data;
    };

    async listar(req) {
        const data = await this.repository.listar(req);

        return data;
    };

    async atualizar(id, parsedData, req) {
        delete parsedData.senha;
        delete parsedData.email;

        await this.ensureUserExists(id, req.user_id);

        const data = await this.repository.atualizar(id, parsedData, req.user_id);

        return data;
    };

    async deletar(id, req) {
        await this.ensureUserExists(id, req.user_id);

        const data = await this.repository.deletar(id, req.user_id);

        return data;
    };

    // Métodos auxiliares.

    async validateEmail(email, id = null, usuarioId) {
        const usuarioExistente = await this.repository.buscarPorEmail(email, id, usuarioId);
        if (usuarioExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'email',
                details: [{ path: 'email', message: 'Email já está em uso.' }],
                customMessage: 'Email já está em uso.',
            });
        };
    };

    async ensureUserExists(id, usuarioId) {
        const usuarioExistente = await this.repository.buscarPorId(id, usuarioId);
        if (!usuarioExistente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: messages.error.resourceNotFound('Usuário'),
            });
        };

        return usuarioExistente;
    };

    async uploadFoto(req, id) {
        const file = req.file;
        if (!file) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: "badRequest",
                field: "Foto",
                details: [{ path: "Foto", message: "Nenhum arquivo foi enviado ou o arquivo está vazio." }],
                customMessage: "Nenhum arquivo foi enviado ou o arquivo está vazio."
            })
        }
        if (file.size > (5 * 1024 * 1024)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.PAYLOAD_TOO_LARGE.code,
                errorType: 'payloadTooLarge',
                field: "Imagem",
                details: [{ path: "Imagem", message: "Arquivo é superior a 5 MB" }],
                customMessage: "O arquivo é maior do que 5 MB."
            });
        }
        try {
            const data = await this.repository.atualizar(id, {
                fotoPerfil:
                    `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${id}.jpeg`
            })
            const newFile = await compress(file.buffer);
            const objectName = `${id}.jpeg`;
            await minioClient.putObject(process.env.MINIO_BUCKET, objectName, newFile, {
                'Content-Type': file.mimetype,
            });
            return {fotoPerfil: data.fotoPerfil};
        } catch (err) {
            throw new Error(err);
        };
    }

    async deletarFoto(req, id) {
        const objectName = `${id}.jpeg`
        await minioClient.removeObject(process.env.MINIO_BUCKET, objectName, (err) => {
            if (err) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
                    errorType: 'internalServerError',
                    field: 'Foto',
                    details: [],
                    customMessage: 'Erro ao deletar a foto do usuário.',
                })
            }
        })
        const data = await this.repository.atualizar(id, { fotoPerfil: "" })
        return {fotoPerfil: data.fotoPerfil}
    }

    async convidarUsuario(nome, email) {
        await this.validateEmail(email, null, null);

        const tokenConvite = await tokenUtil.generateInviteToken(email);
        const convidadoEm = new Date();

        const novoUsuario = await this.repository.criar({
            nome,
            email,
            tokenConvite,
            convidadoEm,
            ativo: false,
        });

        try {
            await EmailService.enviarEmailConvite(nome, email, tokenConvite);
        } catch (error) {
            await this.repository.deletar(novoUsuario._id);
            throw error;
        }

        return {
            message: 'Convite enviado com sucesso!',
            usuario: {
                id: novoUsuario._id,
                nome: novoUsuario.nome,
                email: novoUsuario.email,
                convidadoEm: novoUsuario.convidadoEm
            }
        };
    }

    async ativarConta(token, senha) {
        let emailDoToken;
        try {
            const decoded = await tokenUtil.decodeInviteToken(token);
            emailDoToken = decoded.email;
        } catch (error) {
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'invalidToken',
                field: 'Token',
                details: [],
                customMessage: 'Token de convite inválido ou expirado.'
            });
        }

        const usuario = await this.repository.buscarPorTokenConvite(token);
        
        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Token',
                details: [],
                customMessage: 'Token de convite inválido ou já utilizado.'
            });
        }

        if (usuario.ativo && usuario.ativadoEm) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'accountAlreadyActivated',
                field: 'Token',
                details: [],
                customMessage: 'Esta conta já foi ativada. Faça login para acessar o sistema.'
            });
        }

        if (!usuario.convidadoEm) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'invalidInvitation',
                field: 'Token',
                details: [],
                customMessage: 'Convite inválido. Solicite um novo convite ao administrador.'
            });
        }

        const minutosDesdeConvite = (new Date() - new Date(usuario.convidadoEm)) / (1000 * 60);
        if (minutosDesdeConvite > 5) {
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'tokenExpired',
                field: 'Token',
                details: [],
                customMessage: 'Token de convite expirado. Solicite um novo convite ao administrador.'
            });
        }

        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(senha, saltRounds);

        let permissoes = [];
        try {
            const grupoUsuario = await this.grupoRepository.buscarPorNome("Usuario", null, null);
            if (grupoUsuario) {
                permissoes = grupoUsuario.permissoes || [];
            }
        } catch (error) {
            console.warn('Não foi possível buscar o grupo "Usuario" padrão:', error.message);
        }

        const usuarioAtualizado = await this.repository.atualizar(usuario._id, {
            senha: senhaHash,
            ativo: true,
            ativadoEm: new Date(),
            tokenConvite: null,
            convidadoEm: null,
            permissoes
        });

        return {
            message: 'Conta ativada com sucesso! Você já pode fazer login.',
            usuario: {
                id: usuarioAtualizado._id,
                nome: usuarioAtualizado.nome,
                email: usuarioAtualizado.email
            }
        };
    }

    async reenviarConvite(id) {
        const usuario = await this.repository.buscarPorId(id);

        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: messages.error.resourceNotFound('Usuário')
            });
        }

        if (usuario.ativo && usuario.ativadoEm) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'Usuário',
                details: [],
                customMessage: 'Este usuário já ativou sua conta.'
            });
        }

        const tokenConvite = await tokenUtil.generateInviteToken(usuario.email);
        const convidadoEm = new Date();

        await this.repository.atualizar(usuario._id, {
            tokenConvite,
            convidadoEm
        });

        await EmailService.enviarEmailConvite(usuario.nome, usuario.email, tokenConvite);

        return {
            message: 'Convite reenviado com sucesso!'
        };
    }
};

export default UsuarioService;
