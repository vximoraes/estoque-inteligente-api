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

function nomeUnico(prefixo) {
  const letras = Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
  return `${prefixo} X${letras}`;
}

describe('Rotas de Usuário', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /usuarios/convidar', () => {
    it('deve falhar com 400 ao convidar com e-mail inválido', async () => {
      const res = await req(token)
        .post('/usuarios/convidar')
        .send({ nome: 'Zz Convite Invalido', email: 'nao-e-email' });
      esperarEnvelopeErro(res, 400);
      expect(JSON.stringify(res.body)).not.toContain('stack');
    });

    it('deve falhar com 400 em JSON malformado', async () => {
      const res = await req(token)
        .post('/usuarios/convidar')
        .set('Content-Type', 'application/json')
        .send('{"nome": ');
      esperarEnvelopeErro(res, 400);
    });
  });

  describe('GET /usuarios/:id', () => {
    it('devolve ao usuário comum as próprias permissões efetivas', async () => {
      const perfil = await req(tokenUsuarioPadrao).get('/api/auth/get-session');
      const meuId = perfil.body.user.id;
      const res = await req(tokenUsuarioPadrao).get(
        `/usuarios/${meuId}/permissoes`,
      );
      esperarEnvelopeSucesso(res, 200);
      const porRota = Object.fromEntries(res.body.data.map((p) => [p.rota, p]));
      expect(porRota.itens?.buscar).toBe(true);
      expect(porRota.usuarios?.buscar ?? false).toBe(false);
    });

    it('não deixa o usuário comum ver permissões de outro usuário', async () => {
      const outro = await convidarUsuario(token);
      const res = await req(tokenUsuarioPadrao).get(
        `/usuarios/${outro._id}/permissoes`,
      );
      expect(res.status).toBe(403);
    });
  });
});
