import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';
import ItemModel from '../../../modules/item/ItemModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';

export async function buscarPatrimonios(
  {
    numeroPatrimonio,
    item,
    status,
    localizacao,
    limite = 20,
  }: {
    numeroPatrimonio?: string;
    item?: string;
    status?: string;
    localizacao?: string;
    limite?: number;
  },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };

  if (numeroPatrimonio) {
    filtros['numero_patrimonio'] = { $regex: numeroPatrimonio, $options: 'i' };
  }
  if (status) filtros['status'] = status;

  if (item) {
    const itensCorrespondentes = await ItemModel.find({
      nome: { $regex: item, $options: 'i' },
      tipo: 'permanente',
    })
      .select('_id')
      .lean();
    filtros['item'] = { $in: itensCorrespondentes.map((i) => i._id) };
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

  const patrimonios = await PatrimonioModel.find(filtros)
    .populate('item', 'nome')
    .populate('localizacao', 'nome')
    .sort({ numero_patrimonio: 1 })
    .limit(Math.min(Number(limite), 50))
    .lean();

  return patrimonios.map((p) => {
    const pObj = p as Record<string, unknown>;
    const itemPopulado = pObj['item'] as Record<string, unknown> | null;
    const localizacaoPopulada = pObj['localizacao'] as Record<
      string,
      unknown
    > | null;
    return {
      numero_patrimonio: pObj['numero_patrimonio'],
      item: itemPopulado?.['nome'] ?? null,
      status: pObj['status'],
      localizacao: localizacaoPopulada?.['nome'] ?? null,
      data_aquisicao: pObj['data_aquisicao'] ?? null,
      observacoes: pObj['observacoes'] ?? null,
    };
  });
}
