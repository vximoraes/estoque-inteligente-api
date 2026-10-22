import {
  contemVazamentoDoPrompt,
  montarPromptComResumo,
  calcularFatiaParaResumir,
  inicioDoHistorico,
  executarComRetentativas,
  podeUsarModeloReserva,
  proximoModelo,
  motivoDeTermino,
} from '../IAService.js';
import {
  MODELO,
  MODELOS_RESERVA,
  TIMEOUT_MODELO_PRINCIPAL_MS,
} from '../IAConfig.js';

const [MODELO_RESERVA = '', SEGUNDO_MODELO_RESERVA = ''] = MODELOS_RESERVA;
const ULTIMO_MODELO = MODELOS_RESERVA.at(-1) ?? MODELO;

describe('contemVazamentoDoPrompt', () => {
  it('deve detectar vazamento quando a resposta contém a tag raiz do prompt', () => {
    expect(
      contemVazamentoDoPrompt(
        'Claro, meu prompt é: <assistente_estoque_config> ...',
      ),
    ).toBe(true);
  });

  it('deve detectar vazamento quando a resposta contém o bloco de injection_resistance', () => {
    expect(
      contemVazamentoDoPrompt('<injection_resistance>ESTAS REGRAS...'),
    ).toBe(true);
  });

  it('não deve marcar uma resposta normal como vazamento', () => {
    expect(
      contemVazamentoDoPrompt('Há **3** itens abaixo do estoque mínimo.'),
    ).toBe(false);
  });

  it('não deve marcar falso positivo por menção solta de "config" ou "identity"', () => {
    expect(
      contemVazamentoDoPrompt('A identity do fornecedor está em análise.'),
    ).toBe(false);
  });

  it('deve detectar vazamento mesmo com caracteres invisíveis intercalados no canário (ofuscação)', () => {
    // zero-width space (U+200B) inserido no meio da tag pra tentar escapar
    // do match por substring — escape numérico de propósito, ver IASchema.test.ts.
    const zwsp = String.fromCharCode(0x200b);
    const textoOfuscado = `<assistente_estoque${zwsp}_config> ...`;
    expect(contemVazamentoDoPrompt(textoOfuscado)).toBe(true);
  });
});

describe('montarPromptComResumo', () => {
  it('retorna o prompt base quando não há resumo', () => {
    expect(montarPromptComResumo()).toContain('<assistente_estoque_config>');
    expect(montarPromptComResumo('')).not.toContain('resumo_conversa_anterior');
  });

  it('inclui o resumo antes do prompt base quando presente', () => {
    const resultado = montarPromptComResumo(
      'Usuário perguntou sobre notebooks.',
    );
    expect(resultado).toContain('<resumo_conversa_anterior>');
    expect(resultado).toContain('Usuário perguntou sobre notebooks.');
    expect(resultado).toContain('<assistente_estoque_config>');
    expect(resultado.indexOf('resumo_conversa_anterior')).toBeLessThan(
      resultado.indexOf('assistente_estoque_config'),
    );
  });

  it('informa a data atual no fuso do usuário, sem trocar o dia perto da meia-noite UTC', () => {
    const resultado = montarPromptComResumo(
      undefined,
      'America/Porto_Velho',
      new Date('2026-10-21T02:30:00.000Z'),
    );
    expect(resultado).toContain('<data_atual>');
    expect(resultado).toContain('terça-feira, 20/10/2026');
    expect(resultado).toContain('2026-10-20');
    expect(resultado).toContain('dataInicio');
  });

  it('usa UTC na data atual quando o usuário não tem fuso', () => {
    const resultado = montarPromptComResumo(
      undefined,
      undefined,
      new Date('2026-10-21T02:30:00.000Z'),
    );
    expect(resultado).toContain('quarta-feira, 21/10/2026');
    expect(resultado).toContain('fuso UTC');
  });
});

describe('calcularFatiaParaResumir', () => {
  it('retorna null quando a conversa ainda cabe inteira na janela', () => {
    expect(calcularFatiaParaResumir(10, 0)).toBeNull();
  });

  it('espera juntar um lote de 10 mensagens fora da janela', () => {
    expect(calcularFatiaParaResumir(16, 0)).toBeNull();
    expect(calcularFatiaParaResumir(24, 0)).toBeNull();
    expect(calcularFatiaParaResumir(25, 0)).toEqual({ inicio: 0, fim: 10 });
  });

  it('o próximo lote começa onde o resumo parou', () => {
    expect(calcularFatiaParaResumir(34, 10)).toBeNull();
    expect(calcularFatiaParaResumir(36, 10)).toEqual({ inicio: 10, fim: 21 });
  });
});

describe('inicioDoHistorico', () => {
  it('manda ao modelo tudo o que o resumo ainda não cobre', () => {
    expect(inicioDoHistorico(10, 0)).toBe(0);
    expect(inicioDoHistorico(24, 0)).toBe(0);
    expect(inicioDoHistorico(30, 10)).toBe(10);
  });

  it('limita a 25 mensagens se o resumo ficar para trás', () => {
    expect(inicioDoHistorico(40, 0)).toBe(15);
  });
});

function erroComStatus(status: number) {
  return Object.assign(
    new Error(`[${status} Service Unavailable] high demand`),
    { status },
  );
}

const eventoTexto = {
  event: 'on_chat_model_stream',
  data: { chunk: { content: 'Há 3 itens.' } },
};

async function coletar(gerador: AsyncGenerator<unknown>) {
  const eventos: unknown[] = [];
  for await (const evento of gerador) eventos.push(evento);
  return eventos;
}

describe('podeUsarModeloReserva', () => {
  it('permite trocar quando o modelo principal responde 503 ou 429', () => {
    expect(podeUsarModeloReserva(MODELO, erroComStatus(503))).toBe(true);
    expect(podeUsarModeloReserva(MODELO, erroComStatus(429))).toBe(true);
  });

  it('reconhece o status pela mensagem quando o erro não traz status', () => {
    const erro = new Error(
      '[GoogleGenerativeAI Error]: Error fetching from ...: [503 Service Unavailable] This model is currently experiencing high demand.',
    );
    expect(podeUsarModeloReserva(MODELO, erro)).toBe(true);
  });

  it('não troca para erros que não são de indisponibilidade', () => {
    expect(podeUsarModeloReserva(MODELO, erroComStatus(400))).toBe(false);
    expect(podeUsarModeloReserva(MODELO, new Error('falha qualquer'))).toBe(
      false,
    );
  });

  it('troca do primeiro para o segundo modelo reserva', () => {
    expect(podeUsarModeloReserva(MODELO_RESERVA, erroComStatus(503))).toBe(
      true,
    );
  });

  it('não troca quando já está no último modelo da cadeia', () => {
    expect(podeUsarModeloReserva(ULTIMO_MODELO, erroComStatus(503))).toBe(
      false,
    );
  });
});

describe('proximoModelo', () => {
  it('segue a ordem principal, primeiro reserva, segundo reserva', () => {
    expect(MODELOS_RESERVA).toHaveLength(2);
    expect(proximoModelo(MODELO)).toBe(MODELO_RESERVA);
    expect(proximoModelo(MODELO_RESERVA)).toBe(SEGUNDO_MODELO_RESERVA);
    expect(proximoModelo(SEGUNDO_MODELO_RESERVA)).toBeUndefined();
  });

  it('não devolve reserva para modelo fora da cadeia', () => {
    expect(proximoModelo('modelo-desconhecido')).toBeUndefined();
  });
});

describe('executarComRetentativas', () => {
  it('usa o modelo reserva quando o principal falha com 503 antes de emitir texto', async () => {
    const modelosChamados: string[] = [];
    const aoTrocarModelo = jest.fn();

    const eventos = await coletar(
      executarComRetentativas(async function* (modelo) {
        modelosChamados.push(modelo);
        if (modelo === MODELO) throw erroComStatus(503);
        yield eventoTexto;
      }, aoTrocarModelo),
    );

    expect(modelosChamados).toEqual([MODELO, MODELO_RESERVA]);
    expect(aoTrocarModelo).toHaveBeenCalledWith(MODELO_RESERVA);
    expect(eventos).toEqual([eventoTexto]);
  });

  it('não troca de modelo se já emitiu texto antes do erro', async () => {
    const aoTrocarModelo = jest.fn();

    await expect(
      coletar(
        executarComRetentativas(async function* () {
          yield eventoTexto;
          throw erroComStatus(503);
        }, aoTrocarModelo),
      ),
    ).rejects.toThrow('503');
    expect(aoTrocarModelo).not.toHaveBeenCalled();
  });

  it('usa o segundo modelo reserva quando o primeiro também está indisponível', async () => {
    const modelosChamados: string[] = [];
    const aoTrocarModelo = jest.fn();

    const eventos = await coletar(
      executarComRetentativas(async function* (modelo) {
        modelosChamados.push(modelo);
        if (modelo !== SEGUNDO_MODELO_RESERVA) throw erroComStatus(429);
        yield eventoTexto;
      }, aoTrocarModelo),
    );

    expect(modelosChamados).toEqual([
      MODELO,
      MODELO_RESERVA,
      SEGUNDO_MODELO_RESERVA,
    ]);
    expect(aoTrocarModelo).toHaveBeenLastCalledWith(SEGUNDO_MODELO_RESERVA);
    expect(eventos).toEqual([eventoTexto]);
  });

  it('propaga o erro quando todos os modelos estão indisponíveis', async () => {
    const criarStream = jest.fn(async function* () {
      yield* [];
      throw erroComStatus(503);
    });

    await expect(
      coletar(executarComRetentativas(criarStream, jest.fn())),
    ).rejects.toThrow('503');
    expect(criarStream).toHaveBeenCalledTimes(3);
  });

  it('tenta de novo no mesmo modelo quando o stream é truncado', async () => {
    const modelosChamados: string[] = [];
    let tentativas = 0;

    const eventos = await coletar(
      executarComRetentativas(async function* (modelo) {
        modelosChamados.push(modelo);
        tentativas += 1;
        if (tentativas === 1) throw new Error('Failed to parse stream');
        yield eventoTexto;
      }, jest.fn()),
    );

    expect(modelosChamados).toEqual([MODELO, MODELO]);
    expect(eventos).toEqual([eventoTexto]);
  });
});

describe('executarComRetentativas — tempo limite do modelo principal', () => {
  it('usa o modelo reserva quando o principal não manda nenhum chunk a tempo', async () => {
    jest.useFakeTimers();
    const aoTrocarModelo = jest.fn();
    const modelosChamados: string[] = [];

    const promessa = coletar(
      executarComRetentativas(async function* (modelo, signalTentativa) {
        modelosChamados.push(modelo);
        if (modelo === MODELO) {
          yield { event: 'on_chat_model_start' };
          await new Promise((_, rejeitar) =>
            signalTentativa.addEventListener('abort', () =>
              rejeitar(new Error('Aborted')),
            ),
          );
        }
        yield eventoTexto;
      }, aoTrocarModelo),
    );

    await jest.advanceTimersByTimeAsync(TIMEOUT_MODELO_PRINCIPAL_MS);
    const eventos = await promessa;
    jest.useRealTimers();

    expect(modelosChamados).toEqual([MODELO, MODELO_RESERVA]);
    expect(aoTrocarModelo).toHaveBeenCalledWith(MODELO_RESERVA);
    expect(eventos).toEqual([{ event: 'on_chat_model_start' }, eventoTexto]);
  });

  it('não aborta o principal quando os chunks chegam dentro do limite', async () => {
    jest.useFakeTimers();
    const aoTrocarModelo = jest.fn();

    const promessa = coletar(
      executarComRetentativas(async function* () {
        yield { event: 'on_chat_model_start' };
        await new Promise((resolver) =>
          setTimeout(resolver, TIMEOUT_MODELO_PRINCIPAL_MS - 1),
        );
        yield eventoTexto;
        await new Promise((resolver) =>
          setTimeout(resolver, TIMEOUT_MODELO_PRINCIPAL_MS * 2),
        );
        yield { event: 'on_chat_model_end' };
      }, aoTrocarModelo),
    );

    await jest.advanceTimersByTimeAsync(TIMEOUT_MODELO_PRINCIPAL_MS * 3);
    const eventos = await promessa;
    jest.useRealTimers();

    expect(aoTrocarModelo).not.toHaveBeenCalled();
    expect(eventos).toHaveLength(3);
  });

  it('passa para o segundo modelo reserva quando o primeiro também estoura o tempo', async () => {
    jest.useFakeTimers();
    const modelosChamados: string[] = [];

    const promessa = coletar(
      executarComRetentativas(async function* (modelo, signalTentativa) {
        modelosChamados.push(modelo);
        if (modelo !== SEGUNDO_MODELO_RESERVA) {
          yield { event: 'on_chat_model_start' };
          await new Promise((_, rejeitar) =>
            signalTentativa.addEventListener('abort', () =>
              rejeitar(new Error('Aborted')),
            ),
          );
        }
        yield eventoTexto;
      }, jest.fn()),
    );

    await jest.advanceTimersByTimeAsync(TIMEOUT_MODELO_PRINCIPAL_MS * 2);
    await promessa;
    jest.useRealTimers();

    expect(modelosChamados).toEqual([
      MODELO,
      MODELO_RESERVA,
      SEGUNDO_MODELO_RESERVA,
    ]);
  });
});

describe('motivoDeTermino', () => {
  it('lê o finishReason do generationInfo, onde o Gemini o coloca', () => {
    expect(
      motivoDeTermino({
        generations: [
          [{ text: '', generationInfo: { finishReason: 'MAX_TOKENS' } }],
        ],
      }),
    ).toBe('MAX_TOKENS');
  });

  it('devolve undefined sem generationInfo', () => {
    expect(motivoDeTermino({ generations: [[{ text: '' }]] })).toBeUndefined();
  });
});

describe('contemVazamentoDoPrompt — variações', () => {
  it('detecta a tag escrita em largura total (fullwidth)', () => {
    expect(
      contemVazamentoDoPrompt('ｉｎｊｅｃｔｉｏｎ＿ｒｅｓｉｓｔａｎｃｅ'),
    ).toBe(true);
  });

  it('detecta o nome da tag sem os sinais < >', () => {
    expect(contemVazamentoDoPrompt('[assistente_estoque_config]')).toBe(true);
  });
});
