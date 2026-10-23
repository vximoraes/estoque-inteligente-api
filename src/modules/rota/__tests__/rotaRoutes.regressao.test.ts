import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

// Regra rígida desta suíte: só cria/altera registros `Rota` com nome
// prefixado `zz-rota-teste-`, nunca mexe nos registros do seed — esta suíte
// muta a própria tabela de RBAC do servidor compartilhado, e alterar/excluir
// uma rota semeada (ex.: "itens", "categorias") derruba silenciosamente
// todas as outras suítes de rota (viram 404/403 sem relação aparente).
async function criarRota(token, override = {}) {
  const res = await req(token)
    .post('/rotas')
    .send({ rota: sufixoUnico('zz-rota-teste'), ...override });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

describe('Rotas de Rota (RBAC)', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('PATCH /rotas/:id', () => {
    it('PUT também atualiza', async () => {
      const registro = await criarRota(token);
      const novoValor = sufixoUnico('zz-rota-put');
      const res = await req(token)
        .put(`/rotas/${registro._id}`)
        .send({ rota: novoValor });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.rota).toBe(novoValor);
    });
  });

  describe('DELETE /rotas/:id', () => {
    it('tira a rota excluída das permissões dos grupos', async () => {
      const rota = await criarRota(token);
      const grupo = await req(token)
        .post('/grupos')
        .send({ nome: sufixoUnico('zz-grupo'), descricao: 'Grupo de teste' });
      esperarEnvelopeSucesso(grupo, 201);
      const idGrupo = grupo.body.data._id;
      esperarEnvelopeSucesso(
        await req(token)
          .post(`/grupos/${idGrupo}/rotas`)
          .send({ idRota: rota._id }),
        200,
      );

      esperarEnvelopeSucesso(
        await req(token).delete(`/rotas/${rota._id}`),
        200,
      );

      const depois = await req(token).get(`/grupos/${idGrupo}`);
      const rotasDoGrupo = depois.body.data.permissoes.map((p) => p.rota);
      expect(rotasDoGrupo).not.toContain(rota.rota);
    });
  });
});
