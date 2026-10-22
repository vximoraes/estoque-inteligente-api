import request from 'supertest';
import {
  BASE_URL,
  ID_INEXISTENTE,
  ID_INVALIDO,
  req,
  logarAdmin,
  logarUsuarioPadrao,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
  esperarPaginado,
} from '../../../../test/helpers/rotasTestHelper.js';
import {
  criarGeminiFalso,
  nomesDasFerramentas,
  partesRecebidas,
  respostaDeTexto,
} from '../../../../test/helpers/geminiFalso.js';

type Evento = { type: string; content?: string; message?: string };

function lerEventos(texto: string): Evento[] {
  return texto
    .split('\n\n')
    .filter((bloco) => bloco.startsWith('data: '))
    .map((bloco) => JSON.parse(bloco.slice(6)) as Evento);
}

async function cookieDoAdmin(): Promise<string[]> {
  const res = await request(BASE_URL)
    .post('/api/auth/sign-in/email')
    .send({
      email: process.env.ADMIN_EMAIL || 'admin@admin.com',
      password: process.env.ADMIN_PASSWORD || 'Senha@123',
    });
  return ([] as string[])
    .concat(res.headers['set-cookie'] ?? [])
    .map((cookie) => cookie.split(';')[0]);
}

describe('Rotas de IA', () => {
  const gemini = criarGeminiFalso();
  let tokenAdmin;
  let cookies: string[];

  function comCookie() {
    return {
      post: (caminho: string) =>
        request(BASE_URL).post(caminho).set('Cookie', cookies),
      get: (caminho: string) =>
        request(BASE_URL).get(caminho).set('Cookie', cookies),
    };
  }

  async function criarConversa(mensagem_inicial?: string) {
    const res = await comCookie()
      .post('/ia/conversas')
      .send(mensagem_inicial ? { mensagem_inicial } : {});
    esperarEnvelopeSucesso(res, 201);
    return res.body.data;
  }

  async function enviar(conversaId: string, content: string) {
    const res = await comCookie()
      .post(`/ia/conversas/${conversaId}/mensagens`)
      .send({ content });
    return { res, eventos: lerEventos(res.text) };
  }

  beforeAll(async () => {
    await gemini.iniciar();
    tokenAdmin = await logarAdmin();
    cookies = await cookieDoAdmin();
  });

  afterAll(async () => {
    await gemini.parar();
  });

  beforeEach(() => {
    gemini.chamadas.length = 0;
    gemini.responderCom(respostaDeTexto('Resposta simulada.'));
  });

  describe('conversas', () => {
    it('cria com o título tirado da primeira mensagem', async () => {
      const conversa = await criarConversa('Quantos itens tenho no estoque?');
      expect(conversa.titulo).toBe('Quantos itens tenho no estoque?');
      expect(conversa.mensagens).toEqual([]);
    });

    it('cria sem mensagem com o título padrão', async () => {
      const conversa = await criarConversa();
      expect(conversa.titulo).toBe('Nova conversa');
    });

    it('lista as conversas do usuário, paginado', async () => {
      const conversa = await criarConversa();
      const res = await req(tokenAdmin).get('/ia/conversas?limite=50');
      esperarEnvelopeSucesso(res, 200);
      esperarPaginado(res);
      expect(res.body.data.docs.map((c) => c._id)).toContain(conversa._id);
    });

    it('recusa limite fora da faixa', async () => {
      esperarEnvelopeErro(
        await req(tokenAdmin).get('/ia/conversas?limite=51'),
        400,
      );
    });

    it('obtém uma conversa pelo id', async () => {
      const conversa = await criarConversa();
      const res = await req(tokenAdmin).get(`/ia/conversas/${conversa._id}`);
      esperarEnvelopeSucesso(res, 200);
      expect(res.body.data._id).toBe(conversa._id);
    });

    it('não mostra a conversa de outro usuário', async () => {
      const conversa = await criarConversa();
      const tokenPadrao = await logarUsuarioPadrao();
      expect(
        (await req(tokenPadrao).get(`/ia/conversas/${conversa._id}`)).status,
      ).toBe(404);
      expect(
        (await req(tokenPadrao).delete(`/ia/conversas/${conversa._id}`)).status,
      ).toBe(404);
      const lista = await req(tokenPadrao).get('/ia/conversas?limite=50');
      expect(lista.body.data.docs.map((c) => c._id)).not.toContain(
        conversa._id,
      );
    });

    it('exclui a conversa', async () => {
      const conversa = await criarConversa();
      const res = await req(tokenAdmin).delete(`/ia/conversas/${conversa._id}`);
      expect(res.status).toBe(204);
      expect(
        (await req(tokenAdmin).get(`/ia/conversas/${conversa._id}`)).status,
      ).toBe(404);
    });

    it('recusa id inválido e responde 404 para id inexistente', async () => {
      esperarEnvelopeErro(
        await req(tokenAdmin).get(`/ia/conversas/${ID_INVALIDO}`),
        400,
      );
      esperarEnvelopeErro(
        await req(tokenAdmin).get(`/ia/conversas/${ID_INEXISTENTE}`),
        404,
      );
      esperarEnvelopeErro(
        await req(tokenAdmin).delete(`/ia/conversas/${ID_INEXISTENTE}`),
        404,
      );
    });

    it('exige sessão', async () => {
      expect((await req().get('/ia/conversas')).status).toBe(498);
    });
  });

  describe('mensagens', () => {
    it('responde por stream e grava a pergunta e a resposta', async () => {
      const conversa = await criarConversa();
      const { res, eventos } = await enviar(conversa._id, 'Olá');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      const texto = eventos
        .filter((e) => e.type === 'token')
        .map((e) => e.content)
        .join('');
      expect(texto).toBe('Resposta simulada.');
      expect(eventos.at(-1)).toEqual({ type: 'done' });

      const salva = await req(tokenAdmin).get(`/ia/conversas/${conversa._id}`);
      expect(salva.body.data.mensagens.map((m) => [m.role, m.content])).toEqual(
        [
          ['user', 'Olá'],
          ['assistant', 'Resposta simulada.'],
        ],
      );
    });

    it('consulta os dados pelo MCP quando o modelo chama uma ferramenta', async () => {
      gemini.responderCom((corpo) => {
        const resposta = partesRecebidas(corpo).find(
          (parte) => parte['functionResponse'],
        );
        if (resposta) return [{ text: 'Consultei as categorias.' }];
        const ferramenta = nomesDasFerramentas(corpo).find((nome) =>
          nome.includes('buscarCategorias'),
        );
        return [{ functionCall: { name: ferramenta, args: {} } }];
      });

      const conversa = await criarConversa();
      const { eventos } = await enviar(conversa._id, 'Quais categorias?');

      expect(eventos.at(-1)).toEqual({ type: 'done' });
      expect(
        eventos
          .filter((e) => e.type === 'token')
          .map((e) => e.content)
          .join(''),
      ).toBe('Consultei as categorias.');

      const segundaChamada = gemini.chamadas.at(-1)!;
      const resultado = partesRecebidas(segundaChamada).find(
        (parte) => parte['functionResponse'],
      );
      expect(JSON.stringify(resultado)).toContain('itens_ativos');
    });

    it('avisa o erro e não grava a pergunta quando o modelo falha', async () => {
      gemini.responderCom(() => {
        throw new Error('falha simulada');
      });
      const conversa = await criarConversa();
      const { eventos } = await enviar(conversa._id, 'Olá');

      expect(eventos.at(-1)?.type).toBe('error');
      const salva = await req(tokenAdmin).get(`/ia/conversas/${conversa._id}`);
      expect(salva.body.data.mensagens).toEqual([]);
    });

    it('recusa mensagem vazia ou só com caracteres invisíveis', async () => {
      const conversa = await criarConversa();
      esperarEnvelopeErro((await enviar(conversa._id, '')).res, 400);
      esperarEnvelopeErro((await enviar(conversa._id, '​ ​')).res, 400);
      expect(gemini.chamadas).toHaveLength(0);
    });

    it('recusa mensagem acima de 2000 caracteres', async () => {
      const conversa = await criarConversa();
      esperarEnvelopeErro(
        (await enviar(conversa._id, 'a'.repeat(2001))).res,
        400,
      );
    });

    it('responde 404 para conversa inexistente', async () => {
      esperarEnvelopeErro((await enviar(ID_INEXISTENTE, 'Olá')).res, 404);
    });
  });
});
