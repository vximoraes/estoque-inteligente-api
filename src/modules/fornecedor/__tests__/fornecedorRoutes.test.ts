import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarFornecedor,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarErroDeCampo,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Fornecedor', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /fornecedores', () => {
    it('deve cadastrar fornecedor válido', async () => {
      const res = await req(token)
        .post('/fornecedores')
        .send({ nome: sufixoUnico('zz-fornecedor') });
      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).toHaveProperty('_id');
    });

    it('deve falhar ao cadastrar sem nome', async () => {
      const res = await req(token).post('/fornecedores').send({});
      esperarEnvelopeErro(res, 400);
      esperarErroDeCampo(res, 'nome');
    });

    it('deve falhar ao cadastrar com nome já existente', async () => {
      const fornecedor = await criarFornecedor(token);
      const res = await req(token)
        .post('/fornecedores')
        .send({ nome: fornecedor.nome });
      esperarEnvelopeErro(res, 400);
    });

    it('não deve retornar campos sensíveis na resposta', async () => {
      const res = await req(token)
        .post('/fornecedores')
        .send({ nome: sufixoUnico('zz-fornecedor') });
      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).not.toHaveProperty('senha');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const res = await req(tokenUsuarioPadrao)
        .post('/fornecedores')
        .send({ nome: sufixoUnico('zz-fornecedor') });
      esperarEnvelopeSucesso(res, 201);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('')
        .post('/fornecedores')
        .send({ nome: sufixoUnico('zz-fornecedor') });
      expect(res.status).toBe(498);
    });

    it('deve rejeitar com token inválido', async () => {
      const res = await req('token-invalido')
        .post('/fornecedores')
        .send({ nome: sufixoUnico('zz-fornecedor') });
      expect(res.status).toBe(498);
    });
  });

  describe('GET /fornecedores', () => {
    it('deve listar fornecedores paginados', async () => {
      const res = await req(token).get('/fornecedores');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve aplicar filtro de busca por nome', async () => {
      const fornecedor = await criarFornecedor(token);
      const res = await req(token).get(`/fornecedores?nome=${fornecedor.nome}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.docs.some((f) => f.nome === fornecedor.nome)).toBe(
        true,
      );
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/fornecedores');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /fornecedores/:id', () => {
    it('deve retornar fornecedor por id', async () => {
      const fornecedor = await criarFornecedor(token);
      const res = await req(token).get(`/fornecedores/${fornecedor._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data._id).toBe(fornecedor._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/fornecedores/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para fornecedor inexistente', async () => {
      const res = await req(token).get(`/fornecedores/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /fornecedores/:id', () => {
    it('deve atualizar nome do fornecedor', async () => {
      const fornecedor = await criarFornecedor(token);
      const novoNome = sufixoUnico('zz-fornecedor-atualizado');
      const res = await req(token)
        .patch(`/fornecedores/${fornecedor._id}`)
        .send({ nome: novoNome });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.nome).toBe(novoNome);
    });

    it('deve falhar ao atualizar para nome já existente', async () => {
      const fornecedor1 = await criarFornecedor(token);
      const fornecedor2 = await criarFornecedor(token);
      const res = await req(token)
        .patch(`/fornecedores/${fornecedor2._id}`)
        .send({ nome: fornecedor1.nome });
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 ao atualizar fornecedor inexistente', async () => {
      const res = await req(token)
        .patch(`/fornecedores/${ID_INEXISTENTE}`)
        .send({ nome: sufixoUnico('zz-fornecedor') });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /fornecedores/:id/inativar', () => {
    it('deve inativar fornecedor existente', async () => {
      const fornecedor = await criarFornecedor(token);
      const res = await req(token).patch(
        `/fornecedores/${fornecedor._id}/inativar`,
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.ativo).toBe(false);
    });

    it('deve retornar 404 ao inativar fornecedor inexistente', async () => {
      const res = await req(token).patch(
        `/fornecedores/${ID_INEXISTENTE}/inativar`,
      );
      expect(res.status).toBe(404);
    });
  });
});
