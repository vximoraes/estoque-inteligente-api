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
        const metodosPermitidos = ['GET', 'PATCH', 'PUT', 'DELETE'];
        if (metodosPermitidos.includes(httpMethod)) {
          return true;
        }
      }

      const usuarioObj = usuario as unknown as {
        permissoes?: IGrupoPermissao[];
        grupos?: Array<{ permissoes?: IGrupoPermissao[] }>;
      };

      let permissoes: IGrupoPermissao[] = usuarioObj.permissoes ?? [];

      if (Array.isArray(usuarioObj.grupos)) {
        for (const grupo of usuarioObj.grupos) {
          permissoes = permissoes.concat(grupo.permissoes ?? []);
        }
      }

      const permissoesUnicas: IGrupoPermissao[] = [];
      const combinacoes = new Set<string>();

      permissoes.forEach((permissao) => {
        if (!combinacoes.has(permissao.rota)) {
          combinacoes.add(permissao.rota);
          permissoesUnicas.push(permissao);
        }
      });

      return permissoesUnicas.some((permissao) => {
        return (
          permissao.rota === rota &&
          permissao.ativo &&
          (permissao as unknown as Record<string, unknown>)[metodo]
        );
      });
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }
}

export default PermissionService;
