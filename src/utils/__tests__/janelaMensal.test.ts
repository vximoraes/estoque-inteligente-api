import { resolverJanelaMensal } from '../janelaMensal.js';

describe('resolverJanelaMensal', () => {
  it('usa 12 meses por padrão quando nada é informado', () => {
    const { chavesMes, dataInicio, dataFim } = resolverJanelaMensal({});
    expect(chavesMes).toHaveLength(12);
    expect(dataInicio.getUTCDate()).toBe(1);
    expect(dataFim.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('usa o atalho `meses` quando informado', () => {
    const { chavesMes } = resolverJanelaMensal({ meses: 6 });
    expect(chavesMes).toHaveLength(6);
  });

  it('prioriza data_inicio/data_fim sobre meses', () => {
    const dataInicio = new Date(Date.UTC(2026, 0, 15));
    const dataFim = new Date(Date.UTC(2026, 2, 10));
    const resultado = resolverJanelaMensal({
      meses: 24,
      data_inicio: dataInicio,
      data_fim: dataFim,
    });

    expect(resultado.chavesMes).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('completa data_fim como agora quando só data_inicio é informada', () => {
    const dataInicio = new Date();
    dataInicio.setUTCMonth(dataInicio.getUTCMonth() - 2);
    const resultado = resolverJanelaMensal({ data_inicio: dataInicio });

    expect(resultado.chavesMes).toHaveLength(3);
    expect(resultado.dataFim.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('completa data_inicio como 11 meses antes de data_fim quando só data_fim é informada', () => {
    const dataFim = new Date(Date.UTC(2026, 5, 15));
    const resultado = resolverJanelaMensal({ data_fim: dataFim });

    expect(resultado.chavesMes).toHaveLength(12);
    expect(resultado.chavesMes[resultado.chavesMes.length - 1]).toBe('2026-06');
  });

  it('mesmo mês em data_inicio e data_fim gera uma única chave', () => {
    const data = new Date(Date.UTC(2026, 3, 20));
    const resultado = resolverJanelaMensal({
      data_inicio: data,
      data_fim: data,
    });

    expect(resultado.chavesMes).toEqual(['2026-04']);
  });
});
