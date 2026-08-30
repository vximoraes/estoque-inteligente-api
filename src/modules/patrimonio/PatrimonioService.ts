import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import PatrimonioRepository from './PatrimonioRepository.js';
import PatrimonioModel, { type PatrimonioDocument } from './PatrimonioModel.js';
import PatrimonioEventoModel, {
  type PatrimonioEventoTipo,
} from './PatrimonioEventoModel.js';
import CategoriaModel from '../categoria/CategoriaModel.js';
import LocalizacaoModel from '../localizacao/LocalizacaoModel.js';
import minioClient from '../../config/MinIO.js';
import compress from '../../config/SharpConfig.js';
import {
  CustomError,
  HttpStatusCodes,
  messages,
  urlPublicaPatrimonio,
  describirErro,
} from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type {
  Patrimonio,
  PatrimonioLote,
  PatrimonioUpdate,
  PatrimonioStatus,
  PatrimonioLocalizacaoInput,
} from './PatrimonioSchema.js';

// Máquina de estados de `transicionar`: chave é "statusAtual->statusNovo".
// Ausência de entrada = transição proibida. `Emprestado` nunca aparece como
// origem (só sai por devolução) nem como destino (só entra por empréstimo)
// — ver `emprestarUnidade`/`devolverUnidade`.
const EVENTO_POR_TRANSICAO: Record<string, PatrimonioEventoTipo> = {
  'Disponível->Manutenção': 'manutencao_entrada',
  'Manutenção->Disponível': 'manutencao_saida',
  'Disponível->Baixado': 'baixa',
  'Manutenção->Baixado': 'baixa',
  'Baixado->Disponível': 'reativacao',
};

class PatrimonioService {
  private repository: PatrimonioRepository;

  constructor() {
    this.repository = new PatrimonioRepository();
  }

  async criar(parsedData: Patrimonio, req: AuthenticatedRequest) {
    await this.validarCategoriaPermanente(parsedData.categoria);
    await this.validarLocalizacao(parsedData.localizacao);

    const status = parsedData.status ?? 'Disponível';

    const criado = await this.repository.criar({
      ...parsedData,
      status,
      ativo: true,
      usuario: req.user_id,
    });

    if (!criado) {
      throw new CustomError({
        statusCode: 500,
        errorType: 'internalServerError',
        field: 'Patrimonio',
        details: [],
        customMessage: messages.error.internalServerError('Patrimônio'),
      });
    }

    await PatrimonioEventoModel.create({
      patrimonio: criado._id,
      tipo: 'cadastro',
      status_anterior: null,
      status_novo: status,
      localizacao_nova: parsedData.localizacao,
      observacoes: parsedData.observacoes,
      usuario: req.user_id,
    });

    return criado;
  }

  // Numeração sequencial `${prefixo}-0001`, `${prefixo}-0002`... a partir de
  // `numero_inicial`. Mongoose `Model.create(array)` salva cada doc
  // individualmente (dispara os hooks de `post save`), mas sem transação —
  // uma colisão de `numero_patrimonio` no meio do lote deixa as unidades
  // anteriores já gravadas. Aceitável para o volume esperado (dezenas de
  // unidades por lote, não milhares).
  async criarLote(parsedData: PatrimonioLote, req: AuthenticatedRequest) {
    await this.validarCategoriaPermanente(parsedData.categoria);
    await this.validarLocalizacao(parsedData.localizacao);

    const unidades = Array.from(
      { length: parsedData.quantidade },
      (_, indice) => ({
        modelo: parsedData.modelo,
        fabricante: parsedData.fabricante,
        categoria: parsedData.categoria,
        localizacao: parsedData.localizacao,
        numero_patrimonio: `${parsedData.prefixo}-${String(
          parsedData.numero_inicial + indice,
        ).padStart(4, '0')}`,
        status: 'Disponível' as const,
        ativo: true,
        data_aquisicao: parsedData.data_aquisicao,
        observacoes: parsedData.observacoes,
        usuario: req.user_id,
      }),
    );

    const criados = await this.repository.criarMuitos(unidades);

    await PatrimonioEventoModel.insertMany(
      criados.map((patrimonio) => ({
        patrimonio: patrimonio._id,
        tipo: 'cadastro' as const,
        status_anterior: null,
        status_novo: 'Disponível',
        localizacao_nova: parsedData.localizacao,
        observacoes: parsedData.observacoes,
        usuario: req.user_id,
      })),
    );

    return criados;
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async buscarPorId(id: string, req: AuthenticatedRequest) {
    return await this.repository.buscarPorId(id, req);
  }

  async buscarEventos(id: string, req: AuthenticatedRequest) {
    await this.buscarDocumentoOuFalhar(id);
    return await this.repository.buscarEventosPorPatrimonio(id, req);
  }

  // Só metadados de cadastro — `status`/`localizacao` nunca chegam aqui
  // (nem estão em `PatrimonioUpdateSchema`).
  async atualizar(
    id: string,
    parsedData: PatrimonioUpdate,
    req: AuthenticatedRequest,
  ) {
    await this.buscarDocumentoOuFalhar(id);
    return await this.repository.atualizar(
      id,
      parsedData as Record<string, unknown>,
      req,
    );
  }

  async transicionar(
    id: string,
    parsedData: PatrimonioStatus,
    req: AuthenticatedRequest,
  ) {
    const patrimonio = await this.buscarDocumentoOuFalhar(id);

    // Defesa redundante: `PatrimonioStatusSchema` já não aceita 'Emprestado',
    // mas um chamador interno futuro poderia contornar o schema.
    if ((parsedData.status as string) === 'Emprestado') {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'status',
        details: [],
        customMessage:
          'Transição para "Emprestado" só ocorre pelo fluxo de empréstimo.',
      });
    }

    if (patrimonio.status === 'Emprestado') {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'status',
        details: [],
        customMessage:
          'Unidade emprestada; devolva o empréstimo antes de mudar o status.',
      });
    }

    if (patrimonio.status === parsedData.status) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'status',
        details: [],
        customMessage: `Unidade já está em "${parsedData.status}".`,
      });
    }

    const chave = `${patrimonio.status}->${parsedData.status}`;
    const tipoEvento = EVENTO_POR_TRANSICAO[chave];
    if (!tipoEvento) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'status',
        details: [],
        customMessage: `Transição de "${patrimonio.status}" para "${parsedData.status}" não é permitida.`,
      });
    }

    const statusAnterior = patrimonio.status;

    const atualizado = await PatrimonioModel.findOneAndUpdate(
      { _id: id },
      { status: parsedData.status },
      { new: true },
    ).populate('localizacao');

    await PatrimonioEventoModel.create({
      patrimonio: id,
      tipo: tipoEvento,
      status_anterior: statusAnterior,
      status_novo: parsedData.status,
      observacoes: parsedData.observacoes,
      usuario: req.user_id,
    });

    return atualizado;
  }

  async transferir(
    id: string,
    parsedData: PatrimonioLocalizacaoInput,
    req: AuthenticatedRequest,
  ) {
    const patrimonio = await this.buscarDocumentoOuFalhar(id);

    if (patrimonio.status === 'Emprestado') {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'localizacao',
        details: [],
        customMessage:
          'Unidade emprestada; a localização é definida pelo fluxo de empréstimo/devolução.',
      });
    }

    await this.validarLocalizacao(parsedData.localizacao);

    const localizacaoAnterior = patrimonio.localizacao;

    const atualizado = await PatrimonioModel.findOneAndUpdate(
      { _id: id },
      { localizacao: parsedData.localizacao },
      { new: true },
    ).populate('localizacao');

    await PatrimonioEventoModel.create({
      patrimonio: id,
      tipo: 'transferencia',
      status_anterior: patrimonio.status,
      status_novo: patrimonio.status,
      localizacao_anterior: localizacaoAnterior,
      localizacao_nova: parsedData.localizacao,
      observacoes: parsedData.observacoes,
      usuario: req.user_id,
    });

    return atualizado;
  }

  async inativar(id: string, req: AuthenticatedRequest) {
    const patrimonio = await this.buscarDocumentoOuFalhar(id);

    if (patrimonio.status === 'Emprestado') {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'ativo',
        details: [],
        customMessage: 'Unidade emprestada; devolva antes de inativar.',
      });
    }

    return await this.repository.atualizar(id, { ativo: false }, req);
  }

  // --- Consumidos pela Fase 3 (EmprestimoService); ainda não chamados por
  // nenhuma rota deste módulo. ---

  // Transição atômica Disponível→Emprestado. Retorna `null` se a unidade já
  // não estava disponível (outra requisição chegou primeiro) — cabe ao
  // caller (EmprestimoService) decidir o 409. É o único ponto do sistema
  // com garantia real contra concorrência dupla.
  async emprestarUnidade(patrimonioId: string, req: AuthenticatedRequest) {
    const existe = await PatrimonioModel.exists({ _id: patrimonioId });
    if (!existe) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Patrimonio',
        details: [],
        customMessage: messages.error.resourceNotFound('Patrimônio'),
      });
    }

    const atualizado = await PatrimonioModel.findOneAndUpdate(
      { _id: patrimonioId, status: 'Disponível' },
      { status: 'Emprestado' },
      { new: true },
    );

    if (!atualizado) {
      return null;
    }

    await PatrimonioEventoModel.create({
      patrimonio: patrimonioId,
      tipo: 'emprestimo',
      status_anterior: 'Disponível',
      status_novo: 'Emprestado',
      usuario: req.user_id,
    });

    return atualizado;
  }

  // Caminho inverso de `emprestarUnidade`. `localizacaoRetorno` é opcional —
  // default é a localização já registrada na unidade (o bem pode, no
  // entanto, voltar para outro lugar).
  async devolverUnidade(
    patrimonioId: string,
    { localizacaoRetorno }: { localizacaoRetorno?: string },
    req: AuthenticatedRequest,
  ) {
    const atual = await this.buscarDocumentoOuFalhar(patrimonioId);
    const localizacaoNova = localizacaoRetorno ?? atual.localizacao.toString();

    const atualizado = await PatrimonioModel.findOneAndUpdate(
      { _id: patrimonioId, status: 'Emprestado' },
      { status: 'Disponível', localizacao: localizacaoNova },
      { new: true },
    );

    if (!atualizado) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'status',
        details: [],
        customMessage: 'Unidade não está emprestada.',
      });
    }

    await PatrimonioEventoModel.create({
      patrimonio: patrimonioId,
      tipo: 'devolucao',
      status_anterior: 'Emprestado',
      status_novo: 'Disponível',
      localizacao_anterior: atual.localizacao,
      localizacao_nova: localizacaoNova,
      usuario: req.user_id,
    });

    return atualizado;
  }

  async uploadFoto(req: AuthenticatedRequest, id: string) {
    await this.buscarDocumentoOuFalhar(id);

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
          imagem: urlPublicaPatrimonio(id),
        },
        req,
      );
      const newFile = await compress(file.buffer);
      const objectName = `${id}.jpeg`;
      await minioClient.send(
        new PutObjectCommand({
          Bucket: process.env['MINIO_BUCKET_3']!,
          Key: objectName,
          Body: newFile,
          ContentType: 'image/jpeg',
        }),
      );

      return { imagem: (data as PatrimonioDocument).imagem };
    } catch (err) {
      throw new Error(describirErro(err));
    }
  }

  async deletarFoto(req: AuthenticatedRequest, id: string) {
    await this.buscarDocumentoOuFalhar(id);

    const objectName = `${id}.jpeg`;
    await minioClient.send(
      new DeleteObjectCommand({
        Bucket: process.env['MINIO_BUCKET_3']!,
        Key: objectName,
      }),
    );
    const data = await this.repository.atualizar(id, { imagem: '' }, req);

    return { imagem: (data as PatrimonioDocument).imagem };
  }

  private async validarCategoriaPermanente(categoriaId: string) {
    const categoria = await CategoriaModel.findById(categoriaId);
    if (!categoria) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Categoria',
        details: [],
        customMessage: messages.error.resourceNotFound('Categoria'),
      });
    }
    if (categoria.tipo !== 'permanente') {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'categoria',
        details: [],
        customMessage:
          'Só é possível cadastrar unidade de patrimônio para categoria do tipo "permanente".',
      });
    }
    return categoria;
  }

  private async validarLocalizacao(localizacaoId: string) {
    const localizacao = await LocalizacaoModel.findById(localizacaoId);
    if (!localizacao) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Localizacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Localizacao'),
      });
    }
    return localizacao;
  }

  private async buscarDocumentoOuFalhar(
    id: string,
  ): Promise<PatrimonioDocument> {
    const patrimonio = await PatrimonioModel.findById(id);
    if (!patrimonio) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Patrimonio',
        details: [],
        customMessage: messages.error.resourceNotFound('Patrimônio'),
      });
    }
    return patrimonio;
  }
}

export default PatrimonioService;
