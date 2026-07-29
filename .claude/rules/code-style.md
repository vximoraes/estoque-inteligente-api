# Code style

- Nomes de módulos, rotas, campos de negócio e mensagens de erro ficam em português (pt-BR); nomes de arquivo/classe seguem o padrão `<Nome>Model.ts`, `<Nome>Service.ts` etc. (ver arquitetura no `CLAUDE.md`). Não traduzir para inglês.
- `type: module` + `moduleResolution: NodeNext`: imports relativos **sempre** terminam em `.js`, mesmo importando um `.ts` (ex.: `import ItemService from './ItemService.js'`). Isso não é erro de digitação — é exigência do resolver.
- Formatação via Prettier (`.prettierrc`): aspas simples, ponto e vírgula obrigatório, trailing comma em tudo, `arrowParens: always`. Rodar `npm run fix` antes de considerar uma mudança pronta.
- ESLint remove imports não usados automaticamente (`unused-imports`). `no-explicit-any`, `no-console` (exceto `warn`/`error`) e `require-await`/`no-return-await` são warnings — evitar introduzir novos, mas não travam o build. `no-throw-literal` é erro: sempre lançar via `CustomError`, nunca `throw 'string'` ou objeto solto.
- `strict: true` + `noUncheckedIndexedAccess: true` no TS: acesso a `req.params['id']`, arrays etc. vem tipado como possivelmente `undefined` — tratar explicitamente, não usar `!` sem necessidade real.
- Controllers só fazem parse (Zod) + chamada ao Service + retorno via `CommonResponse`; lógica de negócio pertence ao Service, nunca ao Controller. Erros de negócio são `throw new CustomError(...)`, nunca `res.status(...)` manual dentro de Service/Controller.
- Novo módulo CRUD replica a divisão de arquivos de um módulo existente (`item` ou `categoria` são bons exemplos) — não introduzir uma camada diferente (ex.: não colocar lógica direta no `Repository`, não pular o `FilterBuilder` para queries com filtro).
