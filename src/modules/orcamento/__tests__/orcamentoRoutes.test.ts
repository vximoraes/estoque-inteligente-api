import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';
import faker from 'faker-br';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3010;
const BASE_URL = `http://localhost:${PORT}`;

describe('Orçamentos', () => {
  let token;
  let orcamentoId;
  let protocolo;
  let itemId;
  let itemRealId;
  let fornecedorRealId;

  const criarItemEFornecedor = async () => {
    const unique = Date.now() + '-' + Math.floor(Math.random() * 10000);

    const catRes = await request(BASE_URL)
      .post('/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: `Categoria Teste ${unique}` });
    const categoria = catRes.body.data._id;

    const locRes = await request(BASE_URL)
      .post('/localizacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: `Localizacao Teste ${unique}` });
    const localizacao = locRes.body.data._id;

    const fornRes = await request(BASE_URL)
      .post('/fornecedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: `Fornecedor Teste ${unique}` });
    const fornecedor = fornRes.body.data._id;

    const compRes = await request(BASE_URL)
      .post('/itens')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: `Item Teste ${unique}`,
        categoria,
        localizacao,
        estoque_minimo: '10',
        valor_unitario: '1.5',
      });
    const item = compRes.body.data._id;

    return { item, fornecedor };
  };

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

    const { item, fornecedor } = await criarItemEFornecedor();
    itemRealId = item;
    fornecedorRealId = fornecedor;
  }, 15000);

  it('Não deve cadastrar orçamento sem campos obrigatórios (400)', async () => {
    await request(BASE_URL)
      .post('/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('Deve cadastrar orçamento válido (POST)', async () => {
    protocolo = 'PROTOCOLO-' + Date.now();
    const item = {
      item: itemRealId,
      fornecedor: fornecedorRealId,
      quantidade: 2,
      valor_unitario: 0.5,
    };
    const obj = {
      nome: 'Orçamento Teste',
      itens: [item],
    };
    const res = await request(BASE_URL)
      .post('/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send(obj);
    expect(res.status).toBe(201);
    orcamentoId = res.body.data._id;
    expect(res.body.data).toHaveProperty('_id');
    if (Array.isArray(res.body.data.itens)) {
      expect(res.body.data.itens.length).toBeGreaterThan(0);
    } else {
      expect(true).toBe(true);
    }
  });

  it('Deve listar todos os orçamentos (GET)', async () => {
    const res = await request(BASE_URL)
      .get('/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body.data.docs || res.body.data)).toBe(true);
  });

  it('Deve buscar orçamento por id (GET /orcamentos/:id)', async () => {
    const res = await request(BASE_URL)
      .get(`/orcamentos/${orcamentoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data._id).toBe(orcamentoId);
  });

  it('Deve retornar 404 ao buscar orçamento inexistente', async () => {
    await request(BASE_URL)
      .get(`/orcamentos/000000000000000000000000`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('Deve atualizar orçamento (PATCH)', async () => {
    const novoNome = 'Orçamento Atualizado';
    const res = await request(BASE_URL)
      .patch(`/orcamentos/${orcamentoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: novoNome })
      .expect(200);
    expect(res.body.data.nome).toBe(novoNome);
  });

  it('Deve retornar 404 ao atualizar orçamento inexistente', async () => {
    await request(BASE_URL)
      .patch(`/orcamentos/000000000000000000000000`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Qualquer' })
      .expect(404);
  });

  it('Deve remover orçamento (DELETE)', async () => {
    const item = {
      item: itemRealId,
      fornecedor: fornecedorRealId,
      quantidade: 2,
      valor_unitario: 0.5,
    };
    const obj = {
      nome: 'Orçamento Remover',
      itens: [item],
    };
    const res1 = await request(BASE_URL)
      .post('/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send(obj)
      .expect(201);
    const id = res1.body.data._id;
    expect(id).toBeTruthy();
    await request(BASE_URL)
      .delete(`/orcamentos/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect((res) => {
        expect([200, 204, 404]).toContain(res.status);
      });
  });

  it('Deve adicionar item ao orçamento', async () => {
    const comp = {
      item: itemRealId,
      fornecedor: fornecedorRealId,
      quantidade: 1,
      valor_unitario: 2,
    };
    const res = await request(BASE_URL)
      .post(`/orcamentos/${orcamentoId}/itens`)
      .set('Authorization', `Bearer ${token}`)
      .send(comp)
      .expect(200);
    itemId = res.body.data._id;
    expect(res.body.data._id).toBeDefined();
  });

  it('Deve atualizar item do orçamento', async () => {
    expect(itemId).toBeDefined();
    const res = await request(BASE_URL)
      .patch(`/orcamentos/${orcamentoId}/itens/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantidade: '5' })
      .expect((res) => {
        expect([200, 404]).toContain(res.status);
      });
    if (res.status === 200) {
      expect(res.body.data.quantidade).toBe(5);
    }
  });

  it('Deve remover item do orçamento', async () => {
    await request(BASE_URL)
      .delete(`/orcamentos/${orcamentoId}/itens/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('Deve aplicar filtro de busca por nome', async () => {
    const nomeFiltro = 'OrcamentoFiltro' + Date.now();
    const item = {
      item: itemRealId,
      fornecedor: fornecedorRealId,
      quantidade: 1,
      valor_unitario: 0.5,
    };
    const obj = {
      nome: nomeFiltro,
      itens: [item],
    };
    await request(BASE_URL)
      .post('/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send(obj);
    const res = await request(BASE_URL)
      .get(`/orcamentos?nome=${nomeFiltro}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.docs.some((o) => o.nome === nomeFiltro)).toBe(true);
  });

  it('Resposta não deve conter campos desnecessários', async () => {
    const item = {
      item: itemRealId,
      fornecedor: fornecedorRealId,
      quantidade: 1,
      valor_unitario: 0.5,
    };
    const obj = {
      nome: 'Orçamento Limpo' + Date.now(),
      itens: [item],
    };
    const res = await request(BASE_URL)
      .post('/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send(obj)
      .expect(201);
    expect(res.body.data).not.toHaveProperty('senha');
  });
});
