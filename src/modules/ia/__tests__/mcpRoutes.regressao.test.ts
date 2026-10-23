import request from 'supertest';
import {
  BASE_URL,
  logarAdmin,
  logarUsuarioPadrao,
  criarItem,
  sufixoUnico,
  criarCategoria,
  criarPatrimonio,
} from '../../../../test/helpers/rotasTestHelper.js';

const ACCEPT = 'application/json, text/event-stream';
const PROTOCOL_VERSION = '2025-06-18';

const FERRAMENTAS_ESPERADAS = [
  'buscarItens',
  'buscarPatrimonios',
  'buscarEstoque',
  'buscarMovimentacoes',
  'buscarEmprestimos',
  'verificarItensAbaixoMinimo',
  'itensPrioritariosCompra',
  'buscarCategorias',
  'buscarLocalizacoes',
  'buscarFornecedores',
  'resumoEstoque',
  'historicoPatrimonio',
  'buscarUsuarios',
];

// O transport responde em SSE (`event: message` + `data: {...}`) quando o
// cliente aceita text/event-stream; a última linha `data:` traz o JSON-RPC.
function lerJsonRpc(res) {
  const tipo = res.headers['content-type'] ?? '';
  if (!tipo.includes('text/event-stream')) return res.body;

  const linhasData = res.text
    .split('\n')
    .filter((linha) => linha.startsWith('data:'));
  const ultima = linhasData[linhasData.length - 1];
  if (!ultima) throw new Error(`Resposta SSE sem "data:": ${res.text}`);
  return JSON.parse(ultima.slice('data:'.length).trim());
}

const SEGREDO_MCP =
  process.env['MCP_SEGREDO_INTERNO'] || 'segredo-de-teste-do-mcp';

function postMcp(token, corpo, sessionId?, segredo = SEGREDO_MCP) {
  let requisicao = request(BASE_URL)
    .post('/mcp')
    .set('Accept', ACCEPT)
    .set('Content-Type', 'application/json');
  if (segredo) requisicao = requisicao.set('x-mcp-segredo', segredo);
  if (token) requisicao = requisicao.set('Authorization', `Bearer ${token}`);
  if (sessionId) {
    requisicao = requisicao
      .set('mcp-session-id', sessionId)
      .set('mcp-protocol-version', PROTOCOL_VERSION);
  }
  return requisicao.send(corpo);
}

function corpoInitialize() {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'zz-teste-rotas-mcp', version: '1.0.0' },
    },
  };
}

const sessoesAbertas: Array<{ token: string; sessionId: string }> = [];

async function iniciarSessao(token) {
  const resInit = await postMcp(token, corpoInitialize());
  expect(resInit.status).toBe(200);
  const sessionId = resInit.headers['mcp-session-id'];
  expect(sessionId).toBeTruthy();

  const resNotificacao = await postMcp(
    token,
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    sessionId,
  );
  expect(resNotificacao.status).toBe(202);

  sessoesAbertas.push({ token, sessionId });

  let proximoId = 2;
  return {
    sessionId,
    async enviar(method, params = {}) {
      const res = await postMcp(
        token,
        { jsonrpc: '2.0', id: proximoId++, method, params },
        sessionId,
      );
      expect(res.status).toBe(200);
      return lerJsonRpc(res);
    },
  };
}

async function chamarFerramenta(sessao, nome, argumentos = {}) {
  const resposta = await sessao.enviar('tools/call', {
    name: nome,
    arguments: argumentos,
  });
  expect(resposta.error).toBeUndefined();
  return resposta.result;
}

// Extrai o JSON de dentro do envelope <dados_ferramenta ...> ... </dados_ferramenta>.
function extrairDados(resultado) {
  expect(resultado.isError).toBeFalsy();
  const texto = resultado.content[0].text;
  const casamento = texto.match(
    /^<dados_ferramenta ferramenta="[^"]+" origem="banco_de_dados"[^>]*>\n([\s\S]*)\n<\/dados_ferramenta>/,
  );
  if (!casamento) throw new Error(`Envelope inesperado: ${texto}`);
  return JSON.parse(casamento[1]);
}

describe('Rotas do MCP (/mcp)', () => {
  let token;
  let tokenUsuarioPadrao;
  let sessaoAdmin;
  let sessaoUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
    sessaoAdmin = await iniciarSessao(token);
    sessaoUsuarioPadrao = await iniciarSessao(tokenUsuarioPadrao);
  });

  afterAll(async () => {
    await Promise.all(
      sessoesAbertas.map(({ token: dono, sessionId }) =>
        request(BASE_URL)
          .delete('/mcp')
          .set('Authorization', `Bearer ${dono}`)
          .set('x-mcp-segredo', SEGREDO_MCP)
          .set('mcp-session-id', sessionId)
          .set('mcp-protocol-version', PROTOCOL_VERSION),
      ),
    );
  });

  describe('Autenticação e sessão', () => {
    it('deve rejeitar com 403 quem chama o MCP sem o segredo do assistente, mesmo logado', async () => {
      const res = await postMcp(token, corpoInitialize(), undefined, '');
      expect(res.status).toBe(403);
      expect(res.headers['mcp-session-id']).toBeUndefined();
    });

    it('deve rejeitar com 403 um segredo errado', async () => {
      const res = await postMcp(
        token,
        corpoInitialize(),
        undefined,
        'segredo-errado',
      );
      expect(res.status).toBe(403);
    });
  });

  describe('tools/list', () => {
    it('não usa enum com valores não textuais (o Gemini recusa e derruba todas as mensagens)', async () => {
      const resposta = await sessaoAdmin.enviar('tools/list');
      const enumsInvalidos = [];
      const percorrer = (no, caminho) => {
        if (!no || typeof no !== 'object') return;
        if (
          Array.isArray(no.enum) &&
          no.enum.some((v) => typeof v !== 'string')
        ) {
          enumsInvalidos.push(caminho);
        }
        if ('const' in no && typeof no.const !== 'string') {
          enumsInvalidos.push(caminho);
        }
        Object.entries(no).forEach(([chave, valor]) =>
          percorrer(valor, `${caminho}.${chave}`),
        );
      };
      resposta.result.tools.forEach((t) => percorrer(t.inputSchema, t.name));
      expect(enumsInvalidos).toEqual([]);
    });
  });

  describe('Ferramentas de análise', () => {
    it('buscarCategorias traz a contagem completa de itens e de unidades por categoria', async () => {
      const consumo = await criarCategoria(token);
      await criarItem(token, { categoria: consumo._id });
      await criarItem(token, { categoria: consumo._id });
      const permanente = await criarCategoria(token, { tipo: 'permanente' });
      for (let i = 0; i < 3; i++) {
        await criarPatrimonio(token, { categoria: permanente._id });
      }

      const [dadosConsumo] = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'buscarCategorias', {
          nome: consumo.nome,
        }),
      );
      const [dadosPermanente] = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'buscarCategorias', {
          nome: permanente.nome,
        }),
      );

      expect(dadosConsumo.itens_ativos).toBe(2);
      expect(dadosPermanente.unidades_patrimonio_ativas).toBe(3);
    });

    it('buscaExata traz só o nome inteiro, em itens e no modelo do patrimônio', async () => {
      const nome = sufixoUnico('zz-exato');
      await criarItem(token, { nome });
      await criarItem(token, { nome: `${nome}-parecido` });
      await criarPatrimonio(token, { modelo: nome });
      await criarPatrimonio(token, { modelo: `${nome}-parecido` });

      const itens = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'buscarItens', {
          nome: nome.toUpperCase(),
          buscaExata: true,
        }),
      );
      const unidades = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'buscarPatrimonios', {
          modelo: nome,
          buscaExata: true,
        }),
      );
      const porTrecho = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'buscarItens', { nome }),
      );

      expect(itens.registros.map((i) => i.nome)).toEqual([nome]);
      expect(unidades.registros.map((u) => u.modelo)).toEqual([nome]);
      expect(porTrecho.total_encontrado).toBe(2);
    });

    it('verificarItensAbaixoMinimo ignora item sem estoque mínimo', async () => {
      const item = await criarItem(token, { estoque_minimo: '0' });
      const itens = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'verificarItensAbaixoMinimo'),
      );
      expect(itens.map((i) => i.nome)).not.toContain(item.nome);
      expect(itens.every((i) => i.estoque_minimo > 0)).toBe(true);
    });
  });

  describe('Indicadores das telas de Relatórios', () => {
    it('resumoEstoque traz empréstimos no prazo e devolvidos', async () => {
      const dados = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'resumoEstoque'),
      );

      expect(dados.emprestimos_no_prazo).toBe(
        dados.emprestimos_ativos - dados.emprestimos_atrasados,
      );
      expect(typeof dados.emprestimos_devolvidos).toBe('number');
    });
  });

  describe('Ordenação, filtro do próprio usuário e fuso horário', () => {
    let usuarioPadraoId;

    beforeAll(async () => {
      const sessao = await request(BASE_URL)
        .get('/api/auth/get-session')
        .set('Authorization', `Bearer ${tokenUsuarioPadrao}`)
        .set('x-mcp-segredo', SEGREDO_MCP);
      usuarioPadraoId = sessao.body.user.id;
    });

    afterAll(async () => {
      await request(BASE_URL)
        .patch(`/usuarios/${usuarioPadraoId}`)
        .set('Authorization', `Bearer ${tokenUsuarioPadrao}`)
        .set('x-mcp-segredo', SEGREDO_MCP)
        .send({ fuso_horario: null });
    });

    it('buscarItens com mais_recentes e apenasMeus traz o último item do próprio usuário', async () => {
      const meu = await criarItem(tokenUsuarioPadrao);
      const deOutro = await criarItem(token);

      const ultimoGeral = extrairDados(
        await chamarFerramenta(sessaoUsuarioPadrao, 'buscarItens', {
          ordenar: 'mais_recentes',
          limite: 1,
        }),
      );
      expect(ultimoGeral.registros[0].nome).toBe(deOutro.nome);

      const ultimoMeu = extrairDados(
        await chamarFerramenta(sessaoUsuarioPadrao, 'buscarItens', {
          ordenar: 'mais_recentes',
          apenasMeus: true,
          limite: 1,
        }),
      );
      expect(ultimoMeu.registros[0].nome).toBe(meu.nome);
    });

    it('devolve as datas no fuso horário do usuário', async () => {
      await request(BASE_URL)
        .patch(`/usuarios/${usuarioPadraoId}`)
        .set('Authorization', `Bearer ${tokenUsuarioPadrao}`)
        .set('x-mcp-segredo', SEGREDO_MCP)
        .send({ fuso_horario: 'Asia/Tokyo' });
      const item = await criarItem(tokenUsuarioPadrao);

      const resultado = await chamarFerramenta(
        sessaoUsuarioPadrao,
        'buscarItens',
        { nome: item.nome },
      );
      const dados = extrairDados(resultado);
      const cadastradoEm = dados.registros[0].cadastrado_em;

      expect(cadastradoEm).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/,
      );
      expect(new Date(cadastradoEm).getTime()).toBe(
        new Date(item.createdAt).setMilliseconds(0),
      );
      expect(resultado.content[0].text).toContain('fuso_horario="Asia/Tokyo"');
    });
  });

  describe('Busca com caracteres especiais de regex', () => {
    it('trata parêntese solto como texto, sem erro', async () => {
      const resultado = await chamarFerramenta(
        sessaoAdmin,
        'buscarLocalizacoes',
        { nome: '(' },
      );
      expect(extrairDados(resultado)).toEqual([]);
    });

    it('não usa .* como curinga na busca por nome', async () => {
      const dados = extrairDados(
        await chamarFerramenta(sessaoAdmin, 'buscarItens', { nome: '.*' }),
      );
      expect(dados.total_encontrado).toBe(0);
    });

    it('historicoPatrimonio não casa qualquer número com .*', async () => {
      const resultado = await chamarFerramenta(
        sessaoAdmin,
        'historicoPatrimonio',
        { numeroPatrimonio: '.*' },
      );
      expect(resultado.isError).toBe(true);
    });
  });
});
