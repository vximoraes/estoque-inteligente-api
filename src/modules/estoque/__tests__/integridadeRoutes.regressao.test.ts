import {
  req,
  logarAdmin,
  criarCategoria,
  criarItem,
  criarLocalizacao,
  criarMovimentacao,
  criarPatrimonio,
  esperarEnvelopeErro,
  esperarEnvelopeSucesso,
  sufixoUnico,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

describe('Integridade referencial', () => {
  let token;

  beforeAll(async () => {
    token = await logarAdmin();
  });

  async function inativar(recurso, id) {
    return req(token).patch(`/${recurso}/${id}/inativar`);
  }

  describe('movimentação', () => {
    it('recusa localização inexistente', async () => {
      const item = await criarItem(token);
      const res = await req(token).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '3',
        item: item._id,
        localizacao: ID_INEXISTENTE,
      });
      esperarEnvelopeErro(res, 404);
    });

    it('recusa localização inativa', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      esperarEnvelopeSucesso(
        await inativar('localizacoes', localizacao._id),
        200,
      );

      const res = await req(token).post('/movimentacoes').send({
        tipo: 'entrada',
        quantidade: '3',
        item: item._id,
        localizacao: localizacao._id,
      });
      esperarEnvelopeErro(res, 404);
    });

    it('recusa saída de item inativo', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      esperarEnvelopeSucesso(await inativar('itens', item._id), 200);

      const res = await req(token).post('/movimentacoes').send({
        tipo: 'saida',
        quantidade: '1',
        item: item._id,
        localizacao: localizacao._id,
      });
      esperarEnvelopeErro(res, 404);
    });
  });

  describe('inativação com vínculo', () => {
    it('recusa inativar categoria com patrimônio ativo', async () => {
      const categoria = await criarCategoria(token, { tipo: 'permanente' });
      await criarPatrimonio(token, { categoria: categoria._id });
      esperarEnvelopeErro(await inativar('categorias', categoria._id), 400);
    });

    it('recusa inativar localização com patrimônio ativo', async () => {
      const localizacao = await criarLocalizacao(token);
      await criarPatrimonio(token, { localizacao: localizacao._id });
      esperarEnvelopeErro(await inativar('localizacoes', localizacao._id), 400);
    });

    it('recusa inativar item com saldo em estoque', async () => {
      const movimentacao = await criarMovimentacao(token);
      const itemId = movimentacao.item?._id ?? movimentacao.item;
      const res = await inativar('itens', itemId);
      esperarEnvelopeErro(res, 400);
      expect(res.body.message).toContain('saldo');
    });

    it('permite inativar localização cujo saldo foi zerado', async () => {
      const item = await criarItem(token);
      const localizacao = await criarLocalizacao(token);
      await criarMovimentacao(token, {
        item: item._id,
        localizacao: localizacao._id,
        quantidade: '2',
      });
      const saida = await req(token).post('/movimentacoes').send({
        tipo: 'saida',
        quantidade: '2',
        item: item._id,
        localizacao: localizacao._id,
      });
      esperarEnvelopeSucesso(saida, 201);
      esperarEnvelopeSucesso(await inativar('itens', item._id), 200);
      esperarEnvelopeSucesso(
        await inativar('localizacoes', localizacao._id),
        200,
      );
    });
  });

  describe('cadastro em referência inativa', () => {
    it('recusa item em categoria inativa', async () => {
      const categoria = await criarCategoria(token);
      esperarEnvelopeSucesso(await inativar('categorias', categoria._id), 200);

      const res = await req(token)
        .post('/itens')
        .send({
          nome: sufixoUnico('zz-item'),
          categoria: categoria._id,
          estoque_minimo: '1',
        });
      esperarEnvelopeErro(res, 400);
    });

    it('recusa patrimônio em categoria ou localização inativa', async () => {
      const categoria = await criarCategoria(token, { tipo: 'permanente' });
      const localizacao = await criarLocalizacao(token);
      esperarEnvelopeSucesso(
        await inativar('localizacoes', localizacao._id),
        200,
      );

      const emLocalInativo = await req(token)
        .post('/patrimonios')
        .send({
          numero_patrimonio: sufixoUnico('zz-patrimonio'),
          categoria: categoria._id,
          localizacao: localizacao._id,
        });
      esperarEnvelopeErro(emLocalInativo, 404);

      esperarEnvelopeSucesso(await inativar('categorias', categoria._id), 200);
      const localAtivo = await criarLocalizacao(token);
      const emCategoriaInativa = await req(token)
        .post('/patrimonios')
        .send({
          numero_patrimonio: sufixoUnico('zz-patrimonio'),
          categoria: categoria._id,
          localizacao: localAtivo._id,
        });
      esperarEnvelopeErro(emCategoriaInativa, 404);
    });
  });
});
