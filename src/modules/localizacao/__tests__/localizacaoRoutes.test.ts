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

  describe('POST /localizacoes', () => {
    it('deve cadastrar localização válida', async () => {
      const res = await req(token)
        .post('/localizacoes')
        .send({ nome: sufixoUnico('zz-localizacao') });
      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).toHaveProperty('_id');
    });

    it('deve falhar ao cadastrar sem nome', async () => {
      const res = await req(token).post('/localizacoes').send({});
      esperarEnvelopeErro(res, 400);
      esperarErroDeCampo(res, 'nome');
    });

    it('deve falhar ao cadastrar com nome já existente', async () => {
      const localizacao = await criarLocalizacao(token);
      const res = await req(token)
        .post('/localizacoes')
        .send({ nome: localizacao.nome });
      esperarEnvelopeErro(res, 400);
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao)
        .post('/localizacoes')
        .send({ nome: sufixoUnico('zz-localizacao') });
      esperarEnvelopeSucesso(res, 201);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('')
        .post('/localizacoes')
        .send({ nome: sufixoUnico('zz-localizacao') });
      expect(res.status).toBe(498);
    });

    it('deve rejeitar com token inválido', async () => {
      const res = await req('token-invalido')
        .post('/localizacoes')
        .send({ nome: sufixoUnico('zz-localizacao') });
      expect(res.status).toBe(498);
    });
  });

  describe('GET /localizacoes', () => {
    it('deve listar localizações paginadas', async () => {
      const res = await req(token).get('/localizacoes');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/localizacoes');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /localizacoes/:id', () => {
    it('deve retornar localização por id', async () => {
      const localizacao = await criarLocalizacao(token);
      const res = await req(token).get(`/localizacoes/${localizacao._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', localizacao._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/localizacoes/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para localização inexistente', async () => {
      const res = await req(token).get(`/localizacoes/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /localizacoes/:id', () => {
    it('deve atualizar nome da localização', async () => {
      const localizacao = await criarLocalizacao(token);
      const novoNome = sufixoUnico('zz-localizacao-atualizada');
      const res = await req(token)
        .patch(`/localizacoes/${localizacao._id}`)
        .send({ nome: novoNome });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoNome);
    });

    it('deve falhar ao atualizar para nome já existente', async () => {
      const localizacao1 = await criarLocalizacao(token);
      const localizacao2 = await criarLocalizacao(token);
      const res = await req(token)
        .patch(`/localizacoes/${localizacao2._id}`)
        .send({ nome: localizacao1.nome });
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 ao atualizar localização inexistente', async () => {
      const res = await req(token)
        .patch(`/localizacoes/${ID_INEXISTENTE}`)
        .send({ nome: sufixoUnico('zz-localizacao') });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /localizacoes/:id/inativar', () => {
    it('deve inativar localização existente', async () => {
      const localizacao = await criarLocalizacao(token);
      const res = await req(token).patch(
        `/localizacoes/${localizacao._id}/inativar`,
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.ativo).toBe(false);
    });

    it('deve retornar 404 ao inativar localização inexistente', async () => {
      const res = await req(token).patch(
        `/localizacoes/${ID_INEXISTENTE}/inativar`,
      );
      expect(res.status).toBe(404);
    });
  });
});
