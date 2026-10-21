import { TZDate } from '@date-fns/tz';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { FUSO_PADRAO } from './fusoHorario.js';

const MESES_MAX = 60;

export interface JanelaMensalQuery {
  meses?: number | undefined;
  data_inicio?: Date | undefined;
  data_fim?: Date | undefined;
  fuso?: string | undefined;
}

export interface JanelaMensal {
  dataInicio: Date;
  dataFim: Date;
  chavesMes: string[];
}

// Resolve a janela de agregação mensal de um relatório de tendência: usa
// `data_inicio`/`data_fim` (período personalizado) quando presentes,
// senão cai para os últimos N `meses` (atalho, default 12) a partir de
// hoje. Sempre retorna as chaves "YYYY-MM" da janela, no fuso do usuário,
// para o Service preencher com zero os meses sem movimentação/empréstimo.
export function resolverJanelaMensal(query: JanelaMensalQuery): JanelaMensal {
  const fuso = query.fuso ?? FUSO_PADRAO;
  const dataFim = query.data_fim ?? new Date();
  const fimNoFuso = new TZDate(dataFim, fuso);

  let dataInicio: Date;
  if (query.data_inicio) {
    dataInicio = query.data_inicio;
  } else {
    const meses = query.data_fim ? 12 : (query.meses ?? 12);
    dataInicio = new Date(
      startOfMonth(subMonths(fimNoFuso, meses - 1)).getTime(),
    );
  }

  const chavesMes: string[] = [];
  const limite = format(fimNoFuso, 'yyyy-MM');
  let cursor = startOfMonth(new TZDate(dataInicio, fuso));
  while (format(cursor, 'yyyy-MM') <= limite && chavesMes.length < MESES_MAX) {
    chavesMes.push(format(cursor, 'yyyy-MM'));
    cursor = addMonths(cursor, 1);
  }

  return { dataInicio, dataFim, chavesMes };
}
