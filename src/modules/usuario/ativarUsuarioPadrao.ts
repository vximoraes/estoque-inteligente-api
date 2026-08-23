import UsuarioRepository from './UsuarioRepository.js';
import GrupoRepository from '../grupo/GrupoRepository.js';
import type { IGrupoPermissao } from '../grupo/GrupoModel.js';

const usuarioRepository = new UsuarioRepository();
const grupoRepository = new GrupoRepository();

export async function ativarUsuarioPadrao(userId: string) {
  let permissoes: IGrupoPermissao[] = [];
  try {
    const grupoUsuario = await grupoRepository.buscarPorNome('Usuario');
    if (grupoUsuario) {
      permissoes = grupoUsuario.permissoes;
    }
  } catch (error) {
    console.warn(
      'Nao foi possivel buscar o grupo "Usuario" padrao:',
      (error as Error).message,
    );
  }

  return usuarioRepository.atualizar(userId, {
    ativo: true,
    ativadoEm: new Date(),
    convidadoEm: null,
    permissoes: permissoes as unknown as Record<string, unknown>[],
  });
}
