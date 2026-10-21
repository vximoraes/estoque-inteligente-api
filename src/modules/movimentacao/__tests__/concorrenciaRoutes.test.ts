import {
  req,
  logarAdmin,
  criarItem,
  criarLocalizacao,
  criarMovimentacao,
} from '../../../../test/helpers/rotasTestHelper.js';

async function prepararEstoque(token, quantidade) {
  const item = await criarItem(token);
  const localizacao = await criarLocalizacao(token);
  await criarMovimentacao(token, {
    item: item._id,
    localizacao: localizacao._id,
    quantidade: String(quantidade),
  });
  return { item: item._id, localizacao: localizacao._id };
}

async function saldoDoItem(token, item) {
  const res = await req(token).get(`/itens/${item}`);
  return res.body.data.quantidade;
}

async function movimentacoesDoItem(token, item) {
  const res = await req(token).get(`/movimentacoes?item=${item}&limite=100`);
  return res.body.data.docs;
}

function contarStatus(respostas) {
  return respostas.reduce((contagem, res) => {
    contagem[res.status] = (contagem[res.status] ?? 0) + 1;
    return contagem;
  }, {});
}

describe('Concorrência no saldo de estoque', () => {
  let token;

  beforeAll(async () => {
    token = await logarAdmin();
  });

  it('10 saídas simultâneas de 1 unidade com estoque 5: aceita exatamente 5', async () => {
    const { item, localizacao } = await prepararEstoque(token, 5);

    const respostas = await Promise.all(
      Array.from({ length: 10 }, () =>
        req(token)
          .post('/movimentacoes')
          .send({ tipo: 'saida', quantidade: '1', item, localizacao }),
      ),
    );

    expect(contarStatus(respostas)).toEqual({ 201: 5, 400: 5 });
    expect(await saldoDoItem(token, item)).toBe(0);
    const saidas = (await movimentacoesDoItem(token, item)).filter(
      (mov) => mov.tipo === 'saida',
    );
    expect(saidas).toHaveLength(5);
  });

  it('10 empréstimos simultâneos de 1 unidade com estoque 3: aceita exatamente 3', async () => {
    const { item, localizacao } = await prepararEstoque(token, 3);

    const respostas = await Promise.all(
      Array.from({ length: 10 }, () =>
        req(token).post('/emprestimos').send({
          item,
          localizacao,
          quantidade_emprestada: 1,
          solicitante_nome: 'Fulano Externo',
        }),
      ),
    );

    expect(contarStatus(respostas)).toEqual({ 201: 3, 400: 7 });
    expect(await saldoDoItem(token, item)).toBe(0);
  });

  it('6 devoluções simultâneas do mesmo empréstimo com 1 em aberto: registra só 1 entrada', async () => {
    const { item, localizacao } = await prepararEstoque(token, 5);
    const emprestimo = await req(token).post('/emprestimos').send({
      item,
      localizacao,
      quantidade_emprestada: 1,
      solicitante_nome: 'Fulano Externo',
    });
    const id = emprestimo.body.data._id;

    const respostas = await Promise.all(
      Array.from({ length: 6 }, () =>
        req(token)
          .patch(`/emprestimos/${id}/devolver`)
          .send({ quantidade_devolvida: 1 }),
      ),
    );

    const contagem = contarStatus(respostas);
    expect(contagem[200]).toBe(1);
    expect((contagem[400] ?? 0) + (contagem[409] ?? 0)).toBe(5);
    expect(await saldoDoItem(token, item)).toBe(5);
    const entradas = (await movimentacoesDoItem(token, item)).filter(
      (mov) => mov.tipo === 'entrada',
    );
    expect(entradas).toHaveLength(2);

    const final = await req(token).get(`/emprestimos/${id}`);
    expect(final.body.data.quantidade_devolvida).toBe(1);
    expect(final.body.data.quantidade_aberta).toBe(0);
  });

  it('o saldo sempre bate com a soma das movimentações depois de operações simultâneas', async () => {
    const { item, localizacao } = await prepararEstoque(token, 10);

    await Promise.all([
      ...Array.from({ length: 8 }, () =>
        req(token)
          .post('/movimentacoes')
          .send({ tipo: 'saida', quantidade: '2', item, localizacao }),
      ),
      ...Array.from({ length: 4 }, () =>
        req(token)
          .post('/movimentacoes')
          .send({ tipo: 'entrada', quantidade: '1', item, localizacao }),
      ),
    ]);

    const soma = (await movimentacoesDoItem(token, item)).reduce(
      (total, mov) =>
        total + (mov.tipo === 'entrada' ? mov.quantidade : -mov.quantidade),
      0,
    );
    expect(soma).toBeGreaterThanOrEqual(0);
    expect(await saldoDoItem(token, item)).toBe(soma);
  });
});
