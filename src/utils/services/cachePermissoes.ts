import type mongoose from 'mongoose';

const VALIDADE_MS = Number(process.env['CACHE_PERMISSOES_MS'] ?? 30_000);

const entradas = new Map<string, { valor: unknown; expiraEm: number }>();

export async function comCache<T>(
  chave: string,
  buscar: () => Promise<T>,
): Promise<T> {
  if (VALIDADE_MS <= 0) return buscar();

  const entrada = entradas.get(chave);
  if (entrada && entrada.expiraEm > Date.now()) return entrada.valor as T;

  const valor = await buscar();
  entradas.set(chave, { valor, expiraEm: Date.now() + VALIDADE_MS });
  return valor;
}

export function limparCachePermissoes(): void {
  entradas.clear();
}

export function limparCacheAoGravar(schema: mongoose.Schema): void {
  schema.post(
    [
      'save',
      'updateOne',
      'updateMany',
      'findOneAndUpdate',
      'deleteOne',
      'deleteMany',
      'findOneAndDelete',
    ],
    limparCachePermissoes,
  );
  schema.post('insertMany', limparCachePermissoes);
}
