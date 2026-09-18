import mongoose from 'mongoose';
import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarCategoria,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarErroDeCampo,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Categoria', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /categorias', () => {
    it('deve cadastrar categoria válida', async () => {
      const res = await req(token)
        .post('/categorias')
        .send({ nome: sufixoUnico('zz-categoria'), tipo: 'consumo' });
      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).toHaveProperty('_id');
    });

    it('deve falhar ao cadastrar sem nome', async () => {
      const res = await req(token)
        .post('/categorias')
        .send({ tipo: 'consumo' });
      esperarEnvelopeErro(res, 400);
      esperarErroDeCampo(res, 'nome');
    });

    it('deve falhar ao cadastrar sem tipo', async () => {
      const res = await req(token)
        .post('/categorias')
        .send({ nome: sufixoUnico('zz-categoria') });
      esperarEnvelopeErro(res, 400);
      esperarErroDeCampo(res, 'tipo');
    });

    it('deve falhar ao cadastrar com nome já existente', async () => {
      const categoria = await criarCategoria(token);
      const res = await req(token)
        .post('/categorias')
        .send({ nome: categoria.nome, tipo: 'consumo' });
      esperarEnvelopeErro(res, 400);
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao)
        .post('/categorias')
        .send({ nome: sufixoUnico('zz-categoria'), tipo: 'consumo' });
      esperarEnvelopeSucesso(res, 201);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('')
        .post('/categorias')
        .send({
          nome: sufixoUnico('zz-categoria'),
          tipo: 'consumo',
        });
      expect(res.status).toBe(498);
    });

    it('deve rejeitar com token inválido', async () => {
      const res = await req('token-invalido')
        .post('/categorias')
        .send({
          nome: sufixoUnico('zz-categoria'),
          tipo: 'consumo',
        });
      expect(res.status).toBe(498);
    });
  });

  describe('GET /categorias', () => {
    it('deve listar categorias paginadas', async () => {
      const res = await req(token).get('/categorias');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/categorias');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /categorias/:id', () => {
    it('deve retornar categoria por id', async () => {
      const categoria = await criarCategoria(token);
      const res = await req(token).get(`/categorias/${categoria._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', categoria._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/categorias/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para categoria inexistente', async () => {
      const res = await req(token).get(`/categorias/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /categorias/:id', () => {
    it('deve atualizar nome da categoria', async () => {
      const categoria = await criarCategoria(token);
      const novoNome = sufixoUnico('zz-categoria-atualizada');
      const res = await req(token)
        .patch(`/categorias/${categoria._id}`)
        .send({ nome: novoNome });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoNome);
    });

    it('deve falhar ao atualizar para nome já existente', async () => {
      const categoria1 = await criarCategoria(token);
      const categoria2 = await criarCategoria(token);
      const res = await req(token)
        .patch(`/categorias/${categoria2._id}`)
        .send({ nome: categoria1.nome });
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 ao atualizar categoria inexistente', async () => {
      const res = await req(token)
        .patch(`/categorias/${ID_INEXISTENTE}`)
        .send({ nome: sufixoUnico('zz-categoria') });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /categorias/:id/inativar', () => {
    it('deve inativar categoria existente', async () => {
      const categoria = await criarCategoria(token);
      const res = await req(token).patch(
        `/categorias/${categoria._id}/inativar`,
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.ativo).toBe(false);
    });

    it('deve retornar 404 ao inativar categoria inexistente', async () => {
      const res = await req(token).patch(
        `/categorias/${ID_INEXISTENTE}/inativar`,
      );
      expect(res.status).toBe(404);
    });
  });
});
