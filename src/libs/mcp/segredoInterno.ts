import { randomBytes, timingSafeEqual } from 'crypto';

export const HEADER_SEGREDO_MCP = 'x-mcp-segredo';

export const SEGREDO_MCP_INTERNO =
  process.env['MCP_SEGREDO_INTERNO'] || randomBytes(32).toString('hex');

export function segredoConfere(valor: unknown): boolean {
  if (typeof valor !== 'string') return false;
  const recebido = Buffer.from(valor);
  const esperado = Buffer.from(SEGREDO_MCP_INTERNO);
  return (
    recebido.length === esperado.length && timingSafeEqual(recebido, esperado)
  );
}
