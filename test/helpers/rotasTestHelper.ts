import request from 'supertest';
import crypto from 'node:crypto';

export const BASE_URL = `http://localhost:${process.env.PORT || 3011}`;

export const ID_INVALIDO = 'id-invalido';
export const ID_INEXISTENTE = '000000000000000000000000';

export function sufixoUnico(prefixo = 'zz-teste') {
  return `${prefixo}-${crypto.randomUUID()}`;
}

async function logar(email, senha) {
  const res = await request(BASE_URL)
    .post('/api/auth/sign-in/email')
    .send({ email, password: senha });
  if (!res.body?.token) {
    throw new Error(
      `Login falhou para ${email}: status ${res.status}, body ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.token;
}

export async function logarAdmin() {
  return logar(
    process.env.ADMIN_EMAIL || 'admin@admin.com',
    process.env.ADMIN_PASSWORD || 'Senha@123',
  );
}

export async function logarUsuarioPadrao() {
  return logar(
    process.env.USER_EMAIL || 'usuario@usuario.com',
    process.env.USER_PASSWORD || 'Senha@123',
  );
}

export function req(token) {
  const comToken = (metodo) => (caminho) => {
    const requisicao = request(BASE_URL)[metodo](caminho);
    return token
      ? requisicao.set('Authorization', `Bearer ${token}`)
      : requisicao;
  };
  return {
    get: comToken('get'),
    post: comToken('post'),
    patch: comToken('patch'),
    put: comToken('put'),
    delete: comToken('delete'),
  };
}

export function esperarEnvelopeSucesso(res, codigo) {
  expect(res.status).toBe(codigo);
  expect(res.body.error).toBe(false);
  expect(res.body.code).toBe(codigo);
  expect(res.body.data).toBeDefined();
}

export function esperarEnvelopeErro(res, codigo) {
  expect(res.status).toBe(codigo);
  expect(res.body.error).toBe(true);
  expect(res.body.code).toBe(codigo);
  expect(Array.isArray(res.body.errors)).toBe(true);
}

export function esperarErroDeCampo(res, campo) {
  expect(
    res.body.errors.some((erro) => erro.path === campo || erro.field === campo),
  ).toBe(true);
}

export function esperarPaginado(res) {
  expect(res.body.data).toHaveProperty('docs');
  expect(Array.isArray(res.body.data.docs)).toBe(true);
  expect(res.body.data).toHaveProperty('totalDocs');
  expect(res.body.data).toHaveProperty('page');
  expect(res.body.data).toHaveProperty('limit');
}

export async function criarCategoria(token, override = {}) {
  const res = await req(token)
    .post('/categorias')
    .send({ nome: sufixoUnico('zz-categoria'), tipo: 'consumo', ...override });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

export async function criarLocalizacao(token, override = {}) {
  const res = await req(token)
    .post('/localizacoes')
    .send({ nome: sufixoUnico('zz-localizacao'), ...override });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

export async function criarFornecedor(token, override = {}) {
  const res = await req(token)
    .post('/fornecedores')
    .send({ nome: sufixoUnico('zz-fornecedor'), ...override });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

export async function criarItem(token, override = {}) {
  const { categoria, ...resto } = override;
  const categoriaId = categoria ?? (await criarCategoria(token))._id;

  const res = await req(token)
    .post('/itens')
    .send({
      nome: sufixoUnico('zz-item'),
      categoria: categoriaId,
      estoque_minimo: '10',
      ...resto,
    });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

export async function criarPatrimonio(token, override = {}) {
  const { categoria, localizacao, ...resto } = override;
  const categoriaId =
    categoria ?? (await criarCategoria(token, { tipo: 'permanente' }))._id;
  const localizacaoId = localizacao ?? (await criarLocalizacao(token))._id;

  const res = await req(token)
    .post('/patrimonios')
    .send({
      numero_patrimonio: sufixoUnico('zz-patrimonio'),
      categoria: categoriaId,
      localizacao: localizacaoId,
      ...resto,
    });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

export async function criarMovimentacao(token, override = {}) {
  const { item, localizacao, ...resto } = override;
  const itemId = item ?? (await criarItem(token))._id;
  const localizacaoId = localizacao ?? (await criarLocalizacao(token))._id;

  const res = await req(token)
    .post('/movimentacoes')
    .send({
      tipo: 'entrada',
      quantidade: '10',
      item: itemId,
      localizacao: localizacaoId,
      ...resto,
    });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

export async function convidarUsuario(token, override = {}) {
  const res = await req(token)
    .post('/usuarios/convidar')
    .send({
      nome: 'Zz Teste Usuario',
      email: `${sufixoUnico('zz-usuario')}@teste.com`,
      ...override,
    });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data.usuario;
}
