import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

async function criarNotificacao(token, override = {}) {
  const res = await req(token)
    .post('/notificacoes')
    .send({ mensagem: 'Mensagem de teste', ...override });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

describe('Rotas de Notificação', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /notificacoes', () => {
    it('deve cadastrar notificação válida, sempre para o autor', async () => {
      const notificacao = await criarNotificacao(token);
      expect(notificacao).toHaveProperty('_id');
      expect(notificacao.visualizada).toBe(false);
    });

    it('deve ignorar o campo usuario do payload e usar o autor autenticado', async () => {
      const notificacao = await criarNotificacao(tokenUsuarioPadrao, {
        usuario: ID_INEXISTENTE,
      });
      expect(notificacao).toHaveProperty('_id');
    });

    it('deve falhar ao cadastrar sem mensagem', async () => {
      const res = await req(token).post('/notificacoes').send({});
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao cadastrar com mensagem de tipo errado', async () => {
      const res = await req(token)
        .post('/notificacoes')
        .send({ mensagem: 12345 });
      esperarEnvelopeErro(res, 400);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/notificacoes').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('GET /notificacoes', () => {
    it('deve listar apenas notificações do autor autenticado, paginadas', async () => {
      await criarNotificacao(tokenUsuarioPadrao);
      const res = await req(tokenUsuarioPadrao).get('/notificacoes');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve filtrar por visualizada=false', async () => {
      await criarNotificacao(tokenUsuarioPadrao);
      const res = await req(tokenUsuarioPadrao).get(
        '/notificacoes?visualizada=false',
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.docs.every((n) => n.visualizada === false)).toBe(
        true,
      );
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/notificacoes');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /notificacoes/:id', () => {
    it('deve retornar notificação por id', async () => {
      const notificacao = await criarNotificacao(token);
      const res = await req(token).get(`/notificacoes/${notificacao._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', notificacao._id);
    });

    it('deve retornar 404 para notificação inexistente', async () => {
      const res = await req(token).get(`/notificacoes/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });

    it('deve retornar 404 para notificação de outro usuário', async () => {
      const notificacao = await criarNotificacao(tokenUsuarioPadrao);
      const res = await req(token).get(`/notificacoes/${notificacao._id}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /notificacoes/:id/visualizar', () => {
    it('deve marcar notificação como visualizada', async () => {
      const notificacao = await criarNotificacao(token);
      const res = await req(token).patch(
        `/notificacoes/${notificacao._id}/visualizar`,
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.visualizada).toBe(true);
    });

    it('deve retornar 404 ao marcar inexistente', async () => {
      const res = await req(token).patch(
        `/notificacoes/${ID_INEXISTENTE}/visualizar`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /notificacoes/:id/visualizar', () => {
    it('deve marcar notificação como visualizada (PUT)', async () => {
      const notificacao = await criarNotificacao(token);
      const res = await req(token).put(
        `/notificacoes/${notificacao._id}/visualizar`,
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.visualizada).toBe(true);
    });

    it('deve retornar 404 ao marcar inexistente (PUT)', async () => {
      const res = await req(token).put(
        `/notificacoes/${ID_INEXISTENTE}/visualizar`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /notificacoes/visualizar-todas', () => {
    it('deve marcar todas as notificações do autor como visualizadas', async () => {
      await criarNotificacao(tokenUsuarioPadrao);
      await criarNotificacao(tokenUsuarioPadrao);
      const res = await req(tokenUsuarioPadrao).patch(
        '/notificacoes/visualizar-todas',
      );
      esperarEnvelopeSucesso(res, 200);

      const listagem = await req(tokenUsuarioPadrao).get(
        '/notificacoes?visualizada=false',
      );
      expect(listagem.body.data.docs).toHaveLength(0);
    });
  });

  describe('PATCH /notificacoes/:id/inativar', () => {
    it('deve inativar notificação existente', async () => {
      const notificacao = await criarNotificacao(token);
      const res = await req(token).patch(
        `/notificacoes/${notificacao._id}/inativar`,
      );
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 ao inativar inexistente', async () => {
      const res = await req(token).patch(
        `/notificacoes/${ID_INEXISTENTE}/inativar`,
      );
      expect(res.status).toBe(404);
    });
  });
});
