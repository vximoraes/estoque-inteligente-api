import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';
import EstoqueModel from '../../../modules/estoque/EstoqueModel.js';
import ItemModel from '../../../modules/item/ItemModel.js';
import PatrimonioModel from '../../../modules/patrimonio/PatrimonioModel.js';
import { escapeRegex } from '../../../utils/helpers/escapeRegex.js';
import { resultadoLimitado } from '../resultadoLimitado.js';

export async function buscarLocalizacoes(
  { nome }: { nome?: string },
  _usuarioId: string,
) {
  const filtro: Record<string, unknown> = { ativo: true };
  if (nome) filtro['nome'] = { $regex: escapeRegex(nome), $options: 'i' };

  const localizacoes = await LocalizacaoModel.find(filtro)
    .sort({ nome: 1 })
    .lean();
  const ids = localizacoes.map((l) => l._id);

  const [consumo, patrimonio] = await Promise.all([
    EstoqueModel.aggregate([
      { $match: { localizacao: { $in: ids }, quantidade: { $gt: 0 } } },
      {
        $lookup: {
          from: ItemModel.collection.name,
          localField: 'item',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $match: { 'item.ativo': true } },
      {
        $group: {
          _id: '$localizacao',
          itens: { $sum: 1 },
          unidades: { $sum: '$quantidade' },
        },
      },
    ]) as Promise<Array<{ _id: unknown; itens: number; unidades: number }>>,
    PatrimonioModel.aggregate([
      {
        $match: {
          localizacao: { $in: ids },
          ativo: true,
          status: { $ne: 'Baixado' },
        },
      },
      { $group: { _id: '$localizacao', total: { $sum: 1 } } },
    ]) as Promise<Array<{ _id: unknown; total: number }>>,
  ]);

  const consumoPorLocal = new Map(consumo.map((c) => [String(c._id), c]));
  const patrimonioPorLocal = new Map(
    patrimonio.map((p) => [String(p._id), p.total]),
  );

  const registros = localizacoes.map((l) => {
    const noConsumo = consumoPorLocal.get(String(l._id));
    return {
      id: l._id,
      nome: l.nome,
      descricao: l.descricao ?? null,
      itens_consumo_com_saldo: noConsumo?.itens ?? 0,
      unidades_consumo: noConsumo?.unidades ?? 0,
      unidades_patrimonio: patrimonioPorLocal.get(String(l._id)) ?? 0,
    };
  });

  return resultadoLimitado(registros, registros.length);
}
