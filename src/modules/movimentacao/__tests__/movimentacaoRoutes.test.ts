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
  ID_INVALIDO,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';
import request from 'supertest';
import { BASE_URL } from '../../../../test/helpers/rotasTestHelper.js';
import { diaNoFuso } from '../../../utils/fusoHorario.js';

describe('Rotas de Movimentação', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('POST /movimentacoes', () => {
    it('deve cadastrar movimentação de entrada válida', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      const res = await req(token).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '10',
        item: item._id,
        localizacao: localizacao._id,
      });
      esperarEnvelopeSucesso(res, 201);
      expect(res.body.data).toHaveProperty('_id');
    });

    it('grava data_hora com o instante real da criação', async () => {
      const antes = Date.now();
      const movimentacao = await criarMovimentacao(token);
      const dataHora = new Date(movimentacao.data_hora).getTime();
      expect(dataHora).toBeGreaterThanOrEqual(antes - 1000);
      expect(dataHora).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('deve falhar ao cadastrar sem campos obrigatórios', async () => {
      const res = await req(token).post('/movimentacoes').send({});
      esperarEnvelopeErro(res, 400);
    });

    it('deve falhar ao cadastrar com item inexistente', async () => {
      const localizacao = await criarLocalizacao(token);
      const res = await req(token).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '10',
        item: ID_INEXISTENTE,
        localizacao: localizacao._id,
      });
      expect(res.status).toBe(404);
    });

    it('deve permitir cadastro para usuário sem permissão administrativa', async () => {
      const item = await criarItem(tokenUsuarioPadrao);
      const localizacao = await criarLocalizacao(tokenUsuarioPadrao);
      const res = await req(tokenUsuarioPadrao).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '10',
        item: item._id,
        localizacao: localizacao._id,
      });
      esperarEnvelopeSucesso(res, 201);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').post('/movimentacoes').send({});
      expect(res.status).toBe(498);
    });
  });

  describe('GET /movimentacoes', () => {
    it('deve listar movimentações paginadas', async () => {
      await criarMovimentacao(token);
      const res = await req(token).get('/movimentacoes');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
    });

    it('expõe só o nome de quem registrou, sem e-mail nem grupos', async () => {
      await criarMovimentacao(token);
      const res = await req(token).get('/movimentacoes');
      esperarEnvelopeSucesso(res, 200);
      const usuario = res.body.data.docs[0].usuario;
      expect(Object.keys(usuario).sort()).toEqual(['_id', 'nome']);
    });

    it('data_inicio e data_fim iguais a hoje incluem a movimentação recém-criada', async () => {
      const movimentacao = await criarMovimentacao(token);
      const itemId = movimentacao.item?._id ?? movimentacao.item;
      const hoje = diaNoFuso(new Date(), 'UTC');
      const res = await req(token).get(
        `/movimentacoes?item=${itemId}&data_inicio=${hoje}&data_fim=${hoje}`,
      );
      esperarEnvelopeSucesso(res, 200);
      const ids = res.body.data.docs.map((doc) => doc._id);
      expect(ids).toContain(movimentacao._id);
    });

    it('deve rejeitar sem token', async () => {
      const res = await req('').get('/movimentacoes');
      expect(res.status).toBe(498);
    });
  });

  describe('Fuso horário do usuário', () => {
    let usuarioId;

    beforeAll(async () => {
      const sessao = await request(BASE_URL)
        .get('/api/auth/get-session')
        .set('Authorization', `Bearer ${tokenUsuarioPadrao}`);
      usuarioId = sessao.body.user.id;
    });

    afterAll(async () => {
      await req(tokenUsuarioPadrao)
        .patch(`/usuarios/${usuarioId}`)
        .send({ fuso_horario: null });
    });

    it('recusa fuso horário que não é identificador IANA', async () => {
      const res = await req(tokenUsuarioPadrao)
        .patch(`/usuarios/${usuarioId}`)
        .send({ fuso_horario: 'Marte/Olympus' });
      esperarEnvelopeErro(res, 400);
    });

    it('filtra o dia conforme o fuso salvo no usuário', async () => {
      const salvar = await req(tokenUsuarioPadrao)
        .patch(`/usuarios/${usuarioId}`)
        .send({ fuso_horario: 'Pacific/Kiritimati' });
      esperarEnvelopeSucesso(salvar, 200);
      expect(salvar.body.data.fuso_horario).toBe('Pacific/Kiritimati');

      const movimentacao = await criarMovimentacao(tokenUsuarioPadrao);
      const itemId = movimentacao.item?._id ?? movimentacao.item;
      const agora = new Date();
      const diaNoFusoDoUsuario = diaNoFuso(agora, 'Pacific/Kiritimati');
      const diaDoOutroLadoDoMundo = diaNoFuso(agora, 'Etc/GMT+12');

      const noDia = await req(tokenUsuarioPadrao).get(
        `/movimentacoes?item=${itemId}&data_inicio=${diaNoFusoDoUsuario}&data_fim=${diaNoFusoDoUsuario}`,
      );
      expect(noDia.body.data.docs.map((doc) => doc._id)).toContain(
        movimentacao._id,
      );

      const foraDoDia = await req(tokenUsuarioPadrao).get(
        `/movimentacoes?item=${itemId}&data_inicio=${diaDoOutroLadoDoMundo}&data_fim=${diaDoOutroLadoDoMundo}`,
      );
      expect(foraDoDia.body.data.docs.map((doc) => doc._id)).not.toContain(
        movimentacao._id,
      );
    });
  });

  describe('GET /movimentacoes/resumo', () => {
    it('deve retornar resumo de movimentações', async () => {
      const res = await req(token).get('/movimentacoes/resumo');
      esperarEnvelopeSucesso(res, 200);
    });
  });

  describe('GET /movimentacoes/tendencia', () => {
    it('deve retornar tendência de movimentações', async () => {
      const res = await req(token).get('/movimentacoes/tendencia');
      esperarEnvelopeSucesso(res, 200);
    });
  });

  describe('GET /movimentacoes/:id', () => {
    it('deve retornar movimentação por id', async () => {
      const movimentacao = await criarMovimentacao(token);
      const res = await req(token).get(`/movimentacoes/${movimentacao._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toHaveProperty('_id', movimentacao._id);
    });

    it('deve retornar 400 para id malformado', async () => {
      const res = await req(token).get(`/movimentacoes/${ID_INVALIDO}`);
      esperarEnvelopeErro(res, 400);
    });

    it('deve retornar 404 para movimentação inexistente', async () => {
      const res = await req(token).get(`/movimentacoes/${ID_INEXISTENTE}`);
      expect(res.status).toBe(404);
    });
  });
});
