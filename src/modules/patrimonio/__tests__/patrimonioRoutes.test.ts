import {
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarCategoria,
  criarLocalizacao,
  criarPatrimonio,
  sufixoUnico,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Rotas de Patrimonio', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /patrimonios', () => {
    it('deve cadastrar patrimônio válido com status Disponível', async () => {
      const patrimonio = await criarPatrimonio(token);
      expect(patrimonio).toHaveProperty('_id');
      expect(patrimonio.status).toBe('Disponível');
      expect(patrimonio.ativo).toBe(true);
    });

    it('deve falhar ao cadastrar sem campos obrigatórios', async () => {
      const res = await req(token).post('/patrimonios').send({});
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao cadastrar com categoria inexistente', async () => {
      const localizacao = await criarLocalizacao(token);
      const res = await req(token)
        .post('/patrimonios')
        .send({
          numero_patrimonio: sufixoUnico('zz-patrimonio'),
          categoria: ID_INEXISTENTE,
          localizacao: localizacao._id,
        });
      expect(res.status).toBe(404);
    });

    it('deve falhar ao cadastrar com categoria de tipo consumo', async () => {
      const categoriaConsumo = await criarCategoria(token, {
        tipo: 'consumo',
      });
      const localizacao = await criarLocalizacao(token);
      const res = await req(token)
        .post('/patrimonios')
        .send({
          numero_patrimonio: sufixoUnico('zz-patrimonio'),
          categoria: categoriaConsumo._id,
          localizacao: localizacao._id,
        });
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao cadastrar com numero_patrimonio já existente', async () => {
      const patrimonio = await criarPatrimonio(token);
      const categoria = await criarCategoria(token, { tipo: 'permanente' });
      const localizacao = await criarLocalizacao(token);
      const res = await req(token).post('/patrimonios').send({
        numero_patrimonio: patrimonio.numero_patrimonio,
        categoria: categoria._id,
        localizacao: localizacao._id,
      });
      expect(res.status).toBe(409);
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const patrimonio = await criarPatrimonio(tokenUsuarioPadrao);
      expect(patrimonio).toHaveProperty('_id');
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/patrimonios').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('POST /patrimonios/lote', () => {
    it('deve cadastrar lote de patrimônios com numeração sequencial', async () => {
      const categoria = await criarCategoria(token, { tipo: 'permanente' });
      const localizacao = await criarLocalizacao(token);
      const prefixo = `zzL${Date.now().toString(36)}`;

      const res = await req(token).post('/patrimonios/lote').send({
        categoria: categoria._id,
        localizacao: localizacao._id,
        quantidade: 3,
        prefixo,
      });

      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].numero_patrimonio).toBe(
        `${prefixo.toUpperCase()}-0001`,
      );
      expect(res.body.data[2].numero_patrimonio).toBe(
        `${prefixo.toUpperCase()}-0003`,
      );
    });

    it('deve falhar com quantidade fora do intervalo permitido', async () => {
      const categoria = await criarCategoria(token, { tipo: 'permanente' });
      const localizacao = await criarLocalizacao(token);
      const res = await req(token)
        .post('/patrimonios/lote')
        .send({
          categoria: categoria._id,
          localizacao: localizacao._id,
          quantidade: 0,
          prefixo: `zzL${Date.now().toString(36)}`,
        });
      esperarEnvelopeErro(res, 400);
    });
  });

  describe('GET /patrimonios', () => {
    it('deve listar patrimônios paginados', async () => {
      const res = await req(token).get('/patrimonios');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/patrimonios');
      expect(res.status).toBe(498);
    });
  });

  describe('GET /patrimonios/:id', () => {
    it('deve retornar patrimônio por id', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token).get(`/patrimonios/${patrimonio._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', patrimonio._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/patrimonios/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para patrimônio inexistente', async () => {
      const res = await req(token).get(`/patrimonios/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /patrimonios/:id/eventos', () => {
    it('deve listar eventos do patrimônio, incluindo o cadastro', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token).get(
        `/patrimonios/${patrimonio._id}/eventos`,
      );
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
      expect(res.body.data.docs.some((e) => e.tipo === 'cadastro')).toBe(true);
    });
  });

  describe('PATCH /patrimonios/:id', () => {
    it('deve atualizar metadados do patrimônio', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token)
        .patch(`/patrimonios/${patrimonio._id}`)
        .send({ modelo: 'Modelo Atualizado' });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.modelo).toBe('Modelo Atualizado');
    });

    it('deve retornar 404 ao atualizar patrimônio inexistente', async () => {
      const res = await req(token)
        .patch(`/patrimonios/${ID_INEXISTENTE}`)
        .send({ modelo: 'Qualquer' });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /patrimonios/:id/status', () => {
    it('deve transicionar de Disponível para Manutenção', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token)
        .patch(`/patrimonios/${patrimonio._id}/status`)
        .send({ status: 'Manutenção' });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.status).toBe('Manutenção');
    });

    it('deve falhar ao transicionar para o mesmo status atual', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token)
        .patch(`/patrimonios/${patrimonio._id}/status`)
        .send({ status: 'Disponível' });
      esperarEnvelopeErro(res, 400);
    });

    it('deve rejeitar transição direta para Emprestado', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token)
        .patch(`/patrimonios/${patrimonio._id}/status`)
        .send({ status: 'Emprestado' });
      esperarEnvelopeErro(res, 400);
    });
  });

  describe('PATCH /patrimonios/:id/localizacao', () => {
    it('deve transferir patrimônio para outra localização', async () => {
      const patrimonio = await criarPatrimonio(token);
      const novaLocalizacao = await criarLocalizacao(token);
      const res = await req(token)
        .patch(`/patrimonios/${patrimonio._id}/localizacao`)
        .send({ localizacao: novaLocalizacao._id });
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data.localizacao._id).toBe(novaLocalizacao._id);
    });

    it('deve falhar ao transferir para localização inexistente', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token)
        .patch(`/patrimonios/${patrimonio._id}/localizacao`)
        .send({ localizacao: ID_INEXISTENTE });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /patrimonios/:id/inativar', () => {
    it('deve inativar patrimônio existente', async () => {
      const patrimonio = await criarPatrimonio(token);
      const res = await req(token).patch(
        `/patrimonios/${patrimonio._id}/inativar`,
      );
      esperarEnvelopeSucesso(res, 200);
    });

    it('deve retornar 404 ao inativar patrimônio inexistente', async () => {
      const res = await req(token).patch(
        `/patrimonios/${ID_INEXISTENTE}/inativar`,
      );
      expect(res.status).toBe(404);
    });
  });
});
