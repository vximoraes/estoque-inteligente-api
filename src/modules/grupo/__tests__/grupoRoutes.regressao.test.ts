import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

async function criarGrupo(token, override = {}) {
  const res = await req(token)
    .post('/grupos')
    .send({
      nome: sufixoUnico('zz-grupo'),
      descricao: 'Grupo de teste',
      ...override,
    });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

describe('Rotas de Grupo', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('PATCH /grupos/:id', () => {
    it('PUT também atualiza', async () => {
      const registro = await criarGrupo(token);
      const novoValor = sufixoUnico('zz-grupo-put');
      const res = await req(token)
        .put(`/grupos/${registro._id}`)
        .send({ nome: novoValor });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoValor);
    });
  });
});
