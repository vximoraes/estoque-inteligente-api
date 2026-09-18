# Suite de Testes E2E — Categoria (`/categorias`)

Testes E2E (endpoint) que validam cadastro, listagem, atualização e inativação de categorias, incluindo os cenários de autenticação/autorização.

Arquivo: `src/modules/categoria/__tests__/categoriaRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                          | Comportamento Atual do Sistema                                                | Impacto na Suite E2E                                         |
| :----------------------------- | :---------------------------------------------------------------------------- | :----------------------------------------------------------- |
| Tipo imutável                  | `tipo` (`consumo` ou `permanente`) não pode ser alterado após a criação.      | `PATCH` nunca testa mudança de `tipo`.                       |
| Nome único                     | Duas categorias não podem ter o mesmo `nome`.                                 | Cobrir 400 tanto na criação quanto na atualização.           |
| Autenticação em duas camadas   | `AuthMiddleware` (sessão) roda antes de `AuthPermission` (RBAC) em toda rota. | Sem sessão válida a resposta é sempre 498, nunca 401/403.    |
| RBAC liberal para `categorias` | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota.      | Cenário de usuário comum aqui é positivo (200/201), não 403. |

## Modelo de Categoria

| Campo       | Tipo    | Requerido | Observação                               |
| :---------- | :------ | :-------- | :--------------------------------------- |
| `nome`      | string  | Sim       | Único entre categorias ativas.           |
| `tipo`      | string  | Sim       | `'consumo'` ou `'permanente'`; imutável. |
| `ativo`     | boolean | Não       | Default `true`.                          |
| `descricao` | string  | Não       | Máximo 200 caracteres.                   |

## Massa de Dados Recomendada

| Entidade                  | Objetivo nos testes                                                     |
| :------------------------ | :---------------------------------------------------------------------- |
| Admin (seed)              | Login e token bearer para os cenários felizes.                          |
| Usuário Padrão (seed)     | Login e token bearer para provar que o RBAC libera esta rota.           |
| Categoria criada em teste | Nome sempre prefixado `zz-categoria-`, único por `crypto.randomUUID()`. |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério                                                     |
| :--------------------- | :------------------------------------------- | :----------------------------------------------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `POST /api/auth/sign-in/email` retorna `200` e `body.token`. |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem, com as credenciais do usuário padrão.                  |

## POST /categorias — Cadastro

| Funcionalidade                       | Comportamento Esperado                                | Verificações                                              | Critérios de Aceite                                |
| :----------------------------------- | :---------------------------------------------------- | :-------------------------------------------------------- | :------------------------------------------------- |
| **Cenários felizes**                 |                                                       |                                                           |                                                    |
| Cadastro válido                      | Deve criar a categoria e retornar o documento criado. | `POST /categorias` com `nome` único e `tipo: 'consumo'`.  | Retorna `201`; `error=false`; `data._id` presente. |
| Usuário sem permissão administrativa | Deve permitir o cadastro (RBAC libera esta rota).     | `POST /categorias` com token do usuário padrão.           | Retorna `201`.                                     |
| **Cenários tristes**                 |                                                       |                                                           |                                                    |
| Sem `nome`                           | Deve rejeitar por campo obrigatório ausente.          | `POST /categorias` com `{ tipo: 'consumo' }`.             | Retorna `400`; `errors` contém `path: 'nome'`.     |
| Sem `tipo`                           | Deve rejeitar por campo obrigatório ausente.          | `POST /categorias` com `{ nome }`.                        | Retorna `400`; `errors` contém `path: 'tipo'`.     |
| Nome já existente                    | Deve rejeitar duplicidade.                            | `POST /categorias` com `nome` de categoria já cadastrada. | Retorna `400`.                                     |
| Sem token                            | Deve bloquear requisição não autenticada.             | `POST /categorias` sem header `Authorization`.            | Retorna `498`.                                     |
| Token inválido                       | Deve bloquear sessão inválida.                        | `POST /categorias` com `Bearer token-invalido`.           | Retorna `498`.                                     |

## GET /categorias — Listagem

| Funcionalidade       | Comportamento Esperado                    | Verificações                              | Critérios de Aceite                                                     |
| :------------------- | :---------------------------------------- | :---------------------------------------- | :---------------------------------------------------------------------- |
| **Cenários felizes** |                                           |                                           |                                                                         |
| Listagem paginada    | Deve retornar coleção paginada.           | `GET /categorias` autenticado como admin. | Retorna `200`; `data.docs` array; `totalDocs`/`page`/`limit` presentes. |
| **Cenários tristes** |                                           |                                           |                                                                         |
| Sem token            | Deve bloquear requisição não autenticada. | `GET /categorias` sem `Authorization`.    | Retorna `498`.                                                          |

## GET /categorias/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                    | Verificações                                               | Critérios de Aceite                          |
| :--------------------- | :---------------------------------------- | :--------------------------------------------------------- | :------------------------------------------- |
| **Cenários felizes**   |                                           |                                                            |                                              |
| Busca por id existente | Deve retornar a categoria correspondente. | `GET /categorias/:id` com id de categoria criada no teste. | Retorna `200`; `data._id` igual ao esperado. |
| **Cenários tristes**   |                                           |                                                            |                                              |
| Id malformado          | Deve rejeitar formato de id inválido.     | `GET /categorias/id-invalido`.                             | Retorna `400`.                               |
| Id válido inexistente  | Deve falhar pois a categoria não existe.  | `GET /categorias/000000000000000000000000`.                | Retorna `404`.                               |

## PATCH /categorias/:id — Atualização

| Funcionalidade                       | Comportamento Esperado              | Verificações                                              | Critérios de Aceite                    |
| :----------------------------------- | :---------------------------------- | :-------------------------------------------------------- | :------------------------------------- |
| **Cenários felizes**                 |                                     |                                                           |                                        |
| Atualizar nome                       | Deve renomear a categoria.          | `PATCH /categorias/:id` com novo `nome`.                  | Retorna `200`; `data.nome` atualizado. |
| **Cenários tristes**                 |                                     |                                                           |                                        |
| Nome já existente em outra categoria | Deve rejeitar duplicidade.          | `PATCH` usando o `nome` de outra categoria já cadastrada. | Retorna `400`.                         |
| Categoria inexistente                | Deve falhar pois o alvo não existe. | `PATCH /categorias/000000000000000000000000`.             | Retorna `404`.                         |

## PATCH /categorias/:id/inativar — Inativação

| Funcionalidade               | Comportamento Esperado                | Verificações                                           | Critérios de Aceite                |
| :--------------------------- | :------------------------------------ | :----------------------------------------------------- | :--------------------------------- |
| **Cenários felizes**         |                                       |                                                        |                                    |
| Inativar categoria existente | Deve marcar a categoria como inativa. | `PATCH /categorias/:id/inativar`.                      | Retorna `200`; `data.ativo=false`. |
| **Cenários tristes**         |                                       |                                                        |                                    |
| Categoria inexistente        | Deve falhar pois o alvo não existe.   | `PATCH /categorias/000000000000000000000000/inativar`. | Retorna `404`.                     |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                                                          |
| :------------------------- | :--------------------------------------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente.                             |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array.                             |
| Autenticação               | Sem token/token inválido sempre `498` (`AuthMiddleware` roda antes do `AuthPermission`). |
| Massa de dados             | Todo nome criado em teste usa prefixo `zz-categoria-` — nunca reaproveita dado do seed.  |

## Estratégia de Organização dos Testes E2E

| Bloco                                        | Objetivo                                                                   |
| :------------------------------------------- | :------------------------------------------------------------------------- |
| `beforeAll`                                  | Autenticar admin e usuário padrão uma única vez para toda a suíte.         |
| `describe('POST /categorias')`               | Cadastro, validação de campo obrigatório, duplicidade, RBAC, autenticação. |
| `describe('GET /categorias')`                | Listagem paginada.                                                         |
| `describe('GET /categorias/:id')`            | Detalhe, id malformado, 404.                                               |
| `describe('PATCH /categorias/:id')`          | Atualização, duplicidade, 404.                                             |
| `describe('PATCH /categorias/:id/inativar')` | Inativação, 404.                                                           |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                                                            |
| :----------------------------- | :---------------------------------------------------------------------- |
| `PORT`                         | Monta `BASE_URL` (`http://localhost:${PORT}`); default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                                                 |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado (não-admin).                            |

## Observações de Implementação para os Casos E2E

| Ponto                | Diretriz                                                                                                 |
| :------------------- | :------------------------------------------------------------------------------------------------------- |
| Helper compartilhado | `test/helpers/rotasTestHelper.ts` concentra login, factories e asserts de envelope/paginação.            |
| Execução serial      | `jest.routes.config.cjs` roda com `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor. |
| Isolamento de dados  | Nenhuma suíte reaproveita ou modifica dado de outra; tudo criado em teste usa prefixo `zz-`.             |
