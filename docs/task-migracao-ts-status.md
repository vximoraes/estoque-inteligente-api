# Task: Migração JS → TypeScript — CONCLUÍDA

**Branch:** `7-migrar-para-typescript`  
**Estratégia:** incremental `allowJs:true` + `checkJs:false`; runtime `tsx`; `strict:true` desde o dia 1  
**Estado final:** `allowJs: false` — zero `.js` em `src/`, zero erros em `npm run typecheck`

---

## Progresso — Resumo por fase

| Fase | O que | Status | Commits |
|---|---|---|---|
| 0 | Toolchain TypeScript (tsconfig, package.json, babel, jest, eslint) | ✅ | `492cf62` |
| 1 | `src/utils/errors/`, `src/utils/helpers/`, `src/utils/types.ts` | ✅ | `7436cd2` |
| 2 | Todos os módulos: fornecedor, rota, notificacao, orcamento, estoque, localizacao, categoria, item, movimentacao, emprestimo, grupo, usuario | ✅ | vários |
| 2 | `auth` | ✅ | `18f48e8` |
| 2 | `ia` | ✅ | `a3825cd` |
| 3 | `src/config/`, `src/middlewares/`, `src/utils/` (logger, SSE, Permission, Token, Sharp, Multer) | ✅ | `5136fa9` |
| 3 | `src/libs/mcp/` + `tools/` | ✅ | `ae76c16` |
| 3 | `src/app.ts` + `server.ts` | ✅ | `713086b` |
| 3 | `src/utils/services/EmailService.ts`, `src/docs/**`, `src/utils/swagger_utils/` | ✅ | `f4347e7`, `44e2d9d` |
| 3 | `src/seeds/**` | ✅ | `031b69c` |
| 3 | `src/**/__tests__/**` (renomeados, excluídos do tsc — compilados por Babel) | ✅ | `031b69c` |
| **Final** | **`allowJs: false` — porta trancada** | ✅ | `031b69c` |

---

## Estado atual

```
npm run typecheck  →  zero erros
allowJs: false     →  nenhum .js pode entrar em src/
testes excluídos   →  src/**/__tests__/** não são verificados pelo tsc (Babel compila)
```

---

## Padrões estabelecidos

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
constructor({ fooModel = FooModel }: { fooModel?: mongoose.PaginateModel<FooDocument> } = {})
const query = req.query as Record<string, string | undefined>;
return { ...resultado, docs: resultado.docs.map((doc) => ({ ...doc.toObject() })) };
```

### Controller

```typescript
async listar(req: AuthenticatedRequest, res: Response) { ... }
const id = req.params['id'] as string;
```

---

## Armadilhas conhecidas e soluções

| Problema | Solução |
|---|---|
| `req.params['id']` é `string \| string[]` em `@types/express@5` | Cast `as string` |
| `toObject()` retorna tipo específico Mongoose | Double cast: `as unknown as Record<string, unknown>` |
| `multer FileFilterCallback` erro path: `cb(err, false)` | Só `cb(err)` — segundo arg inválido no overload de erro |
| `noUncheckedIndexedAccess` em `Record<N, Fn>` | Non-null assertion `record[key]!()` |
| `Date - Date` não permitido em TS | Usar `.getTime() - .getTime()` |
| `mongoose-schema-jsonschema` sem tipos | `src/types/mongoose-schema-jsonschema.d.ts` com augment |
| `faker-br` sem tipos | `src/types/faker-br.d.ts` com `any` |
| `swaggerCommonResponses[N]` + `noUncheckedIndexedAccess` | `swaggerCommonResponses[N]!()` com `!` |
| Testes com imports sem `.js` + NodeNext resolution | Excluídos do tsc; Babel compila sem precisar de extensões |
