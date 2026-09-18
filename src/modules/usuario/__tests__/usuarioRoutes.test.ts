import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  convidarUsuario,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Usuário', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /usuarios/convidar', () => {
    it('deve convidar um usuário válido', async () => {
      const usuario = await convidarUsuario(token);
      expect(usuario).toHaveProperty('_id');
      // Pendente de ativação: convite não ativa a conta sozinho.
      expect(usuario.ativo).toBe(false);
      expect(usuario.convidadoEm).toBeTruthy();
      // Better Auth nunca expõe a credencial via essa collection/endpoint.
      expect(usuario).not.toHaveProperty('senha');
    });

    it('deve falhar ao convidar sem nome', async () => {
      const res = await req(token)
        .post('/usuarios/convidar')
        .send({ email: `${sufixoUnico('zz-usuario')}@teste.com` });
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao convidar sem email', async () => {
      const res = await req(token)
        .post('/usuarios/convidar')
        .send({ nome: 'Zz Teste Usuario' });
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao convidar com email duplicado', async () => {
      const usuario = await convidarUsuario(token);
      const res = await req(token)
        .post('/usuarios/convidar')
        .send({ nome: 'Zz Outro Nome', email: usuario.email });
      esperarEnvelopeErro(res, 400);
    });

    it('deve rejeitar convite de usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao)
        .post('/usuarios/convidar')
        .send({
          nome: 'Zz Teste',
          email: `${sufixoUnico('zz-usuario')}@teste.com`,
        });
      expect(res.status).toBe(403);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/usuarios/convidar').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('GET /usuarios', () => {
    it('deve listar usuários paginados', async () => {
      const res = await req(token).get('/usuarios');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve aplicar filtro de busca por nome', async () => {
      const usuario = await convidarUsuario(token, {
        nome: sufixoUnico('zz-usuario-filtro'),
      });
      const res = await req(token).get(`/usuarios?nome=${usuario.nome}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.docs.some((u) => u.nome === usuario.nome)).toBe(
        true,
      );
    });

    it('deve rejeitar de usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao).get('/usuarios');
      expect(res.status).toBe(403);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/usuarios');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /usuarios/:id', () => {
    it('deve retornar usuário por id', async () => {
      const usuario = await convidarUsuario(token);
      const res = await req(token).get(`/usuarios/${usuario._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data._id).toBe(usuario._id);
    });

    it('deve permitir usuário comum consultar o próprio registro', async () => {
      const perfil = await req(tokenUsuarioPadrao).get('/api/auth/get-session');
      const meuId = perfil.body.user.id;
      const res = await req(tokenUsuarioPadrao).get(`/usuarios/${meuId}`);
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/usuarios/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 ao buscar usuário inexistente', async () => {
      const res = await req(token).get(`/usuarios/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /usuarios/:id', () => {
    it('deve atualizar nome do usuário', async () => {
      const usuario = await convidarUsuario(token);
      const novoNome = sufixoUnico('zz-usuario-atualizado');
      const res = await req(token)
        .put(`/usuarios/${usuario._id}`)
        .send({ nome: novoNome });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoNome);
    });

    it('não deve atualizar email via update', async () => {
      const usuario = await convidarUsuario(token);
      const res = await req(token)
        .put(`/usuarios/${usuario._id}`)
        .send({ email: 'novo@email.com' });
      esperarEnvelopeSucesso(res, 200);

      const consulta = await req(token).get(`/usuarios/${usuario._id}`);
      expect(consulta.body.data.email).toBe(usuario.email);
    });

    it('deve retornar 404 ao atualizar usuário inexistente', async () => {
      const res = await req(token)
        .put(`/usuarios/${ID_INEXISTENTE}`)
        .send({ nome: 'Qualquer' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /usuarios/:id', () => {
    it('deve deletar usuário existente', async () => {
      const usuario = await convidarUsuario(token);
      const res = await req(token).delete(`/usuarios/${usuario._id}`);
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 ao deletar usuário inexistente', async () => {
      const res = await req(token).delete(`/usuarios/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });
});
