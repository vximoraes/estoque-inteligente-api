export type SortWhitelist = Record<string, string>;
export type SortOrder = Record<string, 1 | -1>;

function parseOrdenar(
  ordenar: string | undefined,
  whitelist: SortWhitelist,
): SortOrder | null {
  if (!ordenar) return null;

  const [campo, direcao] = ordenar.split(':');
  const campoReal = campo ? whitelist[campo] : undefined;

  if (!campoReal || (direcao !== 'asc' && direcao !== 'desc')) return null;

  return { [campoReal]: direcao === 'asc' ? 1 : -1 };
}

// Resolve o `sort` do mongoose-paginate a partir do param `ordenar` da
// query, restrito à whitelist do módulo, com `padrao` como fallback quando
// o param não vem ou é inválido. Sempre acrescenta `_id` como desempate na
// mesma direção do campo principal: sem isso, ordenar por um campo
// não-único (nome, status, valor...) com paginação por skip pode repetir
// ou pular documentos entre páginas do scroll infinito do front.
export function resolveSort(
  ordenar: string | undefined,
  whitelist: SortWhitelist,
  padrao: SortOrder,
): SortOrder {
  const sort = parseOrdenar(ordenar, whitelist) ?? padrao;
  const direcaoPrincipal = Object.values(sort)[0] ?? 1;

  return { ...sort, _id: direcaoPrincipal };
}
