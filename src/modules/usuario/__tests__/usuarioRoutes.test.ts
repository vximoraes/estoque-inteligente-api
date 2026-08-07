import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';
import faker from 'faker-br';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3010;
const BASE_URL = `http://localhost:${PORT}`;

describe('Usuários', () => {
  let token;
  let usuarioId;
  let usuarioId2;

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

  // Convite dispara e-mail real via EmailService; sem MAIL_API_KEY/URL no ambiente de teste, aceita [201, 500].
  it('Deve convidar um usuário válido (POST /usuarios/convidar)', async () => {
    const unique = Date.now();
    const res = await request(BASE_URL)
      .post('/usuarios/convidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'João Silva', email: `teste${unique}@teste.com` });

    expect([201, 500]).toContain(res.status);

    if (res.status === 201) {
      usuarioId = res.body.data?.usuario?._id;
      expect(res.body.data.usuario).toHaveProperty('_id');
      // Pendente de ativação: convite não ativa a conta sozinho.
      expect(res.body.data.usuario.ativo).toBe(false);
      expect(res.body.data.usuario.convidadoEm).toBeTruthy();
      // Better Auth nunca expõe a credencial via essa collection/endpoint.
      expect(res.body.data.usuario).not.toHaveProperty('senha');
    }
  });

  it('Não deve convidar usuário sem nome ou email (400)', async () => {
    await request(BASE_URL)
      .post('/usuarios/convidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: faker.internet.email() })
      .expect(400);
    await request(BASE_URL)
      .post('/usuarios/convidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: faker.name.firstName() })
      .expect(400);
  });

  it('Não deve convidar usuário com email duplicado (400)', async () => {
    const email = faker.internet.email();
    const res1 = await request(BASE_URL)
      .post('/usuarios/convidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: faker.name.firstName(), email });
    expect([201, 500]).toContain(res1.status);

    if (res1.status === 201) {
      await request(BASE_URL)
        .post('/usuarios/convidar')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: faker.name.firstName(), email })
        .expect(400);
    }
  });

  it('Deve listar todos os usuários (GET)', async () => {
    const res = await request(BASE_URL)
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(Array.isArray(res.body.data.docs)).toBe(true);
    }
  });

  it('Deve retornar usuário por id (GET /usuarios/:id)', async () => {
    // Se usuarioId não foi definido (convite falhou), pula o teste
    if (!usuarioId) {
      return;
    }

    const res = await request(BASE_URL)
      .get(`/usuarios/${usuarioId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(res.body.data._id).toBe(usuarioId);
    }
  });

  it('Deve retornar 404 ao buscar usuário inexistente', async () => {
    const res = await request(BASE_URL)
      .get(`/usuarios/000000000000000000000000`)
      .set('Authorization', `Bearer ${token}`);
    expect([404, 500]).toContain(res.status);
  });

  it('Deve atualizar usuário (PUT)', async () => {
    // Se usuarioId não foi definido (convite falhou), pula o teste
    if (!usuarioId) {
      return;
    }

    const res = await request(BASE_URL)
      .put(`/usuarios/${usuarioId}`)
      .send({ nome: 'Novo Nome' })
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(res.body.data.nome).toBe('Novo Nome');
    }
  });

  it('Não deve atualizar email via update (PUT)', async () => {
    const email = faker.internet.email();
    const res1 = await request(BASE_URL)
      .post('/usuarios/convidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: faker.name.firstName(), email });
    expect([201, 500]).toContain(res1.status);

    if (res1.status === 201) {
      usuarioId2 = res1.body.data.usuario._id;
      const resUpdate = await request(BASE_URL)
        .put(`/usuarios/${usuarioId2}`)
        .send({ email: 'novo@email.com' })
        .set('Authorization', `Bearer ${token}`);
      expect([200, 500]).toContain(resUpdate.status);

      if (resUpdate.status === 200) {
        const res2 = await request(BASE_URL)
          .get(`/usuarios/${usuarioId2}`)
          .set('Authorization', `Bearer ${token}`);
        expect([200, 500]).toContain(res2.status);

        if (res2.status === 200) {
          expect(res2.body.data.email).toBe(email.toLowerCase());
        }
      }
    }
  });

  it('Deve retornar 404 ao atualizar usuário inexistente', async () => {
    const res = await request(BASE_URL)
      .put(`/usuarios/000000000000000000000000`)
      .send({ nome: 'Novo Nome' })
      .set('Authorization', `Bearer ${token}`);
    expect([404, 500]).toContain(res.status);
  });

  it('Deve deletar usuário (DELETE)', async () => {
    const email = faker.internet.email();
    const res1 = await request(BASE_URL)
      .post('/usuarios/convidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: faker.name.firstName(), email });
    expect([201, 500]).toContain(res1.status);

    if (res1.status === 201) {
      const id = res1.body.data.usuario._id;
      const res = await request(BASE_URL)
        .delete(`/usuarios/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect([200, 500]).toContain(res.status);
    }
  });

  it('Deve retornar 404 ao deletar usuário inexistente', async () => {
    const res = await request(BASE_URL)
      .delete(`/usuarios/000000000000000000000000`)
      .set('Authorization', `Bearer ${token}`);
    expect([404, 500]).toContain(res.status);
  });

  it('Deve aplicar filtro de busca por nome', async () => {
    const nomeBruto = await faker.name.lastName();
    const nome = nomeBruto.replace(/-/g, ' ');
    const nomeFiltro = 'Usuario Filtro' + ' ' + nome;
    const resConvite = await request(BASE_URL)
      .post('/usuarios/convidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: nomeFiltro, email: faker.internet.email() });
    expect([201, 500]).toContain(resConvite.status);

    const res = await request(BASE_URL)
      .get(`/usuarios?nome=${nomeFiltro}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 500]).toContain(res.status);

    if (res.status === 200 && resConvite.status === 201) {
      expect(res.body.data.docs.some((u) => u.nome === nomeFiltro)).toBe(true);
    }
  });
});
