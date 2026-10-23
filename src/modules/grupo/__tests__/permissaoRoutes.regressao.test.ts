import mongoose from 'mongoose';
import {
  ID_INEXISTENTE,
  req,
  logarAdmin,
  conectarBancoDeTeste,
  criarUsuarioComPermissoes,
} from '../../../../test/helpers/rotasTestHelper.js';

const MODULOS = [
  { rota: 'itens', caminho: '/itens' },
  { rota: 'patrimonios', caminho: '/patrimonios' },
  { rota: 'emprestimos', caminho: '/emprestimos' },
  { rota: 'movimentacoes', caminho: '/movimentacoes' },
  { rota: 'categorias', caminho: '/categorias' },
  { rota: 'localizacoes', caminho: '/localizacoes' },
  { rota: 'fornecedores', caminho: '/fornecedores' },
  { rota: 'notificacoes', caminho: '/notificacoes' },
  { rota: 'ia', caminho: '/ia/conversas' },
];

describe('Permissões por módulo (RBAC)', () => {
  let tokenSomenteLeitura;
  let tokenSemPermissao;

  beforeAll(async () => {
    await conectarBancoDeTeste();
    const tokenAdmin = await logarAdmin();
    tokenSomenteLeitura = await criarUsuarioComPermissoes(tokenAdmin, () => ({
      buscar: true,
    }));
    tokenSemPermissao = await criarUsuarioComPermissoes(tokenAdmin, () => ({}));
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe.each(MODULOS)('$caminho', ({ caminho }) => {
    it('sem permissão nenhuma, nem lista', async () => {
      expect((await req(tokenSemPermissao).get(caminho)).status).toBe(403);
    });

    it('só com leitura, lista mas não cria', async () => {
      expect((await req(tokenSomenteLeitura).get(caminho)).status).toBe(200);
      expect(
        (await req(tokenSomenteLeitura).post(caminho).send({})).status,
      ).toBe(403);
    });
  });

  it.each(['/itens', '/categorias', '/localizacoes', '/fornecedores'])(
    'só com leitura, não altera nem inativa em %s',
    async (caminho) => {
      const leitor = req(tokenSomenteLeitura);
      expect(
        (await leitor.patch(`${caminho}/${ID_INEXISTENTE}`).send({})).status,
      ).toBe(403);
      expect(
        (await leitor.patch(`${caminho}/${ID_INEXISTENTE}/inativar`)).status,
      ).toBe(403);
    },
  );

  it('estoque é só leitura e também exige permissão', async () => {
    expect((await req(tokenSemPermissao).get('/estoques')).status).toBe(403);
    expect((await req(tokenSomenteLeitura).get('/estoques')).status).toBe(200);
  });

  it('permissão de um módulo não abre outro', async () => {
    const tokenAdmin = await logarAdmin();
    const token = await criarUsuarioComPermissoes(tokenAdmin, (rota) =>
      rota.startsWith('itens') ? { buscar: true, enviar: true } : {},
    );
    expect((await req(token).get('/itens')).status).toBe(200);
    expect((await req(token).get('/patrimonios')).status).toBe(403);
    expect((await req(token).get('/emprestimos')).status).toBe(403);
  });
});
