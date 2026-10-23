import UsuarioRepository from './UsuarioRepository.js';
import GrupoRepository from '../grupo/GrupoRepository.js';

const usuarioRepository = new UsuarioRepository();
const grupoRepository = new GrupoRepository();

export async function ativarUsuarioPadrao(userId: string) {
  let grupos: unknown[] = [];
  try {
    const grupoUsuario = await grupoRepository.buscarPorNome('Usuario');
    if (grupoUsuario) {
      grupos = [grupoUsuario._id];
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
    grupos,
    permissoes: [],
  });
}
