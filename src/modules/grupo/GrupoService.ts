import GrupoRepository from './GrupoRepository.js';
import UsuarioRepository from '../usuario/UsuarioRepository.js';
import RotaRepository from '../rota/RotaRepository.js';
import {
  CustomError,
  HttpStatusCodes,
  messages,
} from '../../utils/helpers/index.js';
import type { AuthenticatedRequest } from '../../utils/types.js';
import type { Grupo, GrupoUpdate } from './GrupoSchema.js';

class GrupoService {
  private repository: GrupoRepository;
  private usuarioRepository: UsuarioRepository;
  private rotaRepository: RotaRepository;

  constructor() {
    this.repository = new GrupoRepository();
    this.usuarioRepository = new UsuarioRepository();
    this.rotaRepository = new RotaRepository();
  }

  async listar(req: AuthenticatedRequest) {
    return this.repository.listar(req);
  }

  async criar(parsedData: Grupo) {
    const grupo = await this.repository.buscarPorNome(parsedData.nome);
    if (grupo) {
      throw new CustomError({
        statusCode: HttpStatusCodes.CONFLICT.code,
        errorType: 'resourceConflict',
        field: 'Grupos',
        details: [],
        customMessage: messages.error.resourceConflict(
          'Grupos',
          'nome duplicado',
        ),
      });
    }
    await this.validarPermissoes(parsedData.permissoes);
    return this.repository.criar(
      parsedData as unknown as Record<string, unknown>,
    );
  }

  async atualizar(
    parsedData: GrupoUpdate,
    id: string,
    user: Record<string, unknown> | undefined,
  ) {
    await this.repository.buscarPorId(id);
    const grupo = await this.repository.buscarPorNome(
      parsedData.nome ?? '',
      id,
    );
    await this.verificarGrupo(user, id);
    if (grupo) {
      throw new CustomError({
        statusCode: HttpStatusCodes.CONFLICT.code,
        errorType: 'resourceConflict',
        field: 'Grupos',
        details: [],
        customMessage: messages.error.resourceConflict(
          'Grupos',
          'nome duplicado',
        ),
      });
    }
    await this.validarPermissoes(parsedData.permissoes);
    return this.repository.atualizar(
      id,
      parsedData as unknown as Record<string, unknown>,
    );
  }

  // Evita permissao "orfa" apontando pra rota+dominio que nao existe em Rota.
  async validarPermissoes(permissoes: Grupo['permissoes'] | undefined) {
    if (!permissoes || permissoes.length === 0) return;

    const pares = await this.repository.obterParesRotaDominioUnicos(permissoes);
    const rotasEncontradas = await this.repository.buscarPorPermissao(pares);

    if (rotasEncontradas.length !== pares.length) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'Permissoes',
        details: [],
        customMessage:
          'Uma ou mais permissoes referenciam rota/dominio inexistentes.',
      });
    }
  }

  async deletar(id: string, user: Record<string, unknown> | undefined) {
    await this.repository.buscarPorId(id);
    await this.verificarGrupo(user, id);
    return this.repository.deletar(id);
  }

  async verificarGrupo(user: Record<string, unknown> | undefined, id: string) {
    const usuario = await this.usuarioRepository.buscarPorId(
      user?.['id'] as string,
    );
    const grupoUsuario = usuario.toObject() as {
      grupos: { _id: { toString(): string } }[];
    };
    for (const grupo of grupoUsuario.grupos) {
      if (grupo._id.toString() === id) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: 'Forbidden',
          field: 'Grupos',
          details: [],
          customMessage: 'Este grupo nao pode ser alterado ou deletado.',
        });
      }
    }
  }

  async adicionarRota(idGrupo: string, idRota: string) {
    const grupo = await this.repository.buscarPorId(idGrupo);
    const rota = await this.rotaRepository.buscarPorId(idRota);

    const existRota = grupo.permissoes.find((item) => item.rota === rota.rota);
    if (existRota) {
      throw new CustomError({
        statusCode: HttpStatusCodes.CONFLICT.code,
        errorType: 'resourceConflict',
        field: 'Rotas',
        details: [],
        customMessage: messages.error.resourceConflict(
          'Grupos',
          'rotas duplicadas',
        ),
      });
    }
    return this.repository.adiciotarRota(idGrupo, rota);
  }
}

export default GrupoService;
