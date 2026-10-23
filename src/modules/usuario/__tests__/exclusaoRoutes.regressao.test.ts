import request from 'supertest';
import {
  BASE_URL,
  req,
  logarAdmin,
  logarUsuarioPadrao,
  convidarUsuario,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
} from '../../../../test/helpers/rotasTestHelper.js';

const EMAIL_PADRAO = process.env.USER_EMAIL || 'usuario@usuario.com';

// Exclui temporariamente o usuário padrão do seed para provar a exclusão
// lógica de ponta a ponta; o afterAll restaura mesmo se um caso falhar.
describe('Exclusão lógica de usuário', () => {
  let tokenAdmin;
  let idUsuarioPadrao;

  async function tentarLogin() {
    return request(BASE_URL)
      .post('/api/auth/sign-in/email')
      .send({
        email: EMAIL_PADRAO,
        password: process.env.USER_PASSWORD || 'Senha@123',
      });
  }

  async function restaurar() {
    return req(tokenAdmin)
      .post('/usuarios/convidar')
      .send({ nome: 'Usuario Padrao', email: EMAIL_PADRAO });
  }

  beforeAll(async () => {
    tokenAdmin = await logarAdmin();
    const tokenPadrao = await logarUsuarioPadrao();
    const sessao = await req(tokenPadrao).get('/api/auth/get-session');
    idUsuarioPadrao = sessao.body.user.id;
  });

  afterAll(async () => {
    await restaurar();
  });

  it('excluído perde a sessão, some da lista e não entra de novo', async () => {
    const tokenPadrao = await logarUsuarioPadrao();
    esperarEnvelopeSucesso(await req(tokenPadrao).get('/itens'), 200);

    esperarEnvelopeSucesso(
      await req(tokenAdmin).delete(`/usuarios/${idUsuarioPadrao}`),
      200,
    );

    expect((await req(tokenPadrao).get('/itens')).status).toBe(498);

    const login = await tentarLogin();
    const senhaErrada = await request(BASE_URL)
      .post('/api/auth/sign-in/email')
      .send({ email: EMAIL_PADRAO, password: 'Senha@Errada1' });
    expect(login.status).toBe(401);
    expect(login.body).toEqual(senhaErrada.body);
    expect(login.body?.token).toBeUndefined();

    expect(
      (await req(tokenAdmin).get(`/usuarios/${idUsuarioPadrao}`)).status,
    ).toBe(404);
    const lista = await req(tokenAdmin).get(
      `/usuarios?email=${encodeURIComponent(EMAIL_PADRAO)}`,
    );
    expect(lista.body.data.docs).toHaveLength(0);
  });

  it('convidar o mesmo e-mail restaura a conta com a mesma senha', async () => {
    const res = await restaurar();
    esperarEnvelopeSucesso(res, 201);
    expect(res.body.data.usuario._id).toBe(idUsuarioPadrao);

    const login = await tentarLogin();
    expect(login.status).toBe(200);
    esperarEnvelopeSucesso(await req(login.body.token).get('/itens'), 200);
  });

  it('não deixa o admin excluir a própria conta', async () => {
    const sessao = await req(tokenAdmin).get('/api/auth/get-session');
    esperarEnvelopeErro(
      await req(tokenAdmin).delete(`/usuarios/${sessao.body.user.id}`),
      400,
    );
  });

  it('usuário sem permissão de usuários não exclui ninguém', async () => {
    const tokenPadrao = await logarUsuarioPadrao();
    const outro = await convidarUsuario(tokenAdmin);
    expect(
      (await req(tokenPadrao).delete(`/usuarios/${outro._id}`)).status,
    ).toBe(403);
  });
});
