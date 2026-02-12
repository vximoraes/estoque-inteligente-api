import ComponenteRepository from '../repositories/ComponenteRepository.js';
import { CommonResponse, CustomError, HttpStatusCodes, errorHandler, messages, StatusService, asyncWrapper } from '../utils/helpers/index.js';
import CategoriaModel from '../models/Categoria.js';
import minioClient from '../config/MinIO.js';
import compress from '../config/SharpConfig.js';

class ComponenteService {
    constructor() {
        this.repository = new ComponenteRepository();
    };

    async criar(parsedData, req) {
        await this.validateNome(parsedData.nome, null, req);
        await this.validateCategoria(parsedData.categoria, req);

        parsedData.usuario = req.user_id;
        parsedData.quantidade = 0;

        const data = await this.repository.criar(parsedData);

        return data;
    };

    async listar(req) {
        const data = await this.repository.listar(req);

        return data;
    };

    async atualizar(id, parsedData, req) {
        await this.ensureComponentExists(id, req);
        await this.validateNome(parsedData.nome, id, req);

        delete parsedData.quantidade;

        const data = await this.repository.atualizar(id, parsedData, req);

        return data;
    };

    async inativar(id, req) {
        await this.ensureComponentExists(id, req);

        const data = await this.repository.atualizar(id, { ativo: false }, req);

        return data;
    };

    // Métodos auxiliares.

    async validateNome(nome, id = null, req) {
        const componenteExistente = await this.repository.buscarPorNome(nome, id, req);
        if (componenteExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'nome',
                details: [{ path: 'nome', message: 'Nome já está em uso.' }],
                customMessage: 'Nome já está em uso.',
            });
        };
    };

    async ensureComponentExists(id, req) {
        const componenteExistente = await this.repository.buscarPorId(id, false, req);
        if (!componenteExistente) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Componente',
                details: [],
                customMessage: messages.error.resourceNotFound('Componente'),
            });
        };

        return componenteExistente;
    };

    async validateCategoria(categoriaId, req) {
        const categoria = await CategoriaModel.findOne({ _id: categoriaId });
        if (!categoria) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'categoria',
                details: [{ path: 'categoria', message: 'Categoria não encontrada.' }],
                customMessage: 'Categoria não encontrada.',
            });
        };
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
                imagem:
                    `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET_2}/${id}.jpeg`
            }, req)
            const newFile = await compress(file.buffer);
            const objectName = `${id}.jpeg`;
            await minioClient.putObject(process.env.MINIO_BUCKET_2, objectName, newFile, {
                'Content-Type': file.mimetype,
            });

            return {imagem: data.imagem};
        } catch (err) {
            throw new Error(err);
        };
    }
    async deletarFoto(req, id) {
        const objectName = `${id}.jpeg`
        await minioClient.removeObject(process.env.MINIO_BUCKET_2, objectName, (err) => {
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
        const data = await this.repository.atualizar(id, { imagem: "" }, req)

        return { imagem: data.imagem}
    }
};

export default ComponenteService;