import UsuarioRepository from '../../modules/usuario/UsuarioRepository.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type { IGrupoPermissao } from '../../modules/grupo/GrupoModel.js';

class PermissionService {
  private repository: UsuarioRepository;

  constructor() {
    this.repository = new UsuarioRepository();
  }

  async hasPermission(
    userId: string,
    rota: string,
    metodo: string,
    params: Record<string, string> = {},
    httpMethod = '',
  ): Promise<boolean> {
    try {
      const usuario = await this.repository.buscarPorIdComGrupos(userId);
      if (!usuario) {
        throw new CustomError({
          statusCode: 404,
          errorType: 'resourceNotFound',
          field: 'Usuário',
          details: [],
          customMessage: messages.error.resourceNotFound('Usuário'),
        });
      }

      if (rota === 'usuarios' && params['id'] && params['id'] === userId) {
        const metodosPermitidos = ['GET', 'PATCH', 'PUT'];
        if (metodosPermitidos.includes(httpMethod)) {
          return true;
        }
      }

      const permissao = this.unirPermissoes(usuario).find(
        (p) => p.rota === rota,
      );
      return Boolean(
        permissao?.ativo &&
        (permissao as unknown as Record<string, unknown>)[metodo],
      );
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }

  async permissoesEfetivas(userId: string): Promise<IGrupoPermissao[]> {
    const usuario = await this.repository.buscarPorIdComGrupos(userId);
    if (!usuario) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }
    return this.unirPermissoes(usuario);
  }

  private unirPermissoes(usuario: unknown): IGrupoPermissao[] {
    const usuarioObj = usuario as {
      permissoes?: IGrupoPermissao[];
      grupos?: Array<{ permissoes?: IGrupoPermissao[] }>;
    };
    const todas = [
      ...(usuarioObj.permissoes ?? []),
      ...(usuarioObj.grupos ?? []).flatMap((grupo) => grupo.permissoes ?? []),
    ];

    const porRota = new Map<string, IGrupoPermissao>();
    for (const p of todas) {
      const atual = porRota.get(p.rota) ?? {
        rota: p.rota,
        ativo: false,
        buscar: false,
        enviar: false,
        substituir: false,
        modificar: false,
        excluir: false,
      };
      porRota.set(p.rota, {
        rota: p.rota,
        ativo: atual.ativo || p.ativo,
        buscar: atual.buscar || (p.ativo && p.buscar),
        enviar: atual.enviar || (p.ativo && p.enviar),
        substituir: atual.substituir || (p.ativo && p.substituir),
        modificar: atual.modificar || (p.ativo && p.modificar),
        excluir: atual.excluir || (p.ativo && p.excluir),
      });
    }
    return [...porRota.values()];
  }
}

export default PermissionService;
