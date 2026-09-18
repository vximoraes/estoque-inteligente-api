import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarCategoria,
  criarItem,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarErroDeCampo,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Item', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /itens', () => {
    it('deve cadastrar item válido com status inicial Indisponível', async () => {
      const categoria = await criarCategoria(token);
      const res = await req(token)
        .post('/itens')
        .send({
          nome: sufixoUnico('zz-item'),
          categoria: categoria._id,
          estoque_minimo: '10',
        });
      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).toHaveProperty('ativo', true);
      expect(res.body.data).toHaveProperty('status', 'Indisponível');
    });

    it('deve falhar ao cadastrar sem campos obrigatórios', async () => {
      const res = await req(token).post('/itens').send({});
      esperarEnvelopeErro(res, 400);
      esperarErroDeCampo(res, 'categoria');
    });

    it('deve falhar ao cadastrar com nome já existente', async () => {
      const item = await criarItem(token);
      const res = await req(token)
        .post('/itens')
        .send({
          nome: item.nome,
          categoria: item.categoria,
          estoque_minimo: '10',
        });
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao cadastrar com categoria inexistente', async () => {
      const res = await req(token)
        .post('/itens')
        .send({
          nome: sufixoUnico('zz-item'),
          categoria: ID_INEXISTENTE,
          estoque_minimo: '10',
        });
      esperarEnvelopeErro(res, 400);
      esperarErroDeCampo(res, 'categoria');
    });

    it('deve falhar ao cadastrar com categoria de tipo permanente', async () => {
      const categoriaPermanente = await criarCategoria(token, {
        tipo: 'permanente',
      });
      const res = await req(token)
        .post('/itens')
        .send({
          nome: sufixoUnico('zz-item'),
          categoria: categoriaPermanente._id,
          estoque_minimo: '10',
        });
      esperarEnvelopeErro(res, 400);
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const categoria = await criarCategoria(tokenUsuarioPadrao);
      const res = await req(tokenUsuarioPadrao)
        .post('/itens')
        .send({
          nome: sufixoUnico('zz-item'),
          categoria: categoria._id,
          estoque_minimo: '10',
        });
      esperarEnvelopeSucesso(res, 201);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/itens').send({});
      expect(res.status).toBe(498);
    });

    it('deve rejeitar com token inválido', async () => {
      const res = await req('token-invalido').post('/itens').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('GET /itens', () => {
    it('deve listar itens paginados', async () => {
      const res = await req(token).get('/itens');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/itens');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /itens/stats', () => {
    it('deve retornar estatísticas de itens', async () => {
      const res = await req(token).get('/itens/stats');
      esperarEnvelopeSucesso(res, 200);
    });
  });

  describe('GET /itens/:id', () => {
    it('deve retornar item por id', async () => {
      const item = await criarItem(token);
      const res = await req(token).get(`/itens/${item._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', item._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/itens/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para item inexistente', async () => {
      const res = await req(token).get(`/itens/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /itens/:id', () => {
    it('deve atualizar campos permitidos do item', async () => {
      const item = await criarItem(token);
      const novoNome = sufixoUnico('zz-item-atualizado');
      const res = await req(token)
        .patch(`/itens/${item._id}`)
        .send({ nome: novoNome });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoNome);
    });

    it('deve recalcular status ao atualizar estoque_minimo', async () => {
      const item = await criarItem(token);
      const res = await req(token)
        .patch(`/itens/${item._id}`)
        .send({ estoque_minimo: '5' });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.status).toBe('Indisponível');
    });

    it('não deve permitir atualizar quantidade diretamente', async () => {
      const item = await criarItem(token);
      const res = await req(token)
        .patch(`/itens/${item._id}`)
        .send({ quantidade: 999 });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.quantidade).not.toBe(999);
    });

    it('deve falhar ao atualizar para nome já existente', async () => {
      const item1 = await criarItem(token);
      const item2 = await criarItem(token);
      const res = await req(token)
        .patch(`/itens/${item2._id}`)
        .send({ nome: item1.nome });
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 ao atualizar item inexistente', async () => {
      const res = await req(token)
        .patch(`/itens/${ID_INEXISTENTE}`)
        .send({ nome: sufixoUnico('zz-item') });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /itens/:id/inativar', () => {
    it('deve inativar item existente', async () => {
      const item = await criarItem(token);
      const res = await req(token).patch(`/itens/${item._id}/inativar`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.ativo).toBe(false);
    });

    it('deve retornar 404 ao inativar item inexistente', async () => {
      const res = await req(token).patch(`/itens/${ID_INEXISTENTE}/inativar`);
      expect(res.status).toBe(404);
    });
  });
});
