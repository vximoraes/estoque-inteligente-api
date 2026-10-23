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

  describe('GET /grupos', () => {
    it('deve listar os grupos com os campos esperados', async () => {
      const res = await req(token).get('/grupos');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
      const grupo = res.body.data.docs[0];
      expect(grupo).toHaveProperty('_id');
      expect(grupo).toHaveProperty('nome');
      expect(grupo).toHaveProperty('descricao');
      expect(grupo).toHaveProperty('ativo');
      expect(grupo).toHaveProperty('permissoes');
    });

    it('deve filtrar grupos pelo nome', async () => {
      const res = await req(token).get('/grupos').query({ nome: 'Usuario' });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].nome).toBe('Usuario');
    });

    it('deve filtrar grupos pela descrição', async () => {
      const res = await req(token)
        .get('/grupos')
        .query({ descricao: 'Grupo com acesso total a todas as rotas' });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].descricao).toBe(
        'Grupo com acesso total a todas as rotas',
      );
    });

    it('deve rejeitar usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao).get('/grupos');
      expect(res.status).toBe(403);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/grupos');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /grupos/:id', () => {
    it('deve retornar grupo por id', async () => {
      const grupo = await criarGrupo(token);
      const res = await req(token).get(`/grupos/${grupo._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data._id).toBe(grupo._id);
    });

    it('deve retornar 404 para grupo inexistente', async () => {
      const res = await req(token).get(`/grupos/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /grupos', () => {
    it('deve cadastrar grupo válido', async () => {
      const grupo = await criarGrupo(token);
      expect(grupo).toHaveProperty('_id');
      expect(grupo.ativo).toBe(true);
    });

    it('deve falhar ao cadastrar sem nome', async () => {
      const res = await req(token)
        .post('/grupos')
        .send({ descricao: 'Sem nome' });
      esperarEnvelopeErro(res, 400);
    });

    it('deve rejeitar cadastro de usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao)
        .post('/grupos')
        .send({ nome: sufixoUnico('zz-grupo'), descricao: 'Grupo de teste' });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /grupos/:id/rotas', () => {
    it('deve adicionar rota existente ao grupo', async () => {
      const grupo = await criarGrupo(token);
      const rotas = await req(token).get('/rotas');
      const idRota = rotas.body.data.docs[0]._id;

      const res = await req(token)
        .post(`/grupos/${grupo._id}/rotas`)
        .send({ idRota });
      esperarEnvelopeSucesso(res, 200);
    });
  });

  describe('PATCH /grupos/:id', () => {
    it('deve atualizar nome do grupo', async () => {
      const grupo = await criarGrupo(token);
      const novoNome = sufixoUnico('zz-grupo-atualizado');
      const res = await req(token)
        .patch(`/grupos/${grupo._id}`)
        .send({ nome: novoNome });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoNome);
    });

    it('deve retornar 404 ao atualizar grupo inexistente', async () => {
      const res = await req(token)
        .patch(`/grupos/${ID_INEXISTENTE}`)
        .send({ nome: sufixoUnico('zz-grupo') });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /grupos/:id', () => {
    it('deve deletar grupo existente', async () => {
      const grupo = await criarGrupo(token);
      const res = await req(token).delete(`/grupos/${grupo._id}`);
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 ao deletar grupo inexistente', async () => {
      const res = await req(token).delete(`/grupos/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });
});
