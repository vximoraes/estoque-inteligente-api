import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

export function padraoDeBusca(texto: string, exata: boolean) {
  const escapado = escapeRegex(texto.trim());
  return exata ? `^${escapado}$` : escapado;
}
