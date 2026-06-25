# Task: Migração JS → TypeScript — estado atual

**Branch:** `7-migrar-para-typescript`  
**Plano completo:** [`/home/vinicius/.claude-pessoal/plans/ultra-steady-sundae.md`](../../../.claude-pessoal/plans/ultra-steady-sundae.md)  
**Estratégia:** incremental `allowJs:true` + `checkJs:false`; runtime `tsx`; `strict:true` desde o dia 1

---

## Progresso — Fase 0 e 1 (toolchain + utils)

| # | O que | Status | Commit |
|---|---|---|---|
| 0 | Toolchain TypeScript (tsconfig, package.json, babel, jest, eslint, nodemon) | ✅ Concluído | `492cf62` |
| 1 | `src/utils/errors/` + `src/utils/helpers/` (CustomError, HttpStatusCodes, StatusService, CommonResponse, errorHandler, messages, asyncWrapper, index) | ✅ Concluído | `7436cd2` |
| 1b | `src/utils/commonFields.ts` + `src/utils/types.ts` (AuthenticatedRequest, PaginatedResult) | ✅ Concluído | `7436cd2` |

---

## Progresso — Fase 2 (módulos)

| # | Módulo | Status | Commit |
|---|---|---|---|
| 1 | `fornecedor` | ✅ Concluído | `e78107f` |
| 2 | `rota` | ✅ Concluído | `678f426` |
| 3 | `notificacao` | ✅ Concluído | `1141715` |
| 4 | `orcamento` | ✅ Concluído | `1335ca7` |
| 5 | `estoque` | ⏳ Próximo | — |
| 6 | `localizacao` | ⏸ Pendente | — |
| 7+8 | `categoria` + `item` | ⏸ Pendente | — |
| 9 | `movimentacao` | ⏸ Pendente | — |
| 10 | `emprestimo` | ⏸ Pendente | — |
| 11 | `grupo` | ⏸ Pendente | — |
| 12 | `usuario` | ⏸ Pendente | — |
| 13 | `auth` | ⏸ Pendente | — |
| 14 | `ia` | ⏸ Pendente (mais complexo — deixar por último) | — |

---

## Progresso — Fase 3 (infra + entrada)

| # | O que | Status |
|---|---|---|
| — | `src/config/` (DbConnect, MinIO, Multer, Sharp, Pagination) | ⏸ Pendente |
| — | `src/middlewares/` (AuthMiddleware, AuthPermission, LogRoutes) | ⏸ Pendente |
| — | `src/libs/mcp/` + `tools/` | ⏸ Pendente |
| — | `src/app.js` + `server.js` | ⏸ Pendente |
| — | Docs/Swagger + `src/seeds/` | ⏸ Pendente |
| — | **Trancamento final:** remover `allowJs`, `allowJs:false` | ⏸ Pendente |

---

## Padrões estabelecidos (repetir em cada módulo)

### Conversão de arquivos

```bash
# 1. Renomear com git mv (preserva histórico)
git mv src/modules/<dom>/<Arq>.js src/modules/<dom>/<Arq>.ts
# Exceção: *Docs.js e *DocsSchema.js ficam como .js
```

### Interfaces Mongoose

```typescript
export interface IFoo {
  campo: string;
  outro?: string;
  usuario: mongoose.Types.ObjectId;
}
export type FooDocument = IFoo & Document;

const schema = new mongoose.Schema<FooDocument>({ ... });
schema.plugin(mongoosePaginate);
export default mongoose.model<FooDocument, mongoose.PaginateModel<FooDocument>>('foos', schema);
```

### Schemas Zod → tipos derivados

```typescript
export type Foo = z.infer<typeof FooSchema>;
export type FooUpdate = z.infer<typeof FooUpdateSchema>;
export type FooQuery = z.output<typeof FooQuerySchema>;
```

### Repository

```typescript
// Parâmetros do construtor tipados
constructor({ fooModel = FooModel }: { fooModel?: mongoose.PaginateModel<FooDocument> } = {})

// Query cast
const query = req.query as Record<string, string | undefined>;
const limite = Math.min(parseInt(query['limite'] ?? '', 10) || DEFAULT, MAX);

// Spread docs (nunca reassign diretamente)
return { ...resultado, docs: resultado.docs.map((doc) => ({ ...doc.toObject() })) };

// Params
const id = req.params['id'] as string;
```

### Service

```typescript
// Nunca mutar parsedData — usar spread
const dataToCreate = { ...parsedData, usuario: req.user_id };
```

### Controller

```typescript
// Params sempre cast
const id = req.params['id'] as string;

// Método typed como (req: AuthenticatedRequest, res: Response)
async listar(req: AuthenticatedRequest, res: Response) { ... }
```

### FilterBuilder com repo/model públicos

```typescript
// Quando testes checam filterBuilder.xxxRepository e filterBuilder.xxxModel:
class FooFilterBuilder {
  private filtros: FilterQuery<IFoo> = {};
  fooRepository: FooRepository;    // public — testes verificam
  fooModel: typeof FooModel;       // public — testes verificam
  constructor() {
    this.fooRepository = new FooRepository();
    this.fooModel = FooModel;
  }
  ...
}
```

---

## Armadilhas conhecidas e soluções

| Problema | Solução |
|---|---|
| `req.params['id']` é `string \| string[]` em `@types/express@5` | Cast `as string` sempre que usar como ID |
| `resultado.docs = resultado.docs.map(...)` falha — não pode reassign typed array | Retornar `{ ...resultado, docs: resultado.docs.map(...) }` |
| `@babel/preset-typescript@8` requer `@babel/core@^8` | Usar `@babel/preset-typescript@^7` |
| `messages.error` tem funções com 2+ params | Cast via `as unknown as Record<string, unknown>` |
| `filterBuilder.build !== 'function'` check no repository falha quando FilterBuilder não tem o método | Garantir que `build()` existe como método tipado |
| `errorTypes` (typo) em vez de `errorType` | Corrigir para `errorType` — TypeScript detecta |
| Jest resolve `.js` literalmente após rename | `moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" }` no jest config |
| `CustomError` defaults mudam comportamento dos testes | Manter `statusCode \| undefined` e `errorType \| undefined` sem defaults |
| Mock de `HttpStatusCodes.NOT_FOUND: 404` (número) + controller usa `.code` | Atualizar mock para `{ code: 404, message: '...' }` e atualizar expectativa do teste |
| `IItemOrcamento` e subdoc arrays — `itens[idx]` é `T \| undefined` | Adicionar null check explícito após `findIndex !== -1` |
| `parsedData as Record<string, unknown>` no repository de subdocs | Usar `unknown as IItemOrcamento` para o cast duplo |

---

## Baseline de testes (manter durante toda a migração)

```
Test Suites: 16 failed, 60 passed, 76 total
Tests:       123 failed, 834 passed, 957 total
```

Falhas pré-existentes:
- **10 `*Routes.test.js`** — `ECONNREFUSED 127.0.0.1:3010` (precisam de servidor rodando)
- **6 `*Model.test.js`** — unique constraint + outros comportamentos de schema não testáveis sem DB

**Regra:** nunca ultrapassar 16 suítes / 123 testes falhando. Ao introduzir regressão, investigar imediatamente antes de avançar.

---

## Como retomar

1. `git checkout 7-migrar-para-typescript`
2. Próximo módulo: **`estoque`**
3. Ordem de conversão dentro de cada módulo: Schema → QuerySchema → Model → FilterBuilder → Repository → Service → Controller → Routes → index
4. Após cada módulo: `npm run typecheck` limpo + `npm test` no baseline
5. Commitar com `feat: migrar módulo <nome> para TypeScript`
6. **NÃO mergear em develop** sob nenhuma circunstância
