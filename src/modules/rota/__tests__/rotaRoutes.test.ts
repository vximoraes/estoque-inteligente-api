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

  describe('POST /rotas', () => {
    it('deve cadastrar rota válida', async () => {
      const rota = await criarRota(token);
      expect(rota).toHaveProperty('_id');
      expect(rota.ativo).toBe(true);
    });

    it('deve falhar ao cadastrar sem campo rota', async () => {
      const res = await req(token).post('/rotas').send({});
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao cadastrar rota já existente', async () => {
      const rota = await criarRota(token);
      const res = await req(token).post('/rotas').send({ rota: rota.rota });
      expect(res.status).toBe(409);
    });

    it('deve rejeitar cadastro de usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao)
        .post('/rotas')
        .send({ rota: sufixoUnico('zz-rota-teste') });
      expect(res.status).toBe(403);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/rotas').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('GET /rotas', () => {
    it('deve listar rotas paginadas', async () => {
      const res = await req(token).get('/rotas');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve filtrar rotas pelo nome', async () => {
      const rota = await criarRota(token);
      const res = await req(token).get(`/rotas?rota=${rota.rota}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.docs.some((r) => r.rota === rota.rota)).toBe(true);
    });

    it('deve rejeitar acesso de usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao).get('/rotas');
      expect(res.status).toBe(403);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/rotas');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /rotas/:id', () => {
    it('deve retornar rota por id', async () => {
      const rota = await criarRota(token);
      const res = await req(token).get(`/rotas/${rota._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', rota._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/rotas/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para rota inexistente', async () => {
      const res = await req(token).get(`/rotas/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /rotas/:id', () => {
    it('deve atualizar nome da rota', async () => {
      const rota = await criarRota(token);
      const novoNome = sufixoUnico('zz-rota-teste-atualizada');
      const res = await req(token)
        .patch(`/rotas/${rota._id}`)
        .send({ rota: novoNome });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.rota).toBe(novoNome);
    });

    it('deve falhar ao atualizar para nome já existente', async () => {
      const rota1 = await criarRota(token);
      const rota2 = await criarRota(token);
      const res = await req(token)
        .patch(`/rotas/${rota2._id}`)
        .send({ rota: rota1.rota });
      expect(res.status).toBe(409);
    });

    it('deve retornar 404 ao atualizar rota inexistente', async () => {
      const res = await req(token)
        .patch(`/rotas/${ID_INEXISTENTE}`)
        .send({ rota: sufixoUnico('zz-rota-teste') });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /rotas/:id', () => {
    it('deve deletar rota de teste existente', async () => {
      const rota = await criarRota(token);
      const res = await req(token).delete(`/rotas/${rota._id}`);
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 ao deletar rota inexistente', async () => {
      const res = await req(token).delete(`/rotas/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });
});
