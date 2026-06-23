# Migração para arquitetura modular (package by feature)

## Objetivo

Reorganizar `src/` de package-by-layer para package-by-feature, seguindo os princípios da
[Tomato Architecture](https://github.com/sivaprasadreddy/tomato-architecture). Cada domínio
passa a ser um módulo autossuficiente. Nenhuma lógica é alterada — só reorganização de arquivos
e atualização de imports.

---

## Estrutura alvo

```
src/
├── modules/
│   ├── auth/
│   ├── categoria/
│   ├── emprestimo/
│   ├── estoque/
│   ├── fornecedor/
│   ├── grupo/
│   ├── ia/
│   │   └── mcp/
│   │       └── tools/
│   ├── item/
│   ├── localizacao/
│   ├── movimentacao/
│   ├── notificacao/
│   ├── orcamento/
│   ├── rota/
│   └── usuario/
├── shared/
│   ├── config/          ← DbConnect, MinIO, Multer, Sharp, Pagination
│   ├── middlewares/     ← Auth, Permission, asyncWrapper, LogRoutes
│   ├── utils/           ← logger, TokenUtil, SendMail, DateHelper, helpers, validators
│   └── docs/
│       ├── config/      ← head.js (Swagger aggregator)
│       ├── utils/       ← schemaGenerate, generateParameters
│       └── schemas/     ← swaggerCommonResponses (apenas o compartilhado)
├── jobs/
│   └── EmprestimoAtrasadoJob.js
└── app.js
```

---

## Anatomia de um módulo

Cada pasta em `modules/<dominio>/` contém todos os artefatos daquele domínio:

```
modules/categoria/
├── index.js                    ← barrel: re-exporta tudo do módulo
├── CategoriaController.js
├── CategoriaService.js
├── CategoriaRepository.js
├── CategoriaFilterBuilder.js   ← sai de repositories/filters/
├── CategoriaModel.js           ← renomeado de Categoria.js
├── CategoriaSchema.js          ← body schema (Zod)
├── CategoriaQuerySchema.js     ← query params schema (Zod)
├── categoriaRoutes.js
├── categoriaDocs.js            ← vem de docs/paths/categoria.js
└── categoriaDocsSchema.js      ← vem de docs/schemas/categoriaSchema.js
```

### Barrel export (`index.js`)

Todo módulo expõe um `index.js` que re-exporta seus artefatos públicos:

```js
// src/modules/categoria/index.js
export { default as CategoriaController } from './CategoriaController.js';
export { default as CategoriaService }    from './CategoriaService.js';
export { default as CategoriaRepository } from './CategoriaRepository.js';
export { default as CategoriaModel }      from './CategoriaModel.js';
export * from './CategoriaSchema.js';
export * from './CategoriaQuerySchema.js';
```

Cross-module imports usam o barrel:

```js
// modules/item/ItemService.js
import { CategoriaModel } from '../categoria/index.js';

// modules/movimentacao/MovimentacaoService.js
import { CategoriaModel } from '../categoria/index.js';
import { EstoqueModel }   from '../estoque/index.js';
```

> `CategoriaFilterBuilder`, `categoriaRoutes`, `categoriaDocs` e `categoriaDocsSchema`
> **não entram no barrel** — são detalhes internos consumidos apenas por `app.js` e `head.js`.

### Convenções de nome

| Tipo | Padrão | Exemplo |
|---|---|---|
| Controller | `<Dominio>Controller.js` | `CategoriaController.js` |
| Service | `<Dominio>Service.js` | `CategoriaService.js` |
| Repository | `<Dominio>Repository.js` | `CategoriaRepository.js` |
| FilterBuilder | `<Dominio>FilterBuilder.js` | `CategoriaFilterBuilder.js` |
| Model (Mongoose) | `<Dominio>Model.js` | `CategoriaModel.js` |
| Schema Zod body | `<Dominio>Schema.js` | `CategoriaSchema.js` |
| Schema Zod query | `<Dominio>QuerySchema.js` | `CategoriaQuerySchema.js` |
| Routes | `<dominio>Routes.js` | `categoriaRoutes.js` |
| Swagger paths | `<dominio>Docs.js` | `categoriaDocs.js` |
| Swagger schemas | `<dominio>DocsSchema.js` | `categoriaDocsSchema.js` |

---

## O que fica em `shared/`

Nada que seja específico de um domínio vai para `shared/`. Regra simples: se dois módulos
diferentes importam o arquivo, ele é shared.

| Diretório atual | Destino |
|---|---|
| `src/config/` | `src/shared/config/` |
| `src/middlewares/` | `src/shared/middlewares/` |
| `src/utils/` | `src/shared/utils/` |
| `src/docs/config/head.js` | `src/shared/docs/config/head.js` |
| `src/docs/utils/` | `src/shared/docs/utils/` |
| `src/docs/schemas/swaggerCommonResponses.js` | `src/shared/docs/schemas/swaggerCommonResponses.js` |
| `src/seeds/` | `src/seeds/` (inalterado) |

> `src/docs/paths/` e `src/docs/schemas/<dominio>Schema.js` somem — vão para dentro dos módulos.

### Primeiro artefato shared: `commonFields.js`

Criado **antes** de qualquer módulo ser migrado. Consolida schemas Zod reutilizados por todos:

```js
// src/shared/utils/commonFields.js
import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z
  .string()
  .refine((id) => mongoose.Types.ObjectId.isValid(id), { message: 'ID inválido' });

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => Number.isInteger(v) && v > 0, { message: 'page deve ser inteiro > 0' }),
  limite: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, {
      message: 'limite deve ser entre 1 e 100',
    }),
});
```

Cada `<Dominio>QuerySchema.js` passa a importar daqui e só adiciona filtros específicos:

```js
// antes — cada QuerySchema redefinia page/limite
// depois
import { objectIdSchema, paginationSchema } from '../../shared/utils/commonFields.js';

export const CategoriaQuerySchema = paginationSchema.extend({
  nome: z.string().optional().transform((v) => v?.trim()),
});

export const CategoriaIdSchema = objectIdSchema;
```

---

## Cross-module imports

Módulos podem importar diretamente de outros módulos. Sem abstrações intermediárias.

```js
// modules/categoria/CategoriaService.js
import ItemModel from '../item/ItemModel.js';

// modules/movimentacao/MovimentacaoService.js
import ItemModel from '../item/ItemModel.js';
import EstoqueModel from '../estoque/EstoqueModel.js';
```

Regra: importar o mínimo necessário (Model ou Repository) — nunca o Service inteiro de outro
módulo, exceto quando a regra de negócio realmente orquestra dois domínios (ex: `EmprestimoService`
chama `MovimentacaoService`).

---

## Swagger: estratégia de migração

`src/docs/config/head.js` permanece como agregador central, mas seus imports apontam para dentro
dos módulos:

```js
// antes
import categoriasSchemas from '../schemas/categoriaSchema.js';
import categoriasPaths from '../paths/categoria.js';

// depois
import categoriasSchemas from '../../modules/categoria/categoriaDocsSchema.js';
import categoriasPaths from '../../modules/categoria/categoriaDocs.js';
```

Arquivos de docs internos ao módulo atualizam imports relativos:

```js
// categoriaDocs.js — antes apontava para ../schemas/
import categoriasSchemas from './categoriaDocsSchema.js';
import commonResponses from '../../shared/docs/schemas/swaggerCommonResponses.js';
import { generateParameters } from '../../shared/docs/utils/generateParameters.js';

// categoriaDocsSchema.js — antes apontava para ../../models/
import Categoria from './CategoriaModel.js';
import { deepCopy, generateExample } from '../../shared/docs/utils/schemaGenerate.js';
import removeFieldsRecursively from '../../shared/utils/swagger_utils/removeFields.js';
```

---

## `src/routes/index.js` → `src/app.js`

O arquivo `routes/index.js` some. Suas responsabilidades vão para `app.js` diretamente, ou
`routes/index.js` é atualizado módulo a módulo com novos imports:

```js
// durante a migração (update incremental)
import categorias from '../modules/categoria/categoriaRoutes.js';  // ← novo
import localizacoes from './localizacaoRoutes.js';                 // ← ainda antigo
```

---

## Ordem de migração

A ordem respeita as dependências entre módulos: um módulo só é migrado após todos os módulos que
ele importa já estarem em `modules/`.

| # | Módulo | Cross-deps | Observações |
|---|---|---|---|
| 1 | `fornecedor` | nenhuma | mais simples, bom ponto de partida |
| 2 | `rota` | nenhuma | necessário antes de `grupo` |
| 3 | `notificacao` | nenhuma | — |
| 4 | `orcamento` | nenhuma | — |
| 5 | `estoque` | nenhuma | necessário antes de `localizacao` e `movimentacao` |
| 6 | `localizacao` | `EstoqueModel` | após `estoque` ✓ |
| 7 | `categoria` | `ItemModel` | migrar junto com `item` no mesmo passo |
| 8 | `item` | `CategoriaModel` | migrar junto com `categoria` no mesmo passo |
| 9 | `movimentacao` | `ItemModel`, `EstoqueModel` | após `item` e `estoque` ✓ |
| 10 | `emprestimo` | `MovimentacaoService`, `EmailService` | após `movimentacao` ✓ |
| 11 | `grupo` | `UsuarioRepository`, `RotaRepository` | após `rota` ✓; `usuario` vem depois |
| 12 | `usuario` | `GrupoRepository`, `EmailService` | após `grupo` ✓ |
| 13 | `auth` | `UsuarioRepository` | após `usuario` ✓ |
| 14 | `ia` | `ConversaModel`, LangChain, MCP tools | último — mais complexo |

> `categoria` e `item` têm dependência mútua (cada service importa o model do outro). Migrar no
> mesmo commit para evitar estado intermediário com import apontando para path inexistente.

---

## Estratégia de teste

Após cada módulo migrado:

```bash
npm test
```

Zero regressão = prosseguir. Qualquer falha = corrigir antes de migrar próximo módulo.

Os testes em `src/tests/` têm seus próprios imports para atualizar. Migrar os testes do módulo
junto com o módulo (mesmo commit).

---

## Passos por módulo (checklist)

Para cada módulo na ordem acima:

1. Criar `src/modules/<dominio>/`
2. Mover e renomear arquivos conforme tabela de anatomia
3. Atualizar imports internos ao módulo (relativos entre si)
4. Atualizar imports de `shared/` (`../../shared/...`) — incluindo `commonFields.js`
5. Atualizar imports cross-module via barrel (`../outroModulo/index.js`)
6. Criar `src/modules/<dominio>/index.js` com barrel dos artefatos públicos
7. Atualizar `src/routes/index.js` para importar routes de `modules/`
8. Atualizar `src/docs/config/head.js` para importar docs do módulo
9. Mover e atualizar testes do módulo em `src/tests/`
10. Rodar `npm test` — zero falhas antes de avançar
11. Commit: `refactor: migra módulo <dominio> para src/modules`

---

## Migração do shared (última etapa)

Após todos os módulos migrados, renomear as pastas de suporte:

```bash
git mv src/config      src/shared/config
git mv src/middlewares src/shared/middlewares
git mv src/utils       src/shared/utils
git mv src/docs/config src/shared/docs/config
git mv src/docs/utils  src/shared/docs/utils
```

Atualizar todos os imports `../../config/` → `../../shared/config/`, etc.

Rodar `npm test` final. Commit: `refactor: consolida utilitários em src/shared`.

---

## Referências

- [Tomato Architecture](https://github.com/sivaprasadreddy/tomato-architecture)
- [cemig-mcp-server](../../loomi/cemig-mcp-server) — referência de módulos NestJS com barrel exports e Zod DTOs
