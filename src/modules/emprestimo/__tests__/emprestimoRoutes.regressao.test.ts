import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarItem,
  criarLocalizacao,
  criarMovimentacao,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

async function criarDependenciasEmprestimo(token) {
  const item = await criarItem(token);
  const localizacao = await criarLocalizacao(token);
  await criarMovimentacao(token, {
    item: item._id,
    localizacao: localizacao._id,
    quantidade: '50',
  });
  return { item: item._id, localizacao: localizacao._id };
}

async function criarEmprestimo(token, override = {}) {
  const { item, localizacao } = await criarDependenciasEmprestimo(token);
  const res = await req(token)
    .post('/emprestimos')
    .send({
      item,
      localizacao,
      quantidade_emprestada: 5,
      solicitante_nome: 'Fulano Externo',
      data_prevista_devolucao: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ...override,
    });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

describe('Rotas de Emprestimo', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('GET /emprestimos', () => {
    it('filtra por status: ativo, devolvido e aberto', async () => {
      const solicitante = `Zz Status ${Date.now()}`;
      const emAberto = await criarEmprestimo(token, {
        solicitante_nome: solicitante,
      });
      const devolvido = await criarEmprestimo(token, {
        solicitante_nome: solicitante,
        quantidade_emprestada: 2,
      });
      esperarEnvelopeSucesso(
        await req(token)
          .patch(`/emprestimos/${devolvido._id}/devolver`)
          .send({ quantidade_devolvida: 2 }),
        200,
      );

      const ids = async (status) => {
        const res = await req(token).get(
          `/emprestimos?solicitante_nome=${encodeURIComponent(solicitante)}&status=${status}`,
        );
        esperarEnvelopeSucesso(res, 200);
        return res.body.data.docs.map((d) => d._id);
      };

      expect(await ids('ativo')).toEqual([emAberto._id]);
      expect(await ids('devolvido')).toEqual([devolvido._id]);
      expect(await ids('aberto')).toEqual([emAberto._id]);
      expect(await ids('atrasado')).toEqual([]);
    });

    it('recusa status desconhecido', async () => {
      const res = await req(token).get('/emprestimos?status=qualquer');
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /emprestimos/:id', () => {
    it('guarda quem alterou o solicitante, de que valor para qual', async () => {
      const emprestimo = await criarEmprestimo(token);
      await req(token)
        .put(`/emprestimos/${emprestimo._id}`)
        .send({ solicitante_nome: 'zz-Solicitante Corrigido' });

      const res = await req(token).get(`/emprestimos/${emprestimo._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.alteracoes).toEqual([
        expect.objectContaining({
          campo: 'solicitante_nome',
          anterior: emprestimo.solicitante_nome,
          novo: 'zz-Solicitante Corrigido',
          usuario: expect.objectContaining({ nome: expect.any(String) }),
        }),
      ]);
    });
  });
});
