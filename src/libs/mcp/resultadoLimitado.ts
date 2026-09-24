const LIMITE_MAXIMO = 50;

export function resultadoLimitado<T>(registros: T[], total: number) {
  const exibidos = registros.length;

  return {
    total_encontrado: total,
    exibidos,
    ...(total > exibidos && {
      aviso: `Lista incompleta: exibindo ${exibidos} de ${total} registros encontrados. Avise o usuário que a lista está incompleta e sugira refinar o filtro ou pedir mais resultados (máximo ${LIMITE_MAXIMO} por consulta).`,
    }),
    registros,
  };
}
