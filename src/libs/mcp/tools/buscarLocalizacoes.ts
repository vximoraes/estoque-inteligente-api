import LocalizacaoModel from '../../../modules/localizacao/LocalizacaoModel.js';

export async function buscarLocalizacoes(_args: unknown, _usuarioId: string) {
  const localizacoes = await LocalizacaoModel.find({ ativo: true })
    .sort({ nome: 1 })
    .lean();

  return localizacoes.map((l) => ({
    id: l._id,
    nome: l.nome,
    descricao: (l as Record<string, unknown>)['descricao'] ?? null,
  }));
}
