# Suite de Testes E2E — Grupo (`/grupos`)

Testes E2E (endpoint) que validam cadastro, listagem/busca, atribuição de rota, atualização e exclusão de grupos de permissão (RBAC).

Arquivo: `src/modules/grupo/__tests__/grupoRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                        | Comportamento Atual do Sistema                                                               | Impacto na Suite E2E                                                        |
| :--------------------------- | :------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| Grupos definem o RBAC        | Cada grupo carrega um array `permissoes` (uma entrada por `Rota`, com flags de método HTTP). | `GET` valida a presença dos campos `nome`/`descricao`/`ativo`/`permissoes`. |
| Dois grupos fixos do seed    | `Administrador` (acesso total) e `Usuario` (acesso restrito) — únicos com esses nomes.       | Filtro por nome/descrição assume `toHaveLength(1)` para esses dois.         |
| RBAC restritivo              | O grupo `Usuario` (não-admin) tem todas as permissões desativadas nesta rota.                | Usuário comum aqui é sempre cenário negativo (`403`).                       |
| Autenticação em duas camadas | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                                | Sem sessão válida a resposta é sempre `498`.                                |

## Modelo de Grupo

| Campo        | Tipo    | Requerido | Observação                              |
| :----------- | :------ | :-------- | :-------------------------------------- |
| `nome`       | string  | Sim       | —                                       |
| `descricao`  | string  | Sim       | —                                       |
| `ativo`      | boolean | Não       | Default `true`.                         |
| `permissoes` | array   | Não       | Lista de `Rota` embutida, default `[]`. |

## Massa de Dados Recomendada

| Entidade                                | Objetivo nos testes                                                   |
| :-------------------------------------- | :-------------------------------------------------------------------- |
| Admin / Usuário Padrão (seed)           | Tokens bearer para os cenários felizes e de RBAC.                     |
| Grupos `Administrador`/`Usuario` (seed) | Usados só para os testes de filtro (nome/descrição), nunca alterados. |
| Grupo criado em teste                   | Nome sempre prefixado `zz-grupo-`, sufixo por UUID.                   |
| Rota existente (seed)                   | Usada como alvo de `POST /grupos/:id/rotas`.                          |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério              |
| :--------------------- | :------------------------------------------- | :-------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`. |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem.                 |

## GET /grupos — Listagem e filtros

| Funcionalidade                       | Comportamento Esperado                                       | Verificações                                                     | Critérios de Aceite                                                 |
| :----------------------------------- | :----------------------------------------------------------- | :--------------------------------------------------------------- | :------------------------------------------------------------------ |
| **Cenários felizes**                 |                                                              |                                                                  |                                                                     |
| Listagem com todos os campos         | Deve retornar `_id`/`nome`/`descricao`/`ativo`/`permissoes`. | `GET /grupos` autenticado como admin.                            | Retorna `200`; primeiro doc tem os 5 campos.                        |
| Filtro por nome                      | Deve retornar só o grupo `Usuario`.                          | `GET /grupos?nome=Usuario`.                                      | Retorna `200`; `data.docs` tem exatamente 1 item, `nome='Usuario'`. |
| Filtro por descrição                 | Deve retornar só o grupo com a descrição do admin.           | `GET /grupos?descricao=Grupo com acesso total a todas as rotas`. | Retorna `200`; `data.docs` tem exatamente 1 item.                   |
| **Cenários tristes**                 |                                                              |                                                                  |                                                                     |
| Usuário sem permissão administrativa | Deve bloquear.                                               | `GET /grupos` com token do usuário padrão.                       | Retorna `403`.                                                      |
| Sem token                            | Deve bloquear requisição não autenticada.                    | `GET /grupos` sem `Authorization`.                               | Retorna `498`.                                                      |

## GET /grupos/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                | Verificações                            | Critérios de Aceite                 |
| :--------------------- | :------------------------------------ | :-------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                       |                                         |                                     |
| Busca por id existente | Deve retornar o grupo correspondente. | `GET /grupos/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                       |                                         |                                     |
| Id válido inexistente  | Deve falhar pois não existe.          | `GET /grupos/000000000000000000000000`. | Retorna `404`.                      |

## POST /grupos — Cadastro

| Funcionalidade                       | Comportamento Esperado                       | Verificações                                | Critérios de Aceite               |
| :----------------------------------- | :------------------------------------------- | :------------------------------------------ | :-------------------------------- |
| **Cenários felizes**                 |                                              |                                             |                                   |
| Cadastro válido                      | Deve criar o grupo com `ativo=true`.         | `POST /grupos` com `nome` e `descricao`.    | Retorna `201`; `data.ativo=true`. |
| **Cenários tristes**                 |                                              |                                             |                                   |
| Sem `nome`                           | Deve rejeitar por campo obrigatório ausente. | `POST /grupos` com `{ descricao }`.         | Retorna `400`.                    |
| Usuário sem permissão administrativa | Deve bloquear.                               | `POST /grupos` com token do usuário padrão. | Retorna `403`.                    |

## POST /grupos/:id/rotas — Atribuição de rota

| Funcionalidade                    | Comportamento Esperado                         | Verificações                                                     | Critérios de Aceite |
| :-------------------------------- | :--------------------------------------------- | :--------------------------------------------------------------- | :------------------ |
| **Cenários felizes**              |                                                |                                                                  |                     |
| Adicionar rota existente ao grupo | Deve incluir a `Rota` nas permissões do grupo. | `POST /grupos/:id/rotas` com `idRota` de uma rota já cadastrada. | Retorna `200`.      |

## PATCH /grupos/:id — Atualização

| Funcionalidade       | Comportamento Esperado              | Verificações                              | Critérios de Aceite                    |
| :------------------- | :---------------------------------- | :---------------------------------------- | :------------------------------------- |
| **Cenários felizes** |                                     |                                           |                                        |
| Atualizar nome       | Deve renomear o grupo.              | `PATCH /grupos/:id` com novo `nome`.      | Retorna `200`; `data.nome` atualizado. |
| **Cenários tristes** |                                     |                                           |                                        |
| Grupo inexistente    | Deve falhar pois o alvo não existe. | `PATCH /grupos/000000000000000000000000`. | Retorna `404`.                         |

## DELETE /grupos/:id — Exclusão

| Funcionalidade          | Comportamento Esperado                | Verificações                               | Critérios de Aceite |
| :---------------------- | :------------------------------------ | :----------------------------------------- | :------------------ |
| **Cenários felizes**    |                                       |                                            |                     |
| Deletar grupo existente | Deve excluir o grupo criado em teste. | `DELETE /grupos/:id`.                      | Retorna `200`.      |
| **Cenários tristes**    |                                       |                                            |                     |
| Grupo inexistente       | Deve falhar pois o alvo não existe.   | `DELETE /grupos/000000000000000000000000`. | Retorna `404`.      |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                                                        |
| :------------------------- | :------------------------------------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente.                           |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array.                           |
| Autenticação               | Sem token sempre `498`.                                                                |
| RBAC restritivo            | Usuário comum sempre recebe `403` nesta rota — nenhum cenário positivo com esse token. |

## Estratégia de Organização dos Testes E2E

| Bloco                                | Objetivo                                                  |
| :----------------------------------- | :-------------------------------------------------------- |
| `beforeAll`                          | Autenticar admin e usuário padrão para toda a suíte.      |
| `describe('GET /grupos')`            | Listagem, filtros por nome/descrição, RBAC, autenticação. |
| `describe('GET /grupos/:id')`        | Detalhe, 404.                                             |
| `describe('POST /grupos')`           | Cadastro, validação, RBAC.                                |
| `describe('POST /grupos/:id/rotas')` | Atribuição de rota existente.                             |
| `describe('PATCH /grupos/:id')`      | Atualização, 404.                                         |
| `describe('DELETE /grupos/:id')`     | Exclusão, 404.                                            |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                                                                                                                                                                                                 |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste.                                                                                                                                                                   |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                                                                                                                                                                                      |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado — antes desta suíte esse usuário não existia de forma determinística no seed, o que fazia o cenário de RBAC depender de um usuário fixo (`vinicius@gmail.com`) nunca criado. |

## Observações de Implementação para os Casos E2E

| Ponto                       | Diretriz                                                                                                                                                       |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Não mutar os grupos do seed | Os testes de filtro (`nome`/`descricao`) leem `Administrador`/`Usuario` mas nunca os alteram — evita quebrar a asserção `toHaveLength(1)` de outras execuções. |
| Execução serial             | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.                                                                                |
