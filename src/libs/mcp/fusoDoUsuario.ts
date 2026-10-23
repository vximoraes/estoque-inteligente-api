import UsuarioModel from '../../modules/usuario/UsuarioModel.js';
import { resolverFuso } from '../../utils/fusoHorario.js';

export async function fusoDoUsuario(usuarioId: string): Promise<string> {
  const usuario = await UsuarioModel.findById(usuarioId)
    .select('fuso_horario')
    .lean();
  return resolverFuso(usuario?.fuso_horario);
}
