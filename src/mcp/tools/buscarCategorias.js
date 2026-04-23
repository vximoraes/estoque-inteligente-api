import CategoriaModel from '../../models/Categoria.js';

export async function buscarCategorias(_args, _usuarioId) {
  const categorias = await CategoriaModel.find({ ativo: true }).sort({ nome: 1 }).lean();

  return categorias.map((c) => ({
    id: c._id,
    nome: c.nome,
  }));
}
