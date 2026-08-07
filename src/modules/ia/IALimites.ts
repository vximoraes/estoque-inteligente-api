import { MAX_STREAMS_SIMULTANEOS } from './IAConfig.js';

const streamsEmAndamento = new Map<string, number>();

export function iniciarStream(usuarioId: string): boolean {
  const atual = streamsEmAndamento.get(usuarioId) ?? 0;
  if (atual >= MAX_STREAMS_SIMULTANEOS) return false;
  streamsEmAndamento.set(usuarioId, atual + 1);
  return true;
}

export function finalizarStream(usuarioId: string): void {
  const atual = streamsEmAndamento.get(usuarioId) ?? 0;
  if (atual <= 1) {
    streamsEmAndamento.delete(usuarioId);
  } else {
    streamsEmAndamento.set(usuarioId, atual - 1);
  }
}
