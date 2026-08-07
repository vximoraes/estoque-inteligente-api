import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3010;
const BASE_URL = `http://localhost:${PORT}`;

let token;
const criarMovimentacaoValida = async (tipo = 'entrada', override = {}) => {
  const unique = Date.now() + '-' + Math.floor(Math.random() * 10000);
  const categoriaNome = `Categoria Teste ${unique}`;
  const localizacaoNome = `Localizacao Teste ${unique}`;

  const catRes = await request(BASE_URL)
    .post('/categorias')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: categoriaNome });
  const categoria = catRes.body?.data?._id;
  expect(categoria).toBeTruthy();

  const locRes = await request(BASE_URL)
    .post('/localizacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: localizacaoNome });
  const localizacao = locRes.body?.data?._id;
  expect(localizacao).toBeTruthy();

  await new Promise((r) => setTimeout(r, 200));

  const itemNome = `Resistor ${unique}`;
  const compRes = await request(BASE_URL)
    .post('/itens')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nome: itemNome,
      categoria,
      quantidade: 100,
      estoque_minimo: '10',
      valor_unitario: '0.5',
    });
  const item = compRes.body?.data?._id;
  expect(item).toBeTruthy();

  await new Promise((r) => setTimeout(r, 150));

  return {
    item,
    tipo,
    quantidade: '10',
    localizacao,
    ...override,
  };
};

describe('Rotas de Movimentação', () => {
  let movimentacaoId;

  beforeAll(async () => {
    // Requer `npm run seed` rodado contra o mesmo DB_URL do servidor em teste.
    const loginRes = await request(BASE_URL)
      .post('/api/auth/sign-in/email')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@admin.com',
        password: process.env.ADMIN_PASSWORD || 'Senha@123',
      });
    token = loginRes.body?.token;
    expect(token).toBeTruthy();
  });

  describe('POST /movimentacoes', () => {
    it('deve cadastrar movimentação válida', async () => {
      const dados = await criarMovimentacaoValida();
      const res = await request(BASE_URL)
        .post('/movimentacoes')
        .set('Authorization', `Bearer ${token}`)
        .send(dados);
      expect([200, 201]).toContain(res.status);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data._id).toBeTruthy();
      movimentacaoId = res.body.data._id;
    }, 15000);
    it('deve falhar ao cadastrar sem campos obrigatórios', async () => {
      const res = await request(BASE_URL)
        .post('/movimentacoes')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('GET /movimentacoes', () => {
    it('deve listar todas as movimentações', async () => {
      const dados = await criarMovimentacaoValida();
      await request(BASE_URL)
        .post('/movimentacoes')
        .set('Authorization', `Bearer ${token}`)
        .send(dados);
      const res = await request(BASE_URL)
        .get('/movimentacoes')
        .set('Authorization', `Bearer ${token}`);
      expect([200, 201]).toContain(res.status);
      expect(res.body.data).toHaveProperty('docs');
      expect(Array.isArray(res.body.data.docs)).toBe(true);
    }, 10000);
  });
  describe('GET /movimentacoes/:id', () => {
    it('deve retornar movimentação por id', async () => {
      const dados = await criarMovimentacaoValida();
      const movRes = await request(BASE_URL)
        .post('/movimentacoes')
        .set('Authorization', `Bearer ${token}`)
        .send(dados);
      expect(movRes.body.data).toBeTruthy();
      const id = movRes.body.data._id;
      const res = await request(BASE_URL)
        .get(`/movimentacoes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect([200, 201]).toContain(res.status);
      expect(res.body.data).toHaveProperty('_id', id);
    }, 15000);
    it('deve retornar 404 para movimentação inexistente', async () => {
      const id = new mongoose.Types.ObjectId();
      const res = await request(BASE_URL)
        .get(`/movimentacoes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
