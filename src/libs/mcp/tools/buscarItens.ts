import ItemModel from '../../../modules/item/ItemModel.js';
import CategoriaModel from '../../../modules/categoria/CategoriaModel.js';
import EstoqueModel from '../../../modules/estoque/EstoqueModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';

export async function buscarItens(
  {
    nome,
    status,
    categoria,
    localizacao,
    limite = 20,
  }: {
    nome?: string;
    status?: string;
    categoria?: string;
    localizacao?: string;
    limite?: number;
  },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };

  if (nome) filtros['nome'] = { $regex: nome, $options: 'i' };
  if (status) filtros['status'] = status;

  if (categoria) {
    const categoriasCorrespondentes = await CategoriaModel.find({
      nome: { $regex: categoria, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['categoria'] = {
      $in: categoriasCorrespondentes.map((c) => c._id),
    };
  }

  if (localizacao) {
    const localizacoesCorrespondentes = await LocalizacaoModel.find({
      nome: { $regex: localizacao, $options: 'i' },
    })
      .select('_id')
      .lean();
    const estoquesCorrespondentes = await EstoqueModel.find({
      localizacao: { $in: localizacoesCorrespondentes.map((l) => l._id) },
    })
      .select('item')
      .lean();
    filtros['_id'] = { $in: estoquesCorrespondentes.map((e) => e.item) };
  }

  const itens = await ItemModel.find(filtros)
    .populate('categoria', 'nome')
    .limit(Math.min(Number(limite), 50))
    .sort({ nome: 1 })
    .lean();

  return itens.map((item) => {
    const itemObj = item as Record<string, unknown>;
    const categoria = itemObj['categoria'] as Record<string, unknown> | null;
    return {
      id: item._id,
      nome: item.nome,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      quantidade_disponivel: item.quantidade_disponivel,
      estoque_minimo: item.estoque_minimo,
      status: item.status,
      categoria: categoria?.['nome'] ?? null,
    };
  });
}
