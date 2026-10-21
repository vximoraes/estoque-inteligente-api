import MovimentacaoRepository from '../../../modules/movimentacao/MovimentacaoRepository.js';
import { fusoDoUsuario } from '../fusoDoUsuario.js';
import type { AuthenticatedRequest } from '../../../utils/types.js';

export async function resumoMovimentacoes(
  {
    tipo,
    dataInicio,
    dataFim,
    itemNome,
    localizacao,
  }: {
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
    itemNome?: string;
    localizacao?: string;
  },
  usuarioId: string,
) {
  const requisicao = {
    query: {
      tipo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      item: itemNome,
      localizacao,
    },
    fuso_horario: await fusoDoUsuario(usuarioId),
  } as unknown as AuthenticatedRequest;

  const resumo = await new MovimentacaoRepository().resumo(requisicao);
  return {
    periodo: { inicio: dataInicio ?? null, fim: dataFim ?? null },
    ...resumo,
  };
}
