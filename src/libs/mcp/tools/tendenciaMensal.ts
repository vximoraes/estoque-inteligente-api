import MovimentacaoRepository from '../../../modules/movimentacao/MovimentacaoRepository.js';
import EmprestimoRepository from '../../../modules/emprestimo/EmprestimoRepository.js';
import { fusoDoUsuario } from '../fusoDoUsuario.js';
import type { AuthenticatedRequest } from '../../../utils/types.js';

export async function tendenciaMensal(
  {
    meses,
    dataInicio,
    dataFim,
  }: { meses?: number; dataInicio?: string; dataFim?: string },
  usuarioId: string,
) {
  const requisicao = {
    query: {
      meses: meses ? String(meses) : undefined,
      data_inicio: dataInicio,
      data_fim: dataFim,
    },
    fuso_horario: await fusoDoUsuario(usuarioId),
  } as unknown as AuthenticatedRequest;

  const [movimentacoes, emprestimos] = await Promise.all([
    new MovimentacaoRepository().tendencia(requisicao),
    new EmprestimoRepository().tendencia(requisicao),
  ]);

  const emprestimosPorMes = new Map(
    emprestimos.map((ponto) => [ponto.mes, ponto]),
  );
  return movimentacoes.map((ponto) => ({
    ...ponto,
    emprestimos: emprestimosPorMes.get(ponto.mes)?.emprestimos ?? 0,
    devolucoes: emprestimosPorMes.get(ponto.mes)?.devolucoes ?? 0,
  }));
}
