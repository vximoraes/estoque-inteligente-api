import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';
import { escapeRegex } from '../../../utils/helpers/escapeRegex.js';

export async function buscarLocalizacoes(
  { nome }: { nome?: string },
  _usuarioId: string,
) {
  const filtro: Record<string, unknown> = { ativo: true };
  if (nome) filtro['nome'] = { $regex: escapeRegex(nome), $options: 'i' };

  const localizacoes = await LocalizacaoModel.find(filtro)
    .sort({ nome: 1 })
    .lean();

  return localizacoes.map((l) => ({
    id: l._id,
    nome: l.nome,
    descricao: l.descricao ?? null,
  }));
}
