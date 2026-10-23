import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarItem,
  criarLocalizacao,
  criarMovimentacao,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

async function criarDependenciasEmprestimo(token) {
  const item = await criarItem(token);
  const localizacao = await criarLocalizacao(token);
  await criarMovimentacao(token, {
    item: item._id,
    localizacao: localizacao._id,
    quantidade: '50',
  });
  return { item: item._id, localizacao: localizacao._id };
}

async function criarEmprestimo(token, override = {}) {
  const { item, localizacao } = await criarDependenciasEmprestimo(token);
  const res = await req(token)
    .post('/emprestimos')
    .send({
      item,
      localizacao,
      quantidade_emprestada: 5,
      solicitante_nome: 'Fulano Externo',
      data_prevista_devolucao: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ...override,
    });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

describe('Rotas de Emprestimo', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /emprestimos', () => {
    it('deve cadastrar emprestimo válido', async () => {
      const emprestimo = await criarEmprestimo(token);
      expect(emprestimo).toHaveProperty('_id');
      expect(emprestimo.quantidade_aberta).toBe(5);
      expect(emprestimo).toHaveProperty('status');
    });

    it('deve falhar ao cadastrar sem campos obrigatórios', async () => {
      const res = await req(token).post('/emprestimos').send({});
      esperarEnvelopeErro(res, 400);
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const { item, localizacao } =
        await criarDependenciasEmprestimo(tokenUsuarioPadrao);
      const res = await req(tokenUsuarioPadrao)
        .post('/emprestimos')
        .send({
          item,
          localizacao,
          quantidade_emprestada: 3,
          solicitante_nome: 'Fulano Externo',
          data_prevista_devolucao: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      esperarEnvelopeSucesso(res, 201);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/emprestimos').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('GET /emprestimos', () => {
    it('deve listar emprestimos paginados', async () => {
      await criarEmprestimo(token);
      const res = await req(token).get('/emprestimos');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/emprestimos');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /emprestimos/tendencia', () => {
    it('deve retornar tendência de empréstimos', async () => {
      const res = await req(token).get('/emprestimos/tendencia');
      esperarEnvelopeSucesso(res, 200);
    });
  });

  describe('GET /emprestimos/:id', () => {
    it('deve retornar empréstimo por id', async () => {
      const emprestimo = await criarEmprestimo(token);
      const res = await req(token).get(`/emprestimos/${emprestimo._id}`);
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 para empréstimo inexistente', async () => {
      const res = await req(token).get(`/emprestimos/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /emprestimos/:id/devolver', () => {
    it('deve registrar devolução parcial', async () => {
      const emprestimo = await criarEmprestimo(token, {
        quantidade_emprestada: 4,
      });

      const res = await req(token)
        .patch(`/emprestimos/${emprestimo._id}/devolver`)
        .send({ quantidade_devolvida: 2, observacoes_devolucao: 'Parcial' });

      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.quantidade_devolvida).toBe(2);
      expect(res.body.data.quantidade_aberta).toBe(2);
      expect(res.body.data.status).toBe('Ativo');
    });

    it('deve retornar 404 ao devolver empréstimo inexistente', async () => {
      const res = await req(token)
        .patch(`/emprestimos/${ID_INEXISTENTE}/devolver`)
        .send({ quantidade_devolvida: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /emprestimos/:id/desfazer-devolucao', () => {
    it('deve desfazer devolução registrada', async () => {
      const emprestimo = await criarEmprestimo(token, {
        quantidade_emprestada: 4,
      });
      await req(token)
        .patch(`/emprestimos/${emprestimo._id}/devolver`)
        .send({ quantidade_devolvida: 2 });

      const res = await req(token).patch(
        `/emprestimos/${emprestimo._id}/desfazer-devolucao`,
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.quantidade_aberta).toBe(4);
    });

    it('deve retornar 404 ao desfazer devolução de empréstimo inexistente', async () => {
      const res = await req(token).patch(
        `/emprestimos/${ID_INEXISTENTE}/desfazer-devolucao`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /emprestimos/:id', () => {
    it('deve atualizar observações do empréstimo', async () => {
      const emprestimo = await criarEmprestimo(token);
      const res = await req(token)
        .put(`/emprestimos/${emprestimo._id}`)
        .send({ observacoes_emprestimo: 'Atualizado' });
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 ao atualizar empréstimo inexistente', async () => {
      const res = await req(token)
        .put(`/emprestimos/${ID_INEXISTENTE}`)
        .send({ observacoes_emprestimo: 'Qualquer' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /emprestimos/:id', () => {
    it('deve falhar ao excluir empréstimo em aberto', async () => {
      const emprestimo = await criarEmprestimo(token);
      const res = await req(token).delete(`/emprestimos/${emprestimo._id}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve excluir empréstimo já totalmente devolvido', async () => {
      const emprestimo = await criarEmprestimo(token, {
        quantidade_emprestada: 3,
      });
      await req(token)
        .patch(`/emprestimos/${emprestimo._id}/devolver`)
        .send({ quantidade_devolvida: 3 });

      const res = await req(token).delete(`/emprestimos/${emprestimo._id}`);
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 ao excluir empréstimo inexistente', async () => {
      const res = await req(token).delete(`/emprestimos/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });
});
