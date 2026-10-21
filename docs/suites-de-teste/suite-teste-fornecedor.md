# Suite de Testes E2E — Fornecedor (`/fornecedores`)

Testes E2E (endpoint) que validam cadastro, listagem, busca, atualização e inativação de fornecedores.

Arquivo: `src/modules/fornecedor/__tests__/fornecedorRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                        | Comportamento Atual do Sistema                                           | Impacto na Suite E2E                                  |
| :--------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------- |
| Nome único                   | Dois fornecedores não podem ter o mesmo `nome`.                          | Cobrir 400 na criação e na atualização.               |
| Sem exclusão física          | Não existe `DELETE /fornecedores/:id`; remoção é sempre via inativação.  | Suíte não testa `DELETE`.                             |
| Autenticação em duas camadas | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.            | Sem sessão válida a resposta é sempre `498`.          |
| RBAC liberal                 | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota. | Usuário comum aqui é cenário positivo (201), não 403. |

## Modelo de Fornecedor

| Campo   | Tipo    | Requerido | Observação          |
| :------ | :------ | :-------- | :------------------ |
| `nome`  | string  | Sim       | Único entre ativos. |
| `ativo` | boolean | Não       | Default `true`.     |

## Massa de Dados Recomendada

| Entidade                      | Objetivo nos testes                                      |
| :---------------------------- | :------------------------------------------------------- |
| Admin / Usuário Padrão (seed) | Tokens bearer para os cenários felizes e de RBAC.        |
| Fornecedor criado em teste    | Nome sempre prefixado `zz-fornecedor-`, sufixo por UUID. |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério              |
| :--------------------- | :------------------------------------------- | :-------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`. |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem.                 |

## POST /fornecedores — Cadastro

| Funcionalidade                       | Comportamento Esperado                                    | Verificações                                                    | Critérios de Aceite                            |
| :----------------------------------- | :-------------------------------------------------------- | :-------------------------------------------------------------- | :--------------------------------------------- |
| **Cenários felizes**                 |                                                           |                                                                 |                                                |
| Cadastro válido                      | Deve criar o fornecedor.                                  | `POST /fornecedores` com `nome` único.                          | Retorna `201`; `data._id` presente.            |
| Resposta sem campos sensíveis        | Não deve retornar `senha`/`password` no documento criado. | Inspecionar `data` da resposta de criação.                      | `data` não tem `senha` nem `password`.         |
| Usuário sem permissão administrativa | Deve permitir o cadastro (RBAC libera esta rota).         | `POST /fornecedores` com token do usuário padrão.               | Retorna `201`.                                 |
| **Cenários tristes**                 |                                                           |                                                                 |                                                |
| Sem `nome`                           | Deve rejeitar por campo obrigatório ausente.              | `POST /fornecedores` com `{}`.                                  | Retorna `400`; `errors` contém `path: 'nome'`. |
| Nome já existente                    | Deve rejeitar duplicidade.                                | `POST` com `nome` de fornecedor já cadastrado.                  | Retorna `400`.                                 |
| Sem token / token inválido           | Deve bloquear requisição não autenticada.                 | `POST /fornecedores` sem header ou com `Bearer token-invalido`. | Retorna `498`.                                 |

## GET /fornecedores — Listagem e busca

| Funcionalidade       | Comportamento Esperado                                    | Verificações                             | Critérios de Aceite                                              |
| :------------------- | :-------------------------------------------------------- | :--------------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes** |                                                           |                                          |                                                                  |
| Listagem paginada    | Deve retornar coleção paginada.                           | `GET /fornecedores` autenticado.         | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| Filtro por nome      | Deve retornar apenas fornecedores que casam com o filtro. | `GET /fornecedores?nome=<nome>`.         | Retorna `200`; `data.docs` contém o fornecedor esperado.         |
| **Cenários tristes** |                                                           |                                          |                                                                  |
| Sem token            | Deve bloquear requisição não autenticada.                 | `GET /fornecedores` sem `Authorization`. | Retorna `498`.                                                   |

## GET /fornecedores/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                     | Verificações                                  | Critérios de Aceite                 |
| :--------------------- | :----------------------------------------- | :-------------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                            |                                               |                                     |
| Busca por id existente | Deve retornar o fornecedor correspondente. | `GET /fornecedores/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                            |                                               |                                     |
| Id malformado          | Deve rejeitar formato inválido.            | `GET /fornecedores/id-invalido`.              | Retorna `400`.                      |
| Id válido inexistente  | Deve falhar pois não existe.               | `GET /fornecedores/000000000000000000000000`. | Retorna `404`.                      |

## PATCH /fornecedores/:id — Atualização

| Funcionalidade                        | Comportamento Esperado              | Verificações                                    | Critérios de Aceite                    |
| :------------------------------------ | :---------------------------------- | :---------------------------------------------- | :------------------------------------- |
| **Cenários felizes**                  |                                     |                                                 |                                        |
| Atualizar nome                        | Deve renomear o fornecedor.         | `PATCH /fornecedores/:id` com novo `nome`.      | Retorna `200`; `data.nome` atualizado. |
| **Cenários tristes**                  |                                     |                                                 |                                        |
| Nome já existente em outro fornecedor | Deve rejeitar duplicidade.          | `PATCH` usando `nome` de outro fornecedor.      | Retorna `400`.                         |
| Fornecedor inexistente                | Deve falhar pois o alvo não existe. | `PATCH /fornecedores/000000000000000000000000`. | Retorna `404`.                         |

## PATCH /fornecedores/:id/inativar — Inativação

| Funcionalidade                | Comportamento Esperado                 | Verificações                                             | Critérios de Aceite                |
| :---------------------------- | :------------------------------------- | :------------------------------------------------------- | :--------------------------------- |
| **Cenários felizes**          |                                        |                                                          |                                    |
| Inativar fornecedor existente | Deve marcar o fornecedor como inativo. | `PATCH /fornecedores/:id/inativar`.                      | Retorna `200`; `data.ativo=false`. |
| **Cenários tristes**          |                                        |                                                          |                                    |
| Fornecedor inexistente        | Deve falhar pois o alvo não existe.    | `PATCH /fornecedores/000000000000000000000000/inativar`. | Retorna `404`.                     |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                              |
| :------------------------- | :----------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente. |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array. |
| Autenticação               | Sem token/token inválido sempre `498`.                       |
| Massa de dados             | Todo nome criado em teste usa prefixo `zz-fornecedor-`.      |

## Estratégia de Organização dos Testes E2E

| Bloco                                          | Objetivo                                                 |
| :--------------------------------------------- | :------------------------------------------------------- |
| `beforeAll`                                    | Autenticar admin e usuário padrão para toda a suíte.     |
| `describe('POST /fornecedores')`               | Cadastro, validação, duplicidade, dados sensíveis, RBAC. |
| `describe('GET /fornecedores')`                | Listagem paginada e filtro por nome.                     |
| `describe('GET /fornecedores/:id')`            | Detalhe, id malformado, 404.                             |
| `describe('PATCH /fornecedores/:id')`          | Atualização, duplicidade, 404.                           |
| `describe('PATCH /fornecedores/:id/inativar')` | Inativação, 404.                                         |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                | Diretriz                                                                                      |
| :------------------- | :-------------------------------------------------------------------------------------------- |
| Helper compartilhado | `test/helpers/rotasTestHelper.ts` concentra login, factories e asserts de envelope/paginação. |
| Execução serial      | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.               |
