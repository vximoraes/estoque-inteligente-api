import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarLocalizacao,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarErroDeCampo,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Localização', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('GET /localizacoes', () => {
    it('trata caracteres de regex no nome como texto', async () => {
      const parentese = await req(token).get('/localizacoes?nome=(');
      esperarEnvelopeSucesso(parentese, 200);
      expect(parentese.body.data.docs).toEqual([]);

      const curinga = await req(token).get('/localizacoes?nome=.*');
      esperarEnvelopeSucesso(curinga, 200);
      expect(curinga.body.data.docs).toEqual([]);
    });
  });

  describe('PATCH /localizacoes/:id', () => {
    it('PUT também atualiza', async () => {
      const registro = await criarLocalizacao(token);
      const novoValor = sufixoUnico('zz-localizacao-put');
      const res = await req(token)
        .put(`/localizacoes/${registro._id}`)
        .send({ nome: novoValor });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoValor);
    });
  });
});
