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

  describe('GET /openapi.json', () => {
    it('gera a documentação com as rotas de patrimônio', async () => {
      const res = await req().get('/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.paths).toHaveProperty('/patrimonios');
    });
  });

  describe('GET /patrimonios/stats', () => {
    it('conta por status todas as unidades do filtro, não só uma página', async () => {
      const categoria = await criarCategoria(token, { tipo: 'permanente' });
      for (let i = 0; i < 3; i++) {
        await criarPatrimonio(token, { categoria: categoria._id });
      }
      await criarPatrimonio(token, {
        categoria: categoria._id,
        status: 'Manutenção',
      });

      const res = await req(token).get(
        `/patrimonios/stats?categoria=${categoria._id}&limite=1`,
      );
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data).toEqual({
        total: 4,
        disponiveis: 3,
        emprestadas: 0,
        manutencao: 1,
        baixadas: 0,
      });
    });
  });
});
