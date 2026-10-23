import http from 'node:http';
import {
  BASE_URL,
  criarItem,
  criarMovimentacao,
  req,
  logarAdmin,
  logarUsuarioPadrao,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
  ID_INEXISTENTE,
} from '../../../../test/helpers/rotasTestHelper.js';

function abrirStream(token) {
  const eventos: string[] = [];
  let aoReceber = () => {};
  const conexao = http.get(`${BASE_URL}/notificacoes/stream`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const resposta = new Promise<http.IncomingMessage>((resolve) =>
    conexao.on('response', (res) => {
      res.setEncoding('utf8');
      res.on('data', (pedaco: string) => {
        eventos.push(pedaco);
        aoReceber();
      });
      resolve(res);
    }),
  );
  conexao.on('error', () => {});

  function esperar(trecho: string) {
    return new Promise<string>((resolve, reject) => {
      const limite = setTimeout(
        () => reject(new Error(`Evento com "${trecho}" não chegou`)),
        5000,
      );
      aoReceber = () => {
        const recebido = eventos.join('');
        if (recebido.includes(trecho)) {
          clearTimeout(limite);
          resolve(recebido);
        }
      };
      aoReceber();
    });
  }

  return { resposta, esperar, fechar: () => conexao.destroy() };
}

async function criarNotificacao(token, override = {}) {
  const res = await req(token)
    .post('/notificacoes')
    .send({ mensagem: 'Mensagem de teste', ...override });
  esperarEnvelopeSucesso(res, 201);
  return res.body.data;
}

describe('Rotas de Notificação', () => {
  let token;
  let tokenUsuarioPadrao;

  beforeAll(async () => {
    token = await logarAdmin();
    tokenUsuarioPadrao = await logarUsuarioPadrao();
  });

  describe('GET /notificacoes/stream', () => {
    it('conecta e recebe o aviso de estoque baixo de um item do autor', async () => {
      const stream = abrirStream(token);
      try {
        const resposta = await stream.resposta;
        expect(resposta.statusCode).toBe(200);
        expect(resposta.headers['content-type']).toContain('text/event-stream');
        await stream.esperar('event: connected');

        const item = await criarItem(token, { estoque_minimo: '10' });
        await criarMovimentacao(token, { item: item._id, quantidade: '4' });

        const recebido = await stream.esperar(item.nome);
        expect(recebido).toContain('event: notificacao');
        expect(recebido).toContain(
          `${item.nome} está com estoque baixo (4 unidades)`,
        );

        const lista = await req(token).get('/notificacoes?visualizada=false');
        expect(
          lista.body.data.docs.some((n) => n.mensagem.includes(item.nome)),
        ).toBe(true);
      } finally {
        stream.fechar();
      }
    });

    it('rejeita sem token', async () => {
      const stream = abrirStream(undefined);
      try {
        expect((await stream.resposta).statusCode).toBe(498);
      } finally {
        stream.fechar();
      }
    });
  });
});
