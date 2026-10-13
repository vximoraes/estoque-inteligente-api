import {
  contemVazamentoDoPrompt,
  montarPromptComResumo,
  calcularFatiaParaResumir,
  executarComRetentativas,
  podeUsarModeloReserva,
} from '../IAService.js';
import {
  MODELO,
  MODELO_RESERVA,
  TIMEOUT_MODELO_PRINCIPAL_MS,
} from '../IAConfig.js';

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
});

describe('calcularFatiaParaResumir', () => {
  it('retorna null quando a conversa ainda cabe inteira na janela', () => {
    expect(calcularFatiaParaResumir(10, 0)).toBeNull();
  });

  it('retorna a fatia mais antiga assim que a conversa ultrapassa a janela', () => {
    expect(calcularFatiaParaResumir(16, 0)).toEqual({ inicio: 0, fim: 1 });
  });

  it('acompanha o crescimento da conversa incrementalmente', () => {
    expect(calcularFatiaParaResumir(20, 1)).toEqual({ inicio: 1, fim: 5 });
  });

  it('retorna null quando o resumo já está em dia com a janela atual', () => {
    expect(calcularFatiaParaResumir(20, 5)).toBeNull();
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

  it('não troca quando já está no modelo reserva', () => {
    expect(podeUsarModeloReserva(MODELO_RESERVA, erroComStatus(503))).toBe(
      false,
    );
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

  it('propaga o erro quando o modelo reserva também está indisponível', async () => {
    const criarStream = jest.fn(async function* () {
      yield* [];
      throw erroComStatus(503);
    });

    await expect(
      coletar(executarComRetentativas(criarStream, jest.fn())),
    ).rejects.toThrow('503');
    expect(criarStream).toHaveBeenCalledTimes(2);
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
});
