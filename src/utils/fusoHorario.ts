import { TZDate } from '@date-fns/tz';
import { endOfDay, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FUSO_PADRAO = 'UTC';

const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function fusoValido(fuso: unknown): fuso is string {
  if (typeof fuso !== 'string' || fuso === '') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

export function resolverFuso(fuso: unknown): string {
  return fusoValido(fuso) ? fuso : FUSO_PADRAO;
}

function diaNoFusoComoData(dia: string, fuso: string): TZDate {
  const [ano = 0, mes = 1, diaDoMes = 1] = dia.split('-').map(Number);
  return new TZDate(ano, mes - 1, diaDoMes, fuso);
}

export function inicioDoDia(dia: string, fuso: string): Date {
  return new Date(startOfDay(diaNoFusoComoData(dia, fuso)).getTime());
}

export function fimDoDia(dia: string, fuso: string): Date {
  return new Date(endOfDay(diaNoFusoComoData(dia, fuso)).getTime());
}

export function limiteDeData(
  valor: string | null | undefined,
  limite: 'inicio' | 'fim',
  fuso: string,
): Date | undefined {
  if (!valor) return undefined;
  if (DIA_ISO.test(valor)) {
    return limite === 'inicio'
      ? inicioDoDia(valor, fuso)
      : fimDoDia(valor, fuso);
  }
  const data = new Date(valor);
  return isNaN(data.getTime()) ? undefined : data;
}

export function diaNoFuso(instante: Date, fuso: string): string {
  return format(new TZDate(instante, fuso), 'yyyy-MM-dd');
}

export function formatarDataHora(instante: Date, fuso: string): string {
  const data = new TZDate(instante, fuso);
  return `${format(data, 'dd/MM/yyyy, HH:mm')} (UTC${format(data, 'xxx')})`;
}

export function dataHoraPorExtenso(instante: Date, fuso: string): string {
  const data = new TZDate(instante, fuso);
  return `${format(data, 'EEEE, dd/MM/yyyy, HH:mm', { locale: ptBR })} (${format(data, 'yyyy-MM-dd')}, fuso ${fuso}, UTC${format(data, 'xxx')})`;
}

export function instanteNoFuso(instante: Date, fuso: string): string {
  return format(new TZDate(instante, fuso), "yyyy-MM-dd'T'HH:mm:ssxxx");
}

export function diaEmUTC(instante: Date): string {
  return format(new TZDate(instante, 'UTC'), 'yyyy-MM-dd');
}
