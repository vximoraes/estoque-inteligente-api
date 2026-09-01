import { fakeMappings } from './globalFakeMapping.js';
import Emprestimo from '../modules/emprestimo/EmprestimoModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';
import Usuario from '../modules/usuario/UsuarioModel.js';
import Patrimonio from '../modules/patrimonio/PatrimonioModel.js';
import PatrimonioEvento from '../modules/patrimonio/PatrimonioEventoModel.js';

// Status é sempre calculado (`EmprestimoRepository.calcularStatus`), nunca
// gravado — reproduzimos aqui as mesmas três combinações de
// quantidade_aberta/data_prevista_devolucao que levam a cada um.
const STATUS_POOL: Array<'Ativo' | 'Atrasado' | 'Devolvido'> = [
  'Ativo',
  'Ativo',
  'Ativo',
  'Atrasado',
  'Atrasado',
  'Devolvido',
  'Devolvido',
  'Devolvido',
];

function diasAtras(dias: number) {
  return new Date(Date.now() - dias * 86400000);
}

function diasNoFuturo(dias: number) {
  return new Date(Date.now() + dias * 86400000);
}

export default async function emprestimoSeed(adminId: string) {
  // Unidade patrimonial empresta por unidade, não por quantidade — ver
  // bloco abaixo que gera esses empréstimos a partir das unidades já
  // marcadas como 'Emprestado' em `patrimonioSeed`.
  const itemList = await Item.find({ tipo: 'consumo' });
  const localizacaoList = await Localizacao.find({});
  const usuarioList = await Usuario.find({});

  await Emprestimo.deleteMany({});

  for (let i = 0; i < (itemList.length === 0 ? 0 : 12); i++) {
    const itemRandom = itemList[Math.floor(Math.random() * itemList.length)]!;
    const localizacaoRandom =
      localizacaoList[Math.floor(Math.random() * localizacaoList.length)]!;
    const usuarioRandom =
      usuarioList[Math.floor(Math.random() * usuarioList.length)]!;

    const status = STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)]!;
    const quantidade_emprestada =
      fakeMappings.Emprestimo.quantidade_emprestada();
    const data_saida = diasAtras(Math.floor(Math.random() * 20) + 3);

    let quantidade_devolvida = 0;
    let data_prevista_devolucao: Date;
    let data_devolucao_total: Date | null = null;

    if (status === 'Devolvido') {
      quantidade_devolvida = quantidade_emprestada;
      data_prevista_devolucao = new Date(
        data_saida.getTime() + (Math.floor(Math.random() * 10) + 3) * 86400000,
      );
      data_devolucao_total = new Date(
        data_saida.getTime() + (Math.floor(Math.random() * 12) + 1) * 86400000,
      );
    } else if (status === 'Atrasado') {
      quantidade_devolvida = Math.floor(Math.random() * quantidade_emprestada);
      data_prevista_devolucao = diasAtras(Math.floor(Math.random() * 10) + 1);
    } else {
      quantidade_devolvida = Math.floor(Math.random() * quantidade_emprestada);
      data_prevista_devolucao = diasNoFuturo(
        Math.floor(Math.random() * 15) + 1,
      );
    }

    const quantidade_aberta = quantidade_emprestada - quantidade_devolvida;

    const emprestimo = {
      item: itemRandom._id,
      localizacao: localizacaoRandom._id,
      quantidade_emprestada,
      quantidade_devolvida,
      quantidade_aberta,
      solicitante_nome: fakeMappings.Emprestimo.solicitante_nome(),
      solicitante_email: fakeMappings.Emprestimo.solicitante_email(),
      data_saida,
      data_prevista_devolucao,
      data_devolucao_total,
      observacoes_emprestimo: fakeMappings.Emprestimo.observacoes_emprestimo(),
      observacoes_devolucao:
        quantidade_devolvida > 0
          ? fakeMappings.Emprestimo.observacoes_devolucao()
          : '',
      usuario_responsavel: String(usuarioRandom._id),
      ativo: true,
    };

    await Emprestimo.create(emprestimo);
  }

  // Um empréstimo em aberto (Ativo ou Atrasado, nunca Devolvido) para cada
  // unidade patrimonial que `patrimonioSeed` já deixou com status
  // 'Emprestado' — sem isso a unidade aparece emprestada no drawer mas sem
  // nenhum registro em `emprestimos`.
  const unidadesEmprestadas = await Patrimonio.find({
    status: 'Emprestado',
  });

  for (const unidade of unidadesEmprestadas) {
    const usuarioRandom =
      usuarioList[Math.floor(Math.random() * usuarioList.length)]!;
    const atrasado = Math.random() < 0.4;

    const data_saida = diasAtras(Math.floor(Math.random() * 15) + 2);

    await Emprestimo.create({
      patrimonio: unidade._id,
      tipo_controle: 'unidade',
      localizacao: unidade.localizacao,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      solicitante_nome: fakeMappings.Emprestimo.solicitante_nome(),
      solicitante_email: fakeMappings.Emprestimo.solicitante_email(),
      data_saida,
      data_prevista_devolucao: atrasado
        ? diasAtras(Math.floor(Math.random() * 8) + 1)
        : diasNoFuturo(Math.floor(Math.random() * 10) + 1),
      data_devolucao_total: null,
      observacoes_emprestimo: fakeMappings.Emprestimo.observacoes_emprestimo(),
      usuario_responsavel: String(usuarioRandom._id),
      ativo: true,
    });

    await PatrimonioEvento.create({
      patrimonio: unidade._id,
      tipo: 'emprestimo',
      status_anterior: 'Disponível',
      status_novo: 'Emprestado',
      data_hora: data_saida,
      usuario: adminId,
    });
  }

  // Histórico de empréstimos já devolvidos para unidades que hoje estão
  // 'Disponível' — sem isso, um item disponível nunca teria empréstimo
  // nenhum no histórico, mesmo sendo o caso mais comum na prática.
  const unidadesDisponiveis = await Patrimonio.find({ status: 'Disponível' });
  const amostraHistorico = [...unidadesDisponiveis]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(5, unidadesDisponiveis.length));

  for (const unidade of amostraHistorico) {
    const usuarioRandom =
      usuarioList[Math.floor(Math.random() * usuarioList.length)]!;
    const data_saida = diasAtras(Math.floor(Math.random() * 40) + 15);
    const data_prevista_devolucao = new Date(
      data_saida.getTime() + (Math.floor(Math.random() * 10) + 3) * 86400000,
    );
    const data_devolucao_total = new Date(
      data_saida.getTime() + (Math.floor(Math.random() * 12) + 1) * 86400000,
    );

    await Emprestimo.create({
      patrimonio: unidade._id,
      tipo_controle: 'unidade',
      localizacao: unidade.localizacao,
      quantidade_emprestada: 1,
      quantidade_devolvida: 1,
      quantidade_aberta: 0,
      solicitante_nome: fakeMappings.Emprestimo.solicitante_nome(),
      solicitante_email: fakeMappings.Emprestimo.solicitante_email(),
      data_saida,
      data_prevista_devolucao,
      data_devolucao_total,
      observacoes_emprestimo: fakeMappings.Emprestimo.observacoes_emprestimo(),
      observacoes_devolucao: fakeMappings.Emprestimo.observacoes_devolucao(),
      usuario_responsavel: String(usuarioRandom._id),
      ativo: true,
    });

    await PatrimonioEvento.create({
      patrimonio: unidade._id,
      tipo: 'emprestimo',
      status_anterior: 'Disponível',
      status_novo: 'Emprestado',
      data_hora: data_saida,
      usuario: adminId,
    });

    await PatrimonioEvento.create({
      patrimonio: unidade._id,
      tipo: 'devolucao',
      status_anterior: 'Emprestado',
      status_novo: 'Disponível',
      localizacao_anterior: unidade.localizacao,
      localizacao_nova: unidade.localizacao,
      data_hora: data_devolucao_total,
      usuario: adminId,
    });
  }
}
