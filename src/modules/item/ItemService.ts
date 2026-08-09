import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import ItemRepository from './ItemRepository.js';
import {
  CustomError,
  HttpStatusCodes,
  messages,
  urlPublicaItem,
  describirErro,
} from '../../utils/helpers/index.js';
import CategoriaModel from '../categoria/CategoriaModel.js';
import minioClient from '../../config/MinIO.js';
import compress from '../../config/SharpConfig.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Item, ItemUpdate } from './ItemSchema.js';

class ItemService {
  private repository: ItemRepository;

  constructor() {
    this.repository = new ItemRepository();
  }

  async criar(parsedData: Item, req: AuthenticatedRequest) {
    await this.validateNome(parsedData.nome, null, req);
    await this.validateCategoria(parsedData.categoria, req);

    return await this.repository.criar({
      ...parsedData,
      usuario: req.user_id,
      quantidade: 0,
    });
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async stats(req: AuthenticatedRequest) {
    return await this.repository.stats(req);
  }

  async atualizar(
    id: string,
    parsedData: ItemUpdate,
    req: AuthenticatedRequest,
  ) {
    await this.ensureItemExists(id, req);
    if (parsedData.nome) {
      await this.validateNome(parsedData.nome, id, req);
    }

    const { quantidade: _quantidade, ...dataWithoutQuantidade } =
      parsedData as Record<string, unknown>;

    return await this.repository.atualizar(id, dataWithoutQuantidade, req);
  }

  async inativar(id: string, req: AuthenticatedRequest) {
    await this.ensureItemExists(id, req);
    return await this.repository.atualizar(id, { ativo: false }, req);
  }

  private async validateNome(
    nome: string | undefined,
    id: string | null = null,
    req: AuthenticatedRequest,
  ) {
    if (!nome) return;
    const itemExistente = await this.repository.buscarPorNome(nome, id, req);
    if (itemExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'nome',
        details: [{ path: 'nome', message: 'Nome já está em uso.' }],
        customMessage: 'Nome já está em uso.',
      });
    }
  }

  private async ensureItemExists(id: string, req: AuthenticatedRequest) {
    const itemExistente = await this.repository.buscarPorId(id, false, req);
    if (!itemExistente) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Item',
        details: [],
        customMessage: messages.error.resourceNotFound('Item'),
      });
    }
    return itemExistente;
  }

  private async validateCategoria(
    categoriaId: string,
    _req: AuthenticatedRequest,
  ) {
    const categoria = await CategoriaModel.findOne({ _id: categoriaId });
    if (!categoria) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'categoria',
        details: [{ path: 'categoria', message: 'Categoria não encontrada.' }],
        customMessage: 'Categoria não encontrada.',
      });
    }
  }

  async uploadFoto(req: AuthenticatedRequest, id: string) {
    const file = req.file;
    if (!file) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'badRequest',
        field: 'Foto',
        details: [
          {
            path: 'Foto',
            message: 'Nenhum arquivo foi enviado ou o arquivo está vazio.',
          },
        ],
        customMessage: 'Nenhum arquivo foi enviado ou o arquivo está vazio.',
      });
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new CustomError({
        statusCode: HttpStatusCodes.PAYLOAD_TOO_LARGE.code,
        errorType: 'payloadTooLarge',
        field: 'Imagem',
        details: [{ path: 'Imagem', message: 'Arquivo é superior a 5 MB' }],
        customMessage: 'O arquivo é maior do que 5 MB.',
      });
    }
    try {
      const data = await this.repository.atualizar(
        id,
        {
          imagem: urlPublicaItem(id),
        },
        req,
      );
      const newFile = await compress(file.buffer);
      const objectName = `${id}.jpeg`;
      await minioClient.send(
        new PutObjectCommand({
          Bucket: process.env['MINIO_BUCKET_2']!,
          Key: objectName,
          Body: newFile,
          ContentType: 'image/jpeg',
        }),
      );

      return { imagem: (data as Record<string, unknown>)['imagem'] };
    } catch (err) {
      throw new Error(describirErro(err));
    }
  }

  async deletarFoto(req: AuthenticatedRequest, id: string) {
    const objectName = `${id}.jpeg`;
    await minioClient.send(
      new DeleteObjectCommand({
        Bucket: process.env['MINIO_BUCKET_2']!,
        Key: objectName,
      }),
    );
    const data = await this.repository.atualizar(id, { imagem: '' }, req);

    return { imagem: (data as Record<string, unknown>)['imagem'] };
  }
}

export default ItemService;
