import { CallbackHandler } from '@langfuse/langchain';
import { startActiveObservation, propagateAttributes } from '@langfuse/tracing';
import { PRECOS } from './IAConfig.js';
import logger from '../../utils/logger.js';

const ATIVO = Boolean(
  process.env['LANGFUSE_PUBLIC_KEY'] && process.env['LANGFUSE_SECRET_KEY'],
);

export async function suprimirPrecosNativosDoLangfuse(): Promise<void> {
  if (!ATIVO) return;

  const publicKey = process.env['LANGFUSE_PUBLIC_KEY'] as string;
  const secretKey = process.env['LANGFUSE_SECRET_KEY'] as string;
  const baseUrl = process.env['LANGFUSE_BASE_URL'] ?? 'http://localhost:3002';
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

  try {
    const existentes = new Set<string>();
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const res = await fetch(
        `${baseUrl}/api/public/models?page=${pagina}&limit=100`,
        {
          headers: { Authorization: `Basic ${auth}` },
        },
      );
      const json = (await res.json()) as {
        data?: Array<{ modelName: string; isLangfuseManaged: boolean }>;
        meta?: { totalPages?: number };
      };
      for (const modelo of json.data ?? []) {
        if (!modelo.isLangfuseManaged) existentes.add(modelo.modelName);
      }
      totalPaginas = json.meta?.totalPages ?? 1;
      pagina += 1;
    } while (pagina <= totalPaginas);

    for (const modelo of Object.keys(PRECOS)) {
      if (existentes.has(modelo)) continue;

      await fetch(`${baseUrl}/api/public/models`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelName: modelo,
          matchPattern: `(?i)^${modelo.replace(/\./g, '\\.')}$`,
          unit: 'TOKENS',
          inputPrice: 0,
          outputPrice: 0,
        }),
      });
    }
  } catch (err) {
    logger.warn(
      { message: (err as Error)?.message },
      'Falha ao suprimir preços nativos do Langfuse: custo pode aparecer em dobro no dashboard.',
    );
  }
}

export interface CustoTrace {
  model: string;
  usageDetails: Record<string, number>;
  costDetails: Record<string, number> | null;
}

export function criarCallbacks() {
  return ATIVO ? [new CallbackHandler()] : undefined;
}

export async function comTrace(
  contexto: { usuarioId: string; conversaId: string },
  executar: (registrarCusto: (custo: CustoTrace) => void) => Promise<void>,
): Promise<void> {
  if (!ATIVO) {
    await executar(() => {});
    return;
  }

  await propagateAttributes(
    {
      userId: contexto.usuarioId,
      sessionId: contexto.conversaId,
      traceName: 'chat-estoque',
    },
    () =>
      startActiveObservation(
        'chat-estoque',
        async (span) => {
          let custo: CustoTrace | null = null;
          try {
            await executar((c) => {
              custo = c;
            });
          } finally {
            if (custo) span.update(custo);
          }
        },
        { asType: 'generation' },
      ),
  );
}
