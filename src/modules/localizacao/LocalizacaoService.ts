import LocalizacaoRepository from './LocalizacaoRepository.js';
import EstoqueModel from '../estoque/EstoqueModel.js';
import {
  CustomError,
  HttpStatusCodes,
  messages,
} from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Localizacao, LocalizacaoUpdate } from './LocalizacaoSchema.js';

class LocalizacaoService {
  private repository: LocalizacaoRepository;

  constructor() {
    this.repository = new LocalizacaoRepository();
  }

  async criar(parsedData: Localizacao, req: AuthenticatedRequest) {
    await this.validateNome(parsedData.nome, null, req);

    const data = await this.repository.criar({ ...parsedData, usuario: req.user_id });

    return data;
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async atualizar(id: string, parsedData: LocalizacaoUpdate, req: AuthenticatedRequest) {
    await this.ensureLocationExists(id, req);
    if (parsedData.nome) {
      await this.validateNome(parsedData.nome, id, req);
    }

    return await this.repository.atualizar(id, parsedData as Record<string, unknown>, req);
  }

  async inativar(id: string, req: AuthenticatedRequest) {
    await this.ensureLocationExists(id, req);

    const estoques = await EstoqueModel.find({ localizacao: id }).populate('item');

    const temItemAtivo = estoques.some((estoque) => {
      const item = estoque.item as unknown as { ativo?: boolean } | null;
      return item && item.ativo === true;
    });

    if (temItemAtivo) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'resourceInUse',
        field: 'Localizacao',
        details: [],
        customMessage: 'Localização possui estoque de itens ativos.',
      });
    }

    return await this.repository.atualizar(id, { ativo: false }, req);
  }

  private async validateNome(nome: string, id: string | null = null, req: AuthenticatedRequest) {
    const localizacaoExistente = await this.repository.buscarPorNome(nome, id, req);
    if (localizacaoExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'nome',
        details: [{ path: 'nome', message: 'Nome já está em uso.' }],
        customMessage: 'Nome já está em uso.',
      });
    }
  }

  private async ensureLocationExists(id: string, req: AuthenticatedRequest) {
    const localizacaoExistente = await this.repository.buscarPorId(id, false, req);
    if (!localizacaoExistente) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Localizacao',
        details: [],
        customMessage: messages.error.resourceNotFound('Localizacao'),
      });
    }

    return localizacaoExistente;
  }
}

export default LocalizacaoService;
