export default function handleQuery(
  query: Record<string, string>,
  defaultSort: Record<string, unknown>,
): { filtros: Record<string, unknown>; pagina: number; ordenar: Record<string, unknown> } {
  const filtros: Record<string, unknown> = {};
  let pagina = 1;
  let ordenar = defaultSort;

  for (const [key, value] of Object.entries(query)) {
    if (key === 'pagina') {
      pagina = parseInt(value);
      continue;
    }
    if (key === 'ordenar') {
      const sort = value.split('-');
      ordenar = { [sort[0] ?? '']: sort[1] };
      continue;
    }
    if (key === 'ativo') {
      filtros[key] = value === '1';
      continue;
    }
    if (key === 'turnos') {
      const turnos = value.split(',');
      for (const turno of turnos) {
        filtros[`turnos.${turno}`] = true;
      }
      continue;
    }
    if (key === 'estudantes') {
      const estudantes = value.split(',');
      filtros[key] = { $elemMatch: { $in: estudantes } };
      continue;
    }
    if (key === 'turma' || key === 'curso') {
      filtros[key] = value;
      continue;
    }
    if (value) {
      filtros[key] = { $regex: new RegExp(value, 'i') };
    }
  }

  return { filtros, pagina, ordenar };
}
