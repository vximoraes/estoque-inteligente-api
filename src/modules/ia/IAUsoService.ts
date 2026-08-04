import IAUsoModel, { type FinalizadoPor } from './IAUsoModel.js';
import { PRECOS } from './IAConfig.js';
import logger from '../../utils/logger.js';

export interface RegistrarUsoInput {
  usuarioId: string;
  conversaId: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  tokensTotais: number;
  tokensCacheLeitura: number;
  passosLlm: number;
  ferramentasChamadas: number;
  duracaoMs: number;
  finalizadoPor: FinalizadoPor;
}

function calcularCustoUsd(
  modelo: string,
  tokensEntrada: number,
  tokensSaidaFaturavel: number,
): number {
  const preco = PRECOS[modelo];
  if (!preco) return 0;
  return (
    (tokensEntrada / 1_000_000) * preco.entradaUsdPorMilhao +
    (tokensSaidaFaturavel / 1_000_000) * preco.saidaUsdPorMilhao
  );
}

export async function registrarUso(input: RegistrarUsoInput): Promise<void> {
  try {
    const tokensPensamento = Math.max(
      0,
      input.tokensTotais - input.tokensEntrada - input.tokensSaida,
    );
    const tokensSaidaFaturavel = input.tokensSaida + tokensPensamento;

    await IAUsoModel.create({
      usuario: input.usuarioId,
      conversa: input.conversaId,
      modelo: input.modelo,
      tokens_entrada: input.tokensEntrada,
      tokens_saida: input.tokensSaida,
      tokens_totais: input.tokensTotais,
      tokens_pensamento: tokensPensamento,
      tokens_cache_leitura: input.tokensCacheLeitura,
      custo_estimado_usd: calcularCustoUsd(
        input.modelo,
        input.tokensEntrada,
        tokensSaidaFaturavel,
      ),
      passos_llm: input.passosLlm,
      ferramentas_chamadas: input.ferramentasChamadas,
      duracao_ms: input.duracaoMs,
      finalizado_por: input.finalizadoPor,
    });
  } catch (err) {
    const error = err as Error;
    logger.warn({ message: error?.message }, 'Falha ao registrar uso de IA:');
  }
}

export async function tokensUsadosHoje(usuarioId: string): Promise<number> {
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const resultado = await IAUsoModel.aggregate<{ total: number }>([
    {
      $match: {
        usuario: usuarioId,
        criado_em: { $gte: inicioDoDia },
      },
    },
    { $group: { _id: null, total: { $sum: '$tokens_totais' } } },
  ]);

  return resultado[0]?.total ?? 0;
}
