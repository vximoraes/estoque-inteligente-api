import ItemModel from '../../../modules/item/ItemModel.js';
import CategoriaModel from '../../../modules/categoria/CategoriaModel.js';
import EstoqueModel from '../../../modules/estoque/EstoqueModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';
import { resultadoLimitado } from '../resultadoLimitado.js';
import UsuarioModel from '../../../modules/usuario/UsuarioModel.js';

const ORDENACAO = {
  nome: { nome: 1 },
  mais_recentes: { createdAt: -1 },
  mais_antigos: { createdAt: 1 },
} as const;

export async function buscarItens(
  {
    nome,
    status,
    categoria,
    localizacao,
    ordenar = 'nome',
    apenasMeus = false,
    limite = 20,
  }: {
    nome?: string;
    status?: string;
    categoria?: string;
    localizacao?: string;
    ordenar?: 'nome' | 'mais_recentes' | 'mais_antigos';
    apenasMeus?: boolean;
    limite?: number;
  },
  usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };
  if (apenasMeus) filtros['usuario'] = usuarioId;

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

  const [itens, total] = await Promise.all([
    ItemModel.find(filtros)
      .populate('categoria', 'nome')
      .populate({ path: 'usuario', select: 'nome', model: UsuarioModel })
      .limit(Math.min(Number(limite), 50))
      .sort(ORDENACAO[ordenar])
      .lean(),
    ItemModel.countDocuments(filtros),
  ]);

  const registrosFormatados = itens.map((item) => {
    const itemObj = item as Record<string, unknown>;
    const categoria = itemObj['categoria'] as Record<string, unknown> | null;
    const usuario = itemObj['usuario'] as Record<string, unknown> | null;
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
      possui_imagem: Boolean(itemObj['imagem']),
      cadastrado_por: usuario?.['nome'] ?? null,
      cadastrado_em: itemObj['createdAt'] ?? null,
      atualizado_em: itemObj['updatedAt'] ?? null,
    };
  });

  return resultadoLimitado(registrosFormatados, total);
}
