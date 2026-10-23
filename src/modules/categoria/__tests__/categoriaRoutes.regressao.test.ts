import mongoose from 'mongoose';
import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarCategoria,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarErroDeCampo,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Categoria', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /categorias', () => {
    it('recusa categoria com o mesmo nome em outra capitalização', async () => {
      const existente = await criarCategoria(token);
      const res = await req(token)
        .post('/categorias')
        .send({ nome: existente.nome.toUpperCase(), tipo: existente.tipo });
      esperarEnvelopeErro(res, 400);
    });
  });

  describe('PATCH /categorias/:id', () => {
    it('PUT também atualiza', async () => {
      const registro = await criarCategoria(token);
      const novoValor = sufixoUnico('zz-categoria-put');
      const res = await req(token)
        .put(`/categorias/${registro._id}`)
        .send({ nome: novoValor });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoValor);
    });
  });
});
