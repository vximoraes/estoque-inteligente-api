import EmprestimoModel from '../../../modules/emprestimo/EmprestimoModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';
import ItemModel from '../../../modules/item/ItemModel.js';
import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';

function resolverIdentificacao(
  tipoControle: string,
  item: Record<string, unknown> | null,
  patrimonio: Record<string, unknown> | null,
): string | null {
  if (tipoControle === 'unidade') {
    const numero = patrimonio?.['numero_patrimonio'] as string | undefined;
    if (!numero) return null;
    const modelo = patrimonio?.['modelo'] as string | undefined;
    return modelo ? `${modelo} (patrimônio ${numero})` : `patrimônio ${numero}`;
  }
  return (item?.['nome'] as string | undefined) ?? null;
}

export async function buscarEmprestimos(
  {
    status,
    solicitanteNome,
    itemNome,
    numeroPatrimonio,
    localizacao,
    limite = 20,
  }: {
    status?: string;
    solicitanteNome?: string;
    itemNome?: string;
    numeroPatrimonio?: string;
    localizacao?: string;
    limite?: number;
  },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };

  if (solicitanteNome) {
    filtros['solicitante_nome'] = { $regex: solicitanteNome, $options: 'i' };
  }

  if (itemNome) {
    const itensCorrespondentes = await ItemModel.find({
      nome: { $regex: itemNome, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['item'] = { $in: itensCorrespondentes.map((i) => i._id) };
  }

  if (numeroPatrimonio) {
    const patrimoniosCorrespondentes = await PatrimonioModel.find({
      numero_patrimonio: { $regex: numeroPatrimonio, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['patrimonio'] = {
      $in: patrimoniosCorrespondentes.map((p) => p._id),
    };
  }

  if (localizacao) {
    const localizacoesCorrespondentes = await LocalizacaoModel.find({
      nome: { $regex: localizacao, $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['localizacao'] = {
      $in: localizacoesCorrespondentes.map((l) => l._id),
    };
  }

  const hoje = new Date();
  if (status === 'Devolvido') {
    filtros['quantidade_aberta'] = { $lte: 0 };
  } else if (status === 'Atrasado') {
    filtros['quantidade_aberta'] = { $gt: 0 };
    filtros['data_prevista_devolucao'] = { $lt: hoje };
  } else if (status === 'Ativo') {
    filtros['quantidade_aberta'] = { $gt: 0 };
    filtros['$or'] = [
      { data_prevista_devolucao: null },
      { data_prevista_devolucao: { $gte: hoje } },
    ];
  }

  const emprestimos = await EmprestimoModel.find(filtros)
    .populate('item', 'nome')
    .populate('localizacao', 'nome')
    .populate('patrimonio', 'numero_patrimonio modelo fabricante status')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limite), 50))
    .lean();

  return emprestimos.map((e) => {
    const eObj = e as Record<string, unknown>;
    const item = eObj['item'] as Record<string, unknown> | null;
    const localizacaoPopulada = eObj['localizacao'] as Record<
      string,
      unknown
    > | null;
    const patrimonio = eObj['patrimonio'] as Record<string, unknown> | null;
    const tipoControle = eObj['tipo_controle'] as string;

    const quantidadeAberta = Number(eObj['quantidade_aberta'] ?? 0);
    const dataPrevista = eObj['data_prevista_devolucao'];
    let statusCalculado: string;
    if (quantidadeAberta <= 0) {
      statusCalculado = 'Devolvido';
    } else if (dataPrevista && new Date(dataPrevista as string) < hoje) {
      statusCalculado = 'Atrasado';
    } else {
      statusCalculado = 'Ativo';
    }

    return {
      item: resolverIdentificacao(tipoControle, item, patrimonio),
      tipo_controle: tipoControle,
      numero_patrimonio: patrimonio?.['numero_patrimonio'] ?? null,
      localizacao: localizacaoPopulada?.['nome'] ?? null,
      solicitante: eObj['solicitante_nome'],
      quantidade_emprestada: eObj['quantidade_emprestada'],
      quantidade_devolvida: eObj['quantidade_devolvida'],
      quantidade_aberta: eObj['quantidade_aberta'],
      data_prevista_devolucao: eObj['data_prevista_devolucao'],
      status: statusCalculado,
    };
  });
}
