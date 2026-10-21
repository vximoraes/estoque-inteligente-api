import {
  dataHoraPorExtenso,
  diaNoFuso,
  fimDoDia,
  formatarDataHora,
  fusoValido,
  inicioDoDia,
  limiteDeData,
  resolverFuso,
} from '../fusoHorario.js';

describe('fusoHorario', () => {
  it('inicioDoDia e fimDoDia cobrem o dia inteiro no fuso informado', () => {
    expect(inicioDoDia('2026-10-20', 'America/Porto_Velho').toISOString()).toBe(
      '2026-10-20T04:00:00.000Z',
    );
    expect(fimDoDia('2026-10-20', 'America/Porto_Velho').toISOString()).toBe(
      '2026-10-21T03:59:59.999Z',
    );
    expect(inicioDoDia('2026-10-20', 'Asia/Tokyo').toISOString()).toBe(
      '2026-10-19T15:00:00.000Z',
    );
    expect(inicioDoDia('2026-10-20', 'UTC').toISOString()).toBe(
      '2026-10-20T00:00:00.000Z',
    );
  });

  it('respeita horário de verão', () => {
    expect(inicioDoDia('2026-07-01', 'Europe/Lisbon').toISOString()).toBe(
      '2026-06-30T23:00:00.000Z',
    );
    expect(inicioDoDia('2026-12-01', 'Europe/Lisbon').toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
  });

  it('limiteDeData trata YYYY-MM-DD como dia no fuso e mantém data com hora', () => {
    expect(
      limiteDeData('2026-10-20', 'fim', 'America/Porto_Velho')?.toISOString(),
    ).toBe('2026-10-21T03:59:59.999Z');
    expect(
      limiteDeData('2026-10-20T10:00:00Z', 'fim', 'Asia/Tokyo')?.toISOString(),
    ).toBe('2026-10-20T10:00:00.000Z');
    expect(limiteDeData(undefined, 'inicio', 'UTC')).toBeUndefined();
    expect(limiteDeData('ontem', 'inicio', 'UTC')).toBeUndefined();
  });

  it('diaNoFuso devolve o dia no fuso, não o dia UTC', () => {
    const instante = new Date('2026-10-21T02:30:00.000Z');
    expect(diaNoFuso(instante, 'America/Porto_Velho')).toBe('2026-10-20');
    expect(diaNoFuso(instante, 'UTC')).toBe('2026-10-21');
  });

  it('fusoValido e resolverFuso aceitam só identificadores IANA, com UTC como padrão', () => {
    expect(fusoValido('America/Sao_Paulo')).toBe(true);
    expect(fusoValido('Marte/Olympus')).toBe(false);
    expect(fusoValido('')).toBe(false);
    expect(fusoValido(null)).toBe(false);
    expect(resolverFuso('Asia/Tokyo')).toBe('Asia/Tokyo');
    expect(resolverFuso(undefined)).toBe('UTC');
    expect(resolverFuso('invalido')).toBe('UTC');
  });

  it('formatarDataHora e dataHoraPorExtenso mostram a hora local e o deslocamento', () => {
    const instante = new Date('2026-10-21T15:05:00.000Z');
    expect(formatarDataHora(instante, 'America/Porto_Velho')).toBe(
      '21/10/2026, 11:05 (UTC-04:00)',
    );
    const texto = dataHoraPorExtenso(instante, 'America/Porto_Velho');
    expect(texto).toContain('quarta-feira, 21/10/2026, 11:05');
    expect(texto).toContain('America/Porto_Velho');
    expect(texto).toContain('UTC-04:00');
  });
});
