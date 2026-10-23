import CategoriaModel from '../../../modules/categoria/CategoriaModel.js';
import ItemModel from '../../../modules/item/ItemModel.js';
import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';
import { escapeRegex } from '../../../utils/helpers/escapeRegex.js';
import { resultadoLimitado } from '../resultadoLimitado.js';

interface BuscarCategoriasArgs {
  tipo?: 'consumo' | 'permanente';
  nome?: string;
}

export async function buscarCategorias(
  args: BuscarCategoriasArgs,
  _usuarioId: string,
) {
  const filtro: Record<string, unknown> = { ativo: true };
  if (args.tipo) {
    filtro['tipo'] = args.tipo;
  }
  if (args.nome) {
    filtro['nome'] = { $regex: escapeRegex(args.nome), $options: 'i' };
  }

  const categorias = await CategoriaModel.find(filtro).sort({ nome: 1 }).lean();
  const ids = categorias.map((c) => c._id);

  const contarPorCategoria = async (
    model: typeof ItemModel | typeof PatrimonioModel,
  ) => {
    const grupos = (await model.aggregate([
      { $match: { categoria: { $in: ids }, ativo: true } },
      { $group: { _id: '$categoria', total: { $sum: 1 } } },
    ])) as Array<{ _id: unknown; total: number }>;
    return new Map(grupos.map((g) => [String(g._id), g.total]));
  };

  const [itensPorCategoria, unidadesPorCategoria] = await Promise.all([
    contarPorCategoria(ItemModel),
    contarPorCategoria(PatrimonioModel),
  ]);

  const registros = categorias.map((c) => ({
    id: c._id,
    nome: c.nome,
    tipo: c.tipo,
    descricao: c.descricao ?? null,
    ...(c.tipo === 'consumo'
      ? { itens_ativos: itensPorCategoria.get(String(c._id)) ?? 0 }
      : {
          unidades_patrimonio_ativas:
            unidadesPorCategoria.get(String(c._id)) ?? 0,
        }),
  }));

  return resultadoLimitado(registros, registros.length);
}
