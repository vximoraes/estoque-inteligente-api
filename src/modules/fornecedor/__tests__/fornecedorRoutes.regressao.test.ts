import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarFornecedor,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarErroDeCampo,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Fornecedor', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('PATCH /fornecedores/:id', () => {
    it('PUT também atualiza', async () => {
      const registro = await criarFornecedor(token);
      const novoValor = sufixoUnico('zz-fornecedor-put');
      const res = await req(token)
        .put(`/fornecedores/${registro._id}`)
        .send({ nome: novoValor });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoValor);
    });
  });
});
