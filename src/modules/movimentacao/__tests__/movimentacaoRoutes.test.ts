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

describe('Rotas de Movimentação', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /movimentacoes', () => {
    it('deve cadastrar movimentação de entrada válida', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      const res = await req(token).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '10',
        item: item._id,
        localizacao: localizacao._id,
      });
      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).toHaveProperty('_id');
    });

    it('deve falhar ao cadastrar sem campos obrigatórios', async () => {
      const res = await req(token).post('/movimentacoes').send({});
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao cadastrar com item inexistente', async () => {
      const localizacao = await criarLocalizacao(token);
      const res = await req(token).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '10',
        item: ID_INEXISTENTE,
        localizacao: localizacao._id,
      });
      expect(res.status).toBe(404);
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const item = await criarItem(tokenUsuarioPadrao);
      const localizacao = await criarLocalizacao(tokenUsuarioPadrao);
      const res = await req(tokenUsuarioPadrao).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '10',
        item: item._id,
        localizacao: localizacao._id,
      });
      esperarEnvelopeSucesso(res, 201);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/movimentacoes').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('GET /movimentacoes', () => {
    it('deve listar movimentações paginadas', async () => {
      await criarMovimentacao(token);
      const res = await req(token).get('/movimentacoes');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/movimentacoes');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /movimentacoes/resumo', () => {
    it('deve retornar resumo de movimentações', async () => {
      const res = await req(token).get('/movimentacoes/resumo');
      esperarEnvelopeSucesso(res, 200);
    });
  });

  describe('GET /movimentacoes/tendencia', () => {
    it('deve retornar tendência de movimentações', async () => {
      const res = await req(token).get('/movimentacoes/tendencia');
      esperarEnvelopeSucesso(res, 200);
    });
  });

  describe('GET /movimentacoes/:id', () => {
    it('deve retornar movimentação por id', async () => {
      const movimentacao = await criarMovimentacao(token);
      const res = await req(token).get(`/movimentacoes/${movimentacao._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', movimentacao._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/movimentacoes/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para movimentação inexistente', async () => {
      const res = await req(token).get(`/movimentacoes/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });
});
