import { fakeMappings } from './globalFakeMapping.js';
import Emprestimo from '../modules/emprestimo/EmprestimoModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';
import Usuario from '../modules/usuario/UsuarioModel.js';

export default async function emprestimoSeed(adminId: string) {
  const itemList = await Item.find({});
  const localizacaoList = await Localizacao.find({});
  const usuarioList = await Usuario.find({});

  await Emprestimo.deleteMany({});

  for (let i = 0; i < 10; i++) {
    const itemRandom = itemList[Math.floor(Math.random() * itemList.length)]!;
    const localizacaoRandom =
      localizacaoList[Math.floor(Math.random() * localizacaoList.length)]!;
    const usuarioRandom = usuarioList[Math.floor(Math.random() * usuarioList.length)]!;

    const quantidade_emprestada = fakeMappings.Emprestimo.quantidade_emprestada();
    const quantidade_devolvida = Math.floor(
      Math.random() * quantidade_emprestada,
    );
    const quantidade_aberta = quantidade_emprestada - quantidade_devolvida;

    const emprestimo = {
      item: itemRandom._id,
      localizacao: localizacaoRandom._id,
      quantidade_emprestada,
      quantidade_devolvida,
      quantidade_aberta,
      solicitante_nome: fakeMappings.Emprestimo.solicitante_nome(),
      solicitante_email: fakeMappings.Emprestimo.solicitante_email(),
      data_saida: fakeMappings.Emprestimo.data_saida(),
      data_prevista_devolucao: fakeMappings.Emprestimo.data_prevista_devolucao(),
      data_devolucao_total: quantidade_aberta === 0 ? new Date().toISOString() : null,
      observacoes_emprestimo: fakeMappings.Emprestimo.observacoes_emprestimo(),
      observacoes_devolucao: fakeMappings.Emprestimo.observacoes_devolucao(),
      usuario_responsavel: String(usuarioRandom._id),
      ativo: true,
    };

    await Emprestimo.create(emprestimo);
  }
}
