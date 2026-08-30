import { fakeMappings } from './globalFakeMapping.js';
import Emprestimo from '../modules/emprestimo/EmprestimoModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';
import Usuario from '../modules/usuario/UsuarioModel.js';
import Patrimonio from '../modules/patrimonio/PatrimonioModel.js';

export default async function emprestimoSeed(adminId: string) {
  // Unidade patrimonial empresta por unidade, não por quantidade — ver
  // bloco abaixo que gera esses empréstimos a partir das unidades já
  // marcadas como 'Emprestado' em `patrimonioSeed`.
  const itemList = await Item.find({ tipo: 'consumo' });
  const localizacaoList = await Localizacao.find({});
  const usuarioList = await Usuario.find({});

  await Emprestimo.deleteMany({});

  for (let i = 0; i < (itemList.length === 0 ? 0 : 10); i++) {
    const itemRandom = itemList[Math.floor(Math.random() * itemList.length)]!;
    const localizacaoRandom =
      localizacaoList[Math.floor(Math.random() * localizacaoList.length)]!;
    const usuarioRandom =
      usuarioList[Math.floor(Math.random() * usuarioList.length)]!;

    const quantidade_emprestada =
      fakeMappings.Emprestimo.quantidade_emprestada();
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
      data_prevista_devolucao:
        fakeMappings.Emprestimo.data_prevista_devolucao(),
      data_devolucao_total:
        quantidade_aberta === 0 ? new Date().toISOString() : null,
      observacoes_emprestimo: fakeMappings.Emprestimo.observacoes_emprestimo(),
      observacoes_devolucao: fakeMappings.Emprestimo.observacoes_devolucao(),
      usuario_responsavel: String(usuarioRandom._id),
      ativo: true,
    };

    await Emprestimo.create(emprestimo);
  }

  // Um empréstimo real para cada unidade patrimonial que `patrimonioSeed`
  // já deixou com status 'Emprestado' — sem isso a unidade aparece
  // emprestada no drawer mas sem nenhum registro em `emprestimos`.
  const unidadesEmprestadas = await Patrimonio.find({
    status: 'Emprestado',
  });

  for (const unidade of unidadesEmprestadas) {
    const usuarioRandom =
      usuarioList[Math.floor(Math.random() * usuarioList.length)]!;

    await Emprestimo.create({
      patrimonio: unidade._id,
      tipo_controle: 'unidade',
      localizacao: unidade.localizacao,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      solicitante_nome: fakeMappings.Emprestimo.solicitante_nome(),
      solicitante_email: fakeMappings.Emprestimo.solicitante_email(),
      data_saida: fakeMappings.Emprestimo.data_saida(),
      data_prevista_devolucao:
        fakeMappings.Emprestimo.data_prevista_devolucao(),
      data_devolucao_total: null,
      observacoes_emprestimo: fakeMappings.Emprestimo.observacoes_emprestimo(),
      usuario_responsavel: String(usuarioRandom._id),
      ativo: true,
    });
  }
}
