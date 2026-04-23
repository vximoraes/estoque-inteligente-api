import LocalizacaoModel from '../../models/Localizacao.js';

export async function buscarLocalizacoes(_args, _usuarioId) {
  const localizacoes = await LocalizacaoModel.find({ ativo: true }).sort({ nome: 1 }).lean();

  return localizacoes.map((l) => ({
    id: l._id,
    nome: l.nome,
    descricao: l.descricao ?? null,
  }));
}
