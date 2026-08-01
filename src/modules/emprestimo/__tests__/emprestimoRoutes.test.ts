import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3010;
const BASE_URL = `http://localhost:${PORT}`;

let token;

const criarDependenciasEmprestimo = async () => {
  const unique = Date.now() + '-' + Math.floor(Math.random() * 10000);

  const categoriaRes = await request(BASE_URL)
    .post('/categorias')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: `Categoria Emprestimo ${unique}` });
  const categoria = categoriaRes.body?.data?._id;
  expect(categoria).toBeTruthy();

  const localizacaoRes = await request(BASE_URL)
    .post('/localizacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: `Localizacao Emprestimo ${unique}` });
  const localizacao = localizacaoRes.body?.data?._id;
  expect(localizacao).toBeTruthy();

  await new Promise((r) => setTimeout(r, 100));

  const itemRes = await request(BASE_URL)
    .post('/itens')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nome: `Item Emprestimo ${unique}`,
      categoria,
      quantidade: 200,
      estoque_minimo: '10',
      valor_unitario: '1',
    });
  const item = itemRes.body?.data?._id;
  expect(item).toBeTruthy();

  await request(BASE_URL)
    .post('/movimentacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      tipo: 'entrada',
      quantidade: '50',
      item,
      localizacao,
    });

  return { item, localizacao };
};

describe('Rotas de Emprestimo', () => {
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

  describe('POST /emprestimos', () => {
    it('deve cadastrar emprestimo valido', async () => {
      const { item, localizacao } = await criarDependenciasEmprestimo();

      const res = await request(BASE_URL)
        .post('/emprestimos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item,
          localizacao,
          quantidade_emprestada: 5,
          solicitante_nome: 'Fulano Externo',
          data_prevista_devolucao: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          observacoes_emprestimo: 'Emprestimo para teste',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.quantidade_aberta).toBe(5);
      expect(res.body.data).toHaveProperty('status');
    }, 20000);
  });

  describe('PATCH /emprestimos/:id/devolver', () => {
    it('deve registrar devolucao parcial', async () => {
      const { item, localizacao } = await criarDependenciasEmprestimo();

      const createRes = await request(BASE_URL)
        .post('/emprestimos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item,
          localizacao,
          quantidade_emprestada: 4,
          solicitante_nome: 'Cliente Externo',
          data_prevista_devolucao: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });

      const emprestimoId = createRes.body?.data?._id;
      expect(emprestimoId).toBeTruthy();

      const res = await request(BASE_URL)
        .patch(`/emprestimos/${emprestimoId}/devolver`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          quantidade_devolvida: 2,
          observacoes_devolucao: 'Devolucao parcial',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.quantidade_devolvida).toBe(2);
      expect(res.body.data.quantidade_aberta).toBe(2);
      expect(res.body.data.status).toBe('Ativo');
    }, 20000);
  });

  describe('GET /emprestimos e /emprestimos/:id', () => {
    it('deve listar emprestimos paginados', async () => {
      const res = await request(BASE_URL)
        .get('/emprestimos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('docs');
      expect(Array.isArray(res.body.data.docs)).toBe(true);
    });

    it('deve retornar 404 para emprestimo inexistente', async () => {
      const id = new mongoose.Types.ObjectId();
      const res = await request(BASE_URL)
        .get(`/emprestimos/${id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
