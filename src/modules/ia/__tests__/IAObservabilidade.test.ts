jest.mock('@langfuse/langchain', () => ({
  CallbackHandler: jest.fn(),
}));

jest.mock('@langfuse/tracing', () => ({
  propagateAttributes: jest.fn((_atributos, executar) => executar()),
  startActiveObservation: jest.fn((_nome, executar) => executar(mockSpan)),
}));

const mockSpan = { update: jest.fn() };

function carregar(comLangfuse: boolean) {
  if (comLangfuse) {
    process.env['LANGFUSE_PUBLIC_KEY'] = 'pk';
    process.env['LANGFUSE_SECRET_KEY'] = 'sk';
  } else {
    delete process.env['LANGFUSE_PUBLIC_KEY'];
    delete process.env['LANGFUSE_SECRET_KEY'];
  }
  let modulo;
  jest.isolateModules(() => {
    modulo = require('../IAObservabilidade.js');
  });
  return modulo;
}

function respostaJson(corpo: unknown) {
  return { json: async () => corpo };
}

describe('IAObservabilidade', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.clearAllMocks();
    delete process.env['LANGFUSE_PUBLIC_KEY'];
    delete process.env['LANGFUSE_SECRET_KEY'];
  });

  describe('sem Langfuse configurado', () => {
    it('executa sem trace, sem callbacks e sem chamar a rede', async () => {
      const { comTrace, criarCallbacks, suprimirPrecosNativosDoLangfuse } =
        carregar(false);
      global.fetch = jest.fn();
      const executar = jest.fn(async (registrar) =>
        registrar({ model: 'm', usageDetails: {}, costDetails: null }),
      );

      await comTrace({ usuarioId: 'u', conversaId: 'c' }, executar);
      await suprimirPrecosNativosDoLangfuse();

      expect(executar).toHaveBeenCalled();
      expect(criarCallbacks()).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('com Langfuse configurado', () => {
    it('grava o custo no span ao final do trace', async () => {
      const { comTrace, criarCallbacks } = carregar(true);
      const custo = {
        model: 'gemini-3.5-flash-lite',
        usageDetails: { input: 10 },
        costDetails: { input: 0.1 },
      };

      await comTrace({ usuarioId: 'u', conversaId: 'c' }, async (registrar) =>
        registrar(custo),
      );

      expect(mockSpan.update).toHaveBeenCalledWith(custo);
      expect(criarCallbacks()).toHaveLength(1);
    });

    it('não grava custo quando nada foi registrado', async () => {
      const { comTrace } = carregar(true);
      await comTrace({ usuarioId: 'u', conversaId: 'c' }, async () => {});
      expect(mockSpan.update).not.toHaveBeenCalled();
    });

    it('cadastra preço zero só para os modelos que ainda não existem', async () => {
      const { suprimirPrecosNativosDoLangfuse } = carregar(true);
      const chamadas: Array<{ url: string; corpo?: string }> = [];
      global.fetch = jest.fn(async (url, opcoes) => {
        chamadas.push({ url: String(url), corpo: opcoes?.body as string });
        if (String(url).includes('page=1')) {
          return respostaJson({
            data: [{ modelName: 'gemini-2.5-flash', isLangfuseManaged: false }],
            meta: { totalPages: 2 },
          });
        }
        if (String(url).includes('page=2')) {
          return respostaJson({
            data: [{ modelName: 'gemini-3.5-flash', isLangfuseManaged: true }],
            meta: { totalPages: 2 },
          });
        }
        return respostaJson({});
      }) as unknown as typeof fetch;

      await suprimirPrecosNativosDoLangfuse();

      const criados = chamadas
        .filter((c) => c.corpo)
        .map((c) => JSON.parse(c.corpo!).modelName);
      expect(criados).not.toContain('gemini-2.5-flash');
      expect(criados).toContain('gemini-3.5-flash');
      expect(criados).toContain('gemini-3.5-flash-lite');
    });

    it('só avisa no log quando o Langfuse está fora do ar', async () => {
      const { suprimirPrecosNativosDoLangfuse } = carregar(true);
      global.fetch = jest.fn(async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch;

      await expect(suprimirPrecosNativosDoLangfuse()).resolves.toBeUndefined();
    });
  });
});
