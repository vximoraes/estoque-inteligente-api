import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';

export async function buscarPatrimonios(
  {
    numeroPatrimonio,
    modelo,
    status,
    localizacao,
    limite = 20,
  }: {
    numeroPatrimonio?: string;
    modelo?: string;
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
  if (modelo) {
    filtros['modelo'] = { $regex: modelo, $options: 'i' };
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
    .populate('categoria', 'nome')
    .populate('localizacao', 'nome')
    .sort({ numero_patrimonio: 1 })
    .limit(Math.min(Number(limite), 50))
    .lean();

  return patrimonios.map((p) => {
    const pObj = p as Record<string, unknown>;
    const categoriaPopulada = pObj['categoria'] as Record<
      string,
      unknown
    > | null;
    const localizacaoPopulada = pObj['localizacao'] as Record<
      string,
      unknown
    > | null;
    return {
      numero_patrimonio: pObj['numero_patrimonio'],
      modelo: pObj['modelo'] ?? null,
      fabricante: pObj['fabricante'] ?? null,
      categoria: categoriaPopulada?.['nome'] ?? null,
      status: pObj['status'],
      localizacao: localizacaoPopulada?.['nome'] ?? null,
      data_aquisicao: pObj['data_aquisicao'] ?? null,
      observacoes: pObj['observacoes'] ?? null,
    };
  });
}
