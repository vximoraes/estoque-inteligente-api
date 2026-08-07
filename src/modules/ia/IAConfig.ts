export const MODELO = process.env['GEMINI_MODEL'] ?? 'gemini-3.5-flash-lite';

export const MAX_OUTPUT_TOKENS = Number(
  process.env['IA_MAX_OUTPUT_TOKENS'] ?? 1536,
);

// gemini-3.5-flash-lite rejeita thinkingBudget: 0 com 400 Bad Request (INVALID_ARGUMENT) —
// confirmado direto na API. Aceita -1 (dinâmico) ou um orçamento fixo positivo.
// 512 é o menor valor testado que a API aceita sem erro para esse modelo.
export const THINKING_BUDGET = Number(process.env['IA_THINKING_BUDGET'] ?? 512);

export const RECURSION_LIMIT = Number(process.env['IA_RECURSION_LIMIT'] ?? 8);

export const TIMEOUT_MS = Number(process.env['IA_TIMEOUT_MS'] ?? 120_000);

export const MAX_RETRIES = 1;

export const MAX_STREAMS_SIMULTANEOS = Number(
  process.env['IA_MAX_STREAMS_SIMULTANEOS'] ?? 2,
);

interface PrecoModelo {
  entradaUsdPorMilhao: number;
  saidaUsdPorMilhao: number;
}

export const PRECOS: Record<string, PrecoModelo> = {
  'gemini-3.5-flash-lite': { entradaUsdPorMilhao: 0.3, saidaUsdPorMilhao: 2.5 },
  'gemini-2.5-flash': { entradaUsdPorMilhao: 0.3, saidaUsdPorMilhao: 2.5 },
  'gemini-2.5-flash-lite': { entradaUsdPorMilhao: 0.1, saidaUsdPorMilhao: 0.4 },
  'gemini-3.5-flash': { entradaUsdPorMilhao: 1.5, saidaUsdPorMilhao: 9.0 },
};
