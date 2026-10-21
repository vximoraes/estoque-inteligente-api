import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';
import PatrimonioEventoModel from '../../../modules/patrimonio/PatrimonioEventoModel.js';
import { CustomError, messages } from '../../../utils/helpers/index.js';
import { resultadoLimitado } from '../resultadoLimitado.js';
import UsuarioModel from '../../../modules/usuario/UsuarioModel.js';
import { escapeRegex } from '../../../utils/helpers/escapeRegex.js';

export async function historicoPatrimonio(
  {
    numeroPatrimonio,
    limite = 20,
  }: { numeroPatrimonio: string; limite?: number },
  _usuarioId: string,
) {
  const patrimonio = await PatrimonioModel.findOne({
    numero_patrimonio: {
      $regex: `^${escapeRegex(numeroPatrimonio)}$`,
      $options: 'i',
    },
  }).lean();

  if (!patrimonio) {
    throw new CustomError({
      statusCode: 404,
      errorType: 'resourceNotFound',
      field: 'Patrimonio',
      details: [],
      customMessage: messages.error.resourceNotFound('Patrimônio'),
    });
  }

  const filtros = { patrimonio: patrimonio._id };
  const [eventos, total] = await Promise.all([
    PatrimonioEventoModel.find(filtros)
      .populate('localizacao_anterior', 'nome')
      .populate('localizacao_nova', 'nome')
      .populate({ path: 'usuario', select: 'nome', model: UsuarioModel })
      .sort({ data_hora: -1 })
      .limit(Math.min(Number(limite), 50))
      .lean(),
    PatrimonioEventoModel.countDocuments(filtros),
  ]);

  const registrosFormatados = eventos.map((e) => {
    const eObj = e as Record<string, unknown>;
    const localizacaoAnterior = eObj['localizacao_anterior'] as Record<
      string,
      unknown
    > | null;
    const localizacaoNova = eObj['localizacao_nova'] as Record<
      string,
      unknown
    > | null;
    const usuario = eObj['usuario'] as Record<string, unknown> | null;
    return {
      tipo: eObj['tipo'],
      status_anterior: eObj['status_anterior'] ?? null,
      status_novo: eObj['status_novo'],
      localizacao_anterior: localizacaoAnterior?.['nome'] ?? null,
      localizacao_nova: localizacaoNova?.['nome'] ?? null,
      observacoes: eObj['observacoes'] ?? null,
      data_hora: eObj['data_hora'],
      registrado_por: usuario?.['nome'] ?? null,
    };
  });

  return resultadoLimitado(registrosFormatados, total);
}
