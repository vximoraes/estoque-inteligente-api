import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Movimentacao from '../src/modules/movimentacao/MovimentacaoModel.js';
import Emprestimo from '../src/modules/emprestimo/EmprestimoModel.js';
import Notificacao from '../src/modules/notificacao/NotificacaoModel.js';
import Estoque from '../src/modules/estoque/EstoqueModel.js';
import Item from '../src/modules/item/ItemModel.js';

const ESCALA = Number(process.argv[2] ?? 1);
const ITENS = 2_000 * ESCALA;
const LOCAIS = 50;
const USUARIOS = 20;
const MOVIMENTACOES = 100_000 * ESCALA;
const EMPRESTIMOS = 20_000 * ESCALA;
const NOTIFICACOES = 50_000 * ESCALA;
const DIA = 24 * 60 * 60 * 1000;

const ids = (n: number) =>
  Array.from({ length: n }, () => new mongoose.Types.ObjectId());
const sortear = <T>(lista: T[]) =>
  lista[Math.floor(Math.random() * lista.length)]!;

async function inserirEmLotes(
  modelo: mongoose.Model<never>,
  total: number,
  gerar: (i: number) => Record<string, unknown>,
) {
  for (let i = 0; i < total; i += 10_000) {
    const lote = Array.from({ length: Math.min(10_000, total - i) }, (_, j) =>
      gerar(i + j),
    );
    await modelo.collection.insertMany(lote);
  }
}

async function medir(
  nome: string,
  consulta: () =>
    | mongoose.Query<unknown, unknown>
    | mongoose.Aggregate<unknown>,
) {
  const inicio = performance.now();
  await consulta();
  const ms = performance.now() - inicio;
  const plano = (await consulta().explain(
    'executionStats',
  )) as unknown as Record<string, unknown>;
  const stats = (plano['executionStats'] ??
    (plano['stages'] as Array<Record<string, Record<string, unknown>>>)?.[0]?.[
      '$cursor'
    ]?.['executionStats']) as Record<string, number> | undefined;
  const texto = JSON.stringify(plano);
  const estagio = texto.includes('COLLSCAN') ? 'COLLSCAN' : 'IXSCAN';
  console.log(
    `| ${nome} | ${ms.toFixed(1)} | ${estagio} | ${stats?.['totalDocsExamined'] ?? '?'} | ${stats?.['nReturned'] ?? '?'} |`,
  );
}

async function main() {
  const servidor = await MongoMemoryServer.create();
  await mongoose.connect(servidor.getUri());
  await Promise.all(
    [Movimentacao, Emprestimo, Notificacao, Estoque, Item].map((m) =>
      (m as unknown as mongoose.Model<unknown>).init(),
    ),
  );

  const itens = ids(ITENS);
  const locais = ids(LOCAIS);
  const usuarios = ids(USUARIOS).map(String);
  const agora = Date.now();

  await inserirEmLotes(Item as never, ITENS, (i) => ({
    _id: itens[i],
    nome: `Item ${i}`,
    categoria: new mongoose.Types.ObjectId(),
    estoque_minimo: 5,
    quantidade: 10,
    status: 'Em Estoque',
    tipo: 'consumo',
    ativo: true,
    usuario: sortear(usuarios),
  }));
  await inserirEmLotes(Movimentacao as never, MOVIMENTACOES, () => ({
    tipo: Math.random() < 0.6 ? 'entrada' : 'saida',
    quantidade: 1 + Math.floor(Math.random() * 10),
    item: sortear(itens),
    localizacao: sortear(locais),
    usuario: sortear(usuarios),
    data_hora: new Date(agora - Math.random() * 365 * DIA),
  }));
  await inserirEmLotes(Emprestimo as never, EMPRESTIMOS, () => {
    const aberto = Math.random() < 0.2;
    return {
      tipo_controle: 'quantidade',
      item: sortear(itens),
      localizacao: sortear(locais),
      quantidade_emprestada: 1,
      quantidade_devolvida: aberto ? 0 : 1,
      quantidade_aberta: aberto ? 1 : 0,
      solicitante_nome: `Pessoa ${Math.floor(Math.random() * 500)}`,
      data_saida: new Date(agora - Math.random() * 365 * DIA),
      data_prevista_devolucao: new Date(
        agora + (Math.random() - 0.5) * 60 * DIA,
      ),
      usuario_responsavel: sortear(usuarios),
      ativo: true,
    };
  });
  await inserirEmLotes(Notificacao as never, NOTIFICACOES, () => ({
    mensagem: 'Item com estoque baixo',
    data_hora: new Date(agora - Math.random() * 90 * DIA),
    visualizada: Math.random() < 0.7,
    ativo: true,
    usuario: sortear(usuarios),
  }));
  const pares = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < ITENS * 3; i++) {
    const item = sortear(itens);
    const localizacao = sortear(locais);
    pares.set(`${item}-${localizacao}`, {
      item,
      localizacao,
      quantidade: 5,
      usuario: sortear(usuarios),
    });
  }
  await Estoque.collection.insertMany([...pares.values()]);

  const item = sortear(itens);
  const usuario = sortear(usuarios);
  const trintaDias = new Date(agora - 30 * DIA);

  console.log(
    `\nBase: ${ITENS} itens, ${MOVIMENTACOES} movimentações, ${EMPRESTIMOS} empréstimos, ${NOTIFICACOES} notificações, ${pares.size} estoques\n`,
  );
  console.log('| Consulta | ms | Plano | Docs lidos | Retornados |');
  console.log('|---|---|---|---|---|');

  await medir('Movimentações de um item (tela, 20 mais recentes)', () =>
    Movimentacao.find({ item }).sort({ data_hora: -1 }).limit(20),
  );
  await medir('Movimentações dos últimos 30 dias (20 mais recentes)', () =>
    Movimentacao.find({ data_hora: { $gte: trintaDias } })
      .sort({ data_hora: -1 })
      .limit(20),
  );
  await medir('Saídas por item em 30 dias (prioridade de compra)', () =>
    Movimentacao.aggregate([
      { $match: { tipo: 'saida', data_hora: { $gte: trintaDias } } },
      { $group: { _id: '$item', total: { $sum: '$quantidade' } } },
    ]),
  );
  await medir('Empréstimos atrasados (job de 1 h)', () =>
    Emprestimo.find({
      ativo: true,
      quantidade_aberta: { $gt: 0 },
      data_prevista_devolucao: { $lt: new Date() },
    }),
  );
  await medir('Empréstimos de um item', () =>
    Emprestimo.find({ item, ativo: true }).sort({ data_saida: -1 }).limit(20),
  );
  await medir('Notificações do usuário (sino)', () =>
    Notificacao.find({ usuario, ativo: true })
      .sort({ data_hora: -1 })
      .limit(10),
  );
  await medir('Estoque do item por local (a cada movimentação)', () =>
    Estoque.aggregate([
      { $match: { item } },
      { $group: { _id: null, total: { $sum: '$quantidade' } } },
    ]),
  );
  await medir('Busca de item por parte do nome', () =>
    Item.find({ nome: { $regex: 'tem 19', $options: 'i' } }).limit(20),
  );

  await mongoose.disconnect();
  await servidor.stop();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
