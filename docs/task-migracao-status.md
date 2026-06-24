# Task: Migração para arquitetura modular — estado atual

**Branch:** `6-migrar-arquitetura-da-api-para-modulos`  
**Plano completo:** [`docs/migracao-modulos.md`](./migracao-modulos.md)

---

## Progresso

| # | Módulo | Status | Commit |
|---|---|---|---|
| 1 | `fornecedor` | ✅ Concluído | `6b2af69` |
| 2 | `rota` | ✅ Concluído | `a08c0b1` |
| 3 | `notificacao` | ✅ Concluído | `aebf031` |
| 4 | `orcamento` | ✅ Concluído | `af545ed` |
| 5 | `estoque` | ✅ Concluído | `c30a364` |
| 6 | `localizacao` | ⏳ Próximo | — |
| 7+8 | `categoria` + `item` | ⬜ Pendente (juntos) | — |
| 9 | `movimentacao` | ⬜ Pendente | — |
| 10 | `emprestimo` | ⬜ Pendente | — |
| 11 | `grupo` | ⬜ Pendente | — |
| 12 | `usuario` | ⬜ Pendente | — |
| 13 | `auth` | ⬜ Pendente | — |
| 14 | `ia` | ⬜ Pendente | — |
| — | shared (renomear config/middlewares/utils) | ⬜ Última etapa | — |

---

## O que foi criado além dos módulos

- `src/shared/utils/commonFields.js` — `objectIdSchema` e `paginationSchema` (base para todos os QuerySchemas)

---

## Aprendizados do primeiro módulo (`fornecedor`)

### Mapeamento de caminhos (padrão a repetir)

| Origem | Destino no módulo |
|---|---|
| `src/controllers/<Dominio>Controller.js` | `src/modules/<dominio>/<Dominio>Controller.js` |
| `src/services/<Dominio>Service.js` | `src/modules/<dominio>/<Dominio>Service.js` |
| `src/repositories/<Dominio>Repository.js` | `src/modules/<dominio>/<Dominio>Repository.js` |
| `src/repositories/filters/<Dominio>FilterBuilder.js` | `src/modules/<dominio>/<Dominio>FilterBuilder.js` |
| `src/models/<Dominio>.js` | `src/modules/<dominio>/<Dominio>Model.js` |
| `src/utils/validators/schemas/zod/<Dominio>Schema.js` | `src/modules/<dominio>/<Dominio>Schema.js` |
| `src/utils/validators/schemas/zod/querys/<Dominio>QuerySchema.js` | `src/modules/<dominio>/<Dominio>QuerySchema.js` |
| `src/routes/<dominio>Routes.js` | `src/modules/<dominio>/<dominio>Routes.js` |
| `src/docs/paths/<dominio>.js` | `src/modules/<dominio>/<dominio>Docs.js` |
| `src/docs/schemas/<dominio>Schema.js` | `src/modules/<dominio>/<dominio>DocsSchema.js` |

### Imports que mudam dentro dos arquivos migrados

| Import antigo | Import novo |
|---|---|
| `'../services/<Dominio>Service.js'` | `'./<Dominio>Service.js'` |
| `'../repositories/<Dominio>Repository.js'` | `'./<Dominio>Repository.js'` |
| `'../models/<Dominio>.js'` | `'./<Dominio>Model.js'` |
| `'../config/PaginationConfig.js'` | `'../../config/PaginationConfig.js'` |
| `'./filters/<Dominio>FilterBuilder.js'` | `'./<Dominio>FilterBuilder.js'` |
| `'../utils/helpers/index.js'` | `'../../utils/helpers/index.js'` |
| `'../middlewares/AuthMiddleware.js'` | `'../../middlewares/AuthMiddleware.js'` |
| `'../schemas/<dominio>Schema.js'` (docs) | `'./<dominio>DocsSchema.js'` |
| `'../schemas/swaggerCommonResponses.js'` | `'../../docs/schemas/swaggerCommonResponses.js'` |
| `'./utils/generateParameters.js'` (docs) | `'../../docs/paths/utils/generateParameters.js'` |
| `'../../models/<Dominio>.js'` (docsSchema) | `'./<Dominio>Model.js'` |
| `'../utils/schemaGenerate.js'` (docsSchema) | `'../../docs/utils/schemaGenerate.js'` |

### Arquivos globais a atualizar por módulo

- `src/routes/index.js` — trocar `import <dominio> from './<dominio>Routes.js'` por `'../modules/<dominio>/<dominio>Routes.js'`
- `src/docs/config/head.js` — trocar imports de `paths/` e `schemas/` por imports dos módulos

### Testes

- Atualizar todos os `import` nos test files para apontar para `modules/<dominio>/`
- **Atenção:** `jest.mock()`, `jest.doMock()` e `jest.dontMock()` dentro do corpo dos testes também precisam de atualização (não só os imports do topo)
- Rodar `npm test` antes e depois — zero regressão para avançar
- Falhas pré-existentes (antes da migração) não bloqueiam — confirmar com `git stash` se necessário

### Merges

- Sempre usar `--no-ff` ao mergear branches feature em `develop`

---

## Lições aprendidas (sessões anteriores)

- **Efeito cascata ao deletar modelos**: ao remover `src/models/<X>.js`, atualizar imediatamente todos os arquivos que o importam — seeds, middlewares, services/repos não migrados, mcp tools, test files.
- **Padrão cross-module**: usar `../../models/<Name>.js` para modelos NÃO migrados; `../<modulo>/<Name>Model.js` para modelos JÁ migrados.
- **jest.mock() paths**: devem resolver para o mesmo caminho absoluto que o módulo sob teste usa. Calcular relativo ao arquivo de teste, não ao módulo.
- **Testes em `src/tests/routes/`**: 2 níveis acima (`../../modules/`) para chegar em `src/modules/`. Não 3 níveis.
- **Estoque sem FilterBuilder**: EstoqueRepository faz o filtro internamente (sem classe FilterBuilder separada).

## Como retomar

1. Branch: `git checkout 6-migrar-arquitetura-da-api-para-modulos`
2. Próximo módulo: **`localizacao`** (depende de EstoqueModel — já migrado ✅)
3. Seguir checklist de 11 passos em `docs/migracao-modulos.md`
4. Atualizar a tabela de progresso acima após cada módulo
