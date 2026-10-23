import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarCategoria,
  criarItem,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarErroDeCampo,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Item', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('PATCH /itens/:id', () => {
    it('PUT também atualiza', async () => {
      const registro = await criarItem(token);
      const novoValor = sufixoUnico('zz-item-put');
      const res = await req(token)
        .put(`/itens/${registro._id}`)
        .send({ nome: novoValor });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoValor);
    });
  });
});
