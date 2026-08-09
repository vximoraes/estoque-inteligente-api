export function describirErro(erro: unknown): string {
  if (erro instanceof AggregateError) {
    const detalhes = erro.errors
      .map((e) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)))
      .join(' | ');
    return `AggregateError: ${detalhes}`;
  }
  if (erro instanceof Error) {
    const code = (erro as NodeJS.ErrnoException).code;
    return code ? `${erro.name} (${code}): ${erro.message}` : erro.message;
  }
  return String(erro);
}
