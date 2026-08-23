import CategoriaModel from '../../../modules/categoria/CategoriaModel.js';

export async function buscarCategorias(_args: unknown, _usuarioId: string) {
  const categorias = await CategoriaModel.find({ ativo: true })
    .sort({ nome: 1 })
    .lean();

  return categorias.map((c) => ({
    id: c._id,
    nome: c.nome,
  }));
}
