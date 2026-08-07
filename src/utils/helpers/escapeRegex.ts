export function escapeRegex(texto: string): string {
  return texto.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
