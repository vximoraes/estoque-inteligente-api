import UsuarioModel from '../../../modules/usuario/UsuarioModel.js';

export async function buscarUsuarios(
  {
    nome,
    email,
    ativo,
    limite = 20,
  }: { nome?: string; email?: string; ativo?: boolean; limite?: number },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = {};

  if (nome) filtros['nome'] = { $regex: nome, $options: 'i' };
  if (email) filtros['email'] = { $regex: email, $options: 'i' };
  if (ativo !== undefined) filtros['ativo'] = ativo;

  const usuarios = await UsuarioModel.find(filtros)
    .populate('grupos', 'nome')
    .sort({ nome: 1 })
    .limit(Math.min(Number(limite), 50))
    .lean();

  return usuarios.map((u) => {
    const uObj = u as Record<string, unknown>;
    const grupos = uObj['grupos'] as Record<string, unknown>[] | null;
    return {
      nome: uObj['nome'],
      email: uObj['email'],
      ativo: uObj['ativo'],
      grupos: (grupos ?? []).map((g) => g['nome']),
      ativadoEm: uObj['ativadoEm'] ?? null,
    };
  });
}
