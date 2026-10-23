import http from 'node:http';

type Parte = Record<string, unknown>;
type CorpoGemini = {
  contents?: Array<{ role?: string; parts?: Parte[] }>;
  tools?: Array<{ functionDeclarations?: Array<{ name: string }> }>;
};
type Responder = (corpo: CorpoGemini) => Parte[];

export const respostaDeTexto =
  (texto: string): Responder =>
  () => [{ text: texto }];

export function partesRecebidas(corpo: CorpoGemini): Parte[] {
  return (corpo.contents ?? []).flatMap((conteudo) => conteudo.parts ?? []);
}

export function nomesDasFerramentas(corpo: CorpoGemini): string[] {
  return (corpo.tools ?? []).flatMap((ferramenta) =>
    (ferramenta.functionDeclarations ?? []).map(
      (declaracao) => declaracao.name,
    ),
  );
}

export function criarGeminiFalso() {
  let responder: Responder = respostaDeTexto('Resposta simulada.');
  const chamadas: CorpoGemini[] = [];

  const servidor = http.createServer((requisicao, resposta) => {
    let dados = '';
    requisicao.on('data', (pedaco) => (dados += pedaco));
    requisicao.on('end', () => {
      const corpo = JSON.parse(dados || '{}') as CorpoGemini;
      chamadas.push(corpo);
      let partes: Parte[];
      try {
        partes = responder(corpo);
      } catch {
        resposta.writeHead(500, { 'Content-Type': 'application/json' });
        resposta.end(
          JSON.stringify({ error: { code: 500, status: 'INTERNAL' } }),
        );
        return;
      }
      const candidato = {
        candidates: [
          {
            content: { role: 'model', parts: partes },
            finishReason: 'STOP',
            index: 0,
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      };

      if (requisicao.url?.includes(':streamGenerateContent')) {
        resposta.writeHead(200, { 'Content-Type': 'text/event-stream' });
        resposta.end(`data: ${JSON.stringify(candidato)}\n\n`);
        return;
      }
      resposta.writeHead(200, { 'Content-Type': 'application/json' });
      resposta.end(JSON.stringify(candidato));
    });
  });

  return {
    chamadas,
    responderCom(novo: Responder) {
      responder = novo;
    },
    iniciar: () =>
      new Promise<void>((resolve) =>
        servidor.listen(
          Number(process.env['ROUTES_TEST_GEMINI_PORT'] || 3013),
          resolve,
        ),
      ),
    parar: () =>
      new Promise<void>((resolve) => {
        servidor.close(() => resolve());
        servidor.closeAllConnections();
      }),
  };
}
