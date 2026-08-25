import CategoriaModel from '../../../modules/categoria/CategoriaModel.js';

interface BuscarCategoriasArgs {
  tipo?: 'consumo' | 'permanente';
}

export async function buscarCategorias(
  args: BuscarCategoriasArgs,
  _usuarioId: string,
) {
  const filtro: Record<string, unknown> = { ativo: true };
  if (args.tipo) {
    filtro['tipo'] = args.tipo;
  }

  const categorias = await CategoriaModel.find(filtro).sort({ nome: 1 }).lean();

  return categorias.map((c) => ({
    id: c._id,
    nome: c.nome,
    tipo: c.tipo,
  }));
}
