const MESES_MAX = 60;

export interface JanelaMensalQuery {
  meses?: number | undefined;
  data_inicio?: Date | undefined;
  data_fim?: Date | undefined;
}

export interface JanelaMensal {
  dataInicio: Date;
  dataFim: Date;
  chavesMes: string[];
}

function inicioDoMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

// Resolve a janela de agregação mensal de um relatório de tendência: usa
// `data_inicio`/`data_fim` (período personalizado) quando presentes,
// senão cai para os últimos N `meses` (atalho, default 12) a partir de
// hoje. Sempre retorna as chaves "YYYY-MM" da janela, para o Service
// preencher com zero os meses sem movimentação/empréstimo.
export function resolverJanelaMensal(query: JanelaMensalQuery): JanelaMensal {
  let dataInicio: Date;
  let dataFim: Date;

  if (query.data_inicio || query.data_fim) {
    dataFim = query.data_fim ?? new Date();
    if (query.data_inicio) {
      dataInicio = query.data_inicio;
    } else {
      dataInicio = new Date(dataFim);
      dataInicio.setUTCMonth(dataInicio.getUTCMonth() - 11);
    }
  } else {
    const meses = query.meses ?? 12;
    dataFim = new Date();
    dataInicio = new Date();
    dataInicio.setUTCMonth(dataInicio.getUTCMonth() - (meses - 1));
    dataInicio.setUTCDate(1);
    dataInicio.setUTCHours(0, 0, 0, 0);
  }

  const chavesMes: string[] = [];
  const cursor = inicioDoMes(dataInicio);
  const limite = inicioDoMes(dataFim);
  while (cursor <= limite && chavesMes.length < MESES_MAX) {
    chavesMes.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return { dataInicio, dataFim, chavesMes };
}
