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
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Estoque', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('GET /estoques', () => {
    it('deve listar estoques paginados', async () => {
      await criarMovimentacao(token);
      const res = await req(token).get('/estoques');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve filtrar estoque por item', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      await criarMovimentacao(token, {
        item: item._id,
        localizacao: localizacao._id,
      });

      const res = await req(token).get(`/estoques?item=${item._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.docs.every((e) => e.item._id === item._id)).toBe(
        true,
      );
    });

    it('deve permitir acesso para usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao).get('/estoques');
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/estoques');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /estoques/item/:itemId', () => {
    it('deve listar estoques de um item', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      await criarMovimentacao(token, {
        item: item._id,
        localizacao: localizacao._id,
      });

      const res = await req(token).get(`/estoques/item/${item._id}`);
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
      expect(res.body.data.docs.length).toBeGreaterThan(0);
    });

    it('deve retornar 400 para itemId malformado', async () => {
      const res = await req(token).get(`/estoques/item/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });
  });

  describe('GET /estoques/:id', () => {
    it('deve retornar estoque por id', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      await criarMovimentacao(token, {
        item: item._id,
        localizacao: localizacao._id,
      });

      const listagem = await req(token).get(`/estoques/item/${item._id}`);
      const estoqueId = listagem.body.data.docs[0]._id;

      const res = await req(token).get(`/estoques/${estoqueId}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', estoqueId);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/estoques/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para estoque inexistente', async () => {
      const res = await req(token).get(`/estoques/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });
});
