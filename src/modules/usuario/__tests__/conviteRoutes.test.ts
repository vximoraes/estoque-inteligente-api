import mongoose from 'mongoose';
import request from 'supertest';
import {
  BASE_URL,
  ID_INEXISTENTE,
  req,
  logarAdmin,
  convidarUsuario,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
} from '../../../../test/helpers/rotasTestHelper.js';

const SENHA = 'Senha@Nova1';

async function tokenDoConvite(usuarioId: string): Promise<string> {
  const registro = await mongoose.connection
    .db!.collection('verification')
    .findOne(
      { value: usuarioId, identifier: /^reset-password:/ },
      { sort: { createdAt: -1 } },
    );
  return String(registro!['identifier']).replace('reset-password:', '');
}

async function logar(email: string, senha: string) {
  return request(BASE_URL)
    .post('/api/auth/sign-in/email')
    .send({ email, password: senha });
}

describe('Convite e ativação de conta', () => {
  let tokenAdmin;

  async function convidarEAtivar() {
    const usuario = await convidarUsuario(tokenAdmin);
    const token = await tokenDoConvite(usuario._id);
    esperarEnvelopeSucesso(
      await req().post('/ativar-conta').send({ token, senha: SENHA }),
      200,
    );
    return usuario;
  }

  beforeAll(async () => {
    await mongoose.connect(process.env.ROUTES_TEST_DB_URL!);
    tokenAdmin = await logarAdmin();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('POST /ativar-conta', () => {
    it('ativa a conta com o token no corpo e libera o login', async () => {
      const usuario = await convidarUsuario(tokenAdmin);
      expect(usuario.ativo).toBe(false);
      expect((await logar(usuario.email, SENHA)).status).toBe(401);

      const token = await tokenDoConvite(usuario._id);
      const res = await req()
        .post('/ativar-conta')
        .send({ token, senha: SENHA });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.usuario.email).toBe(usuario.email);

      const login = await logar(usuario.email, SENHA);
      expect(login.status).toBe(200);
      expect(login.body.token).toBeDefined();
    });

    it('ainda aceita o token na URL', async () => {
      const usuario = await convidarUsuario(tokenAdmin);
      const token = await tokenDoConvite(usuario._id);
      esperarEnvelopeSucesso(
        await req().post(`/ativar-conta?token=${token}`).send({ senha: SENHA }),
        200,
      );
    });

    it('não reaproveita o token depois da ativação', async () => {
      const usuario = await convidarUsuario(tokenAdmin);
      const token = await tokenDoConvite(usuario._id);
      await req().post('/ativar-conta').send({ token, senha: SENHA });

      const res = await req()
        .post('/ativar-conta')
        .send({ token, senha: 'Outra@Senha2' });
      expect([400, 401]).toContain(res.status);
      expect((await logar(usuario.email, 'Outra@Senha2')).status).toBe(401);
    });

    it('recusa token inválido', async () => {
      esperarEnvelopeErro(
        await req()
          .post('/ativar-conta')
          .send({ token: 'token-que-nao-existe', senha: SENHA }),
        401,
      );
    });

    it('recusa sem token e com senha fraca', async () => {
      esperarEnvelopeErro(
        await req().post('/ativar-conta').send({ senha: SENHA }),
        400,
      );
      const usuario = await convidarUsuario(tokenAdmin);
      const token = await tokenDoConvite(usuario._id);
      esperarEnvelopeErro(
        await req().post('/ativar-conta').send({ token, senha: 'fraca' }),
        400,
      );
    });
  });

  describe('POST /usuarios/:id/reenviar-convite', () => {
    it('recusa reenviar para quem já ativou', async () => {
      const usuario = await convidarEAtivar();
      esperarEnvelopeErro(
        await req(tokenAdmin).post(`/usuarios/${usuario._id}/reenviar-convite`),
        400,
      );
    });

    it('avisa quando o e-mail não está configurado', async () => {
      const usuario = await convidarUsuario(tokenAdmin);
      esperarEnvelopeErro(
        await req(tokenAdmin).post(`/usuarios/${usuario._id}/reenviar-convite`),
        503,
      );
    });

    it('responde 404 para usuário inexistente', async () => {
      expect(
        (
          await req(tokenAdmin).post(
            `/usuarios/${ID_INEXISTENTE}/reenviar-convite`,
          )
        ).status,
      ).toBe(404);
    });
  });

  describe('PATCH /usuarios/:id', () => {
    it('o admin altera o nome de outro usuário', async () => {
      const usuario = await convidarUsuario(tokenAdmin);
      const res = await req(tokenAdmin)
        .patch(`/usuarios/${usuario._id}`)
        .send({ nome: 'Zz Nome Alterado' });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe('Zz Nome Alterado');
    });

    it('o usuário altera o próprio fuso, mas não outro usuário', async () => {
      const usuario = await convidarEAtivar();
      const outro = await convidarUsuario(tokenAdmin);
      const { body } = await logar(usuario.email, SENHA);

      const proprio = await req(body.token)
        .patch(`/usuarios/${usuario._id}`)
        .send({ fuso_horario: 'America/Manaus' });
      esperarEnvelopeSucesso(proprio, 200);
      expect(proprio.body.data.fuso_horario).toBe('America/Manaus');

      expect(
        (
          await req(body.token)
            .patch(`/usuarios/${outro._id}`)
            .send({ nome: 'Zz Invasor' })
        ).status,
      ).toBe(403);
    });

    it('recusa nome fora do padrão e fuso inexistente', async () => {
      const usuario = await convidarUsuario(tokenAdmin);
      esperarEnvelopeErro(
        await req(tokenAdmin)
          .patch(`/usuarios/${usuario._id}`)
          .send({ nome: 'nome minúsculo' }),
        400,
      );
      esperarEnvelopeErro(
        await req(tokenAdmin)
          .patch(`/usuarios/${usuario._id}`)
          .send({ fuso_horario: 'Lugar/Nenhum' }),
        400,
      );
    });
  });
});
