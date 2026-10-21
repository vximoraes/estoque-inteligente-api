import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';
import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';
import CategoriaModel from '../../../modules/categoria/CategoriaModel.js';
import { resultadoLimitado } from '../resultadoLimitado.js';
import UsuarioModel from '../../../modules/usuario/UsuarioModel.js';
import { escapeRegex } from '../../../utils/helpers/escapeRegex.js';

const ORDENACAO = {
  numero_patrimonio: { numero_patrimonio: 1 },
  mais_recentes: { createdAt: -1 },
  mais_antigos: { createdAt: 1 },
} as const;

export async function buscarPatrimonios(
  {
    numeroPatrimonio,
    modelo,
    status,
    localizacao,
    categoria,
    ordenar = 'numero_patrimonio',
    apenasMeus = false,
    limite = 20,
  }: {
    numeroPatrimonio?: string;
    modelo?: string;
    status?: string;
    localizacao?: string;
    categoria?: string;
    ordenar?: 'numero_patrimonio' | 'mais_recentes' | 'mais_antigos';
    apenasMeus?: boolean;
    limite?: number;
  },
  usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };
  if (apenasMeus) filtros['usuario'] = usuarioId;

  if (numeroPatrimonio) {
    filtros['numero_patrimonio'] = {
      $regex: escapeRegex(numeroPatrimonio),
      $options: 'i',
    };
  }
  if (status) filtros['status'] = status;
  if (modelo) {
    filtros['modelo'] = { $regex: escapeRegex(modelo), $options: 'i' };
  }

  if (categoria) {
    const categoriasCorrespondentes = await CategoriaModel.find({
      nome: { $regex: escapeRegex(categoria), $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['categoria'] = {
      $in: categoriasCorrespondentes.map((c) => c._id),
    };
  }

  if (localizacao) {
    const localizacoesCorrespondentes = await LocalizacaoModel.find({
      nome: { $regex: escapeRegex(localizacao), $options: 'i' },
    })
      .select('_id')
      .lean();
    filtros['localizacao'] = {
      $in: localizacoesCorrespondentes.map((l) => l._id),
    };
  }

  const [patrimonios, total] = await Promise.all([
    PatrimonioModel.find(filtros)
      .populate('categoria', 'nome')
      .populate('localizacao', 'nome')
      .populate({ path: 'usuario', select: 'nome', model: UsuarioModel })
      .sort(ORDENACAO[ordenar])
      .limit(Math.min(Number(limite), 50))
      .lean(),
    PatrimonioModel.countDocuments(filtros),
  ]);

  const registrosFormatados = patrimonios.map((p) => {
    const pObj = p as Record<string, unknown>;
    const categoriaPopulada = pObj['categoria'] as Record<
      string,
      unknown
    > | null;
    const localizacaoPopulada = pObj['localizacao'] as Record<
      string,
      unknown
    > | null;
    const usuario = pObj['usuario'] as Record<string, unknown> | null;
    return {
      numero_patrimonio: pObj['numero_patrimonio'],
      modelo: pObj['modelo'] ?? null,
      fabricante: pObj['fabricante'] ?? null,
      categoria: categoriaPopulada?.['nome'] ?? null,
      status: pObj['status'],
      localizacao: localizacaoPopulada?.['nome'] ?? null,
      data_aquisicao: pObj['data_aquisicao'] ?? null,
      observacoes: pObj['observacoes'] ?? null,
      campos_personalizados: pObj['campos_personalizados'] ?? [],
      possui_imagem: Boolean(pObj['imagem']),
      cadastrado_por: usuario?.['nome'] ?? null,
      cadastrado_em: pObj['createdAt'] ?? null,
      atualizado_em: pObj['updatedAt'] ?? null,
    };
  });

  return resultadoLimitado(registrosFormatados, total);
}
