# Suite de Testes E2E — Localizacao (`/localizacoes`)

Testes E2E (endpoint) que validam cadastro, listagem, atualização e inativação de localizações.

Arquivo: `src/modules/localizacao/__tests__/localizacaoRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                        | Comportamento Atual do Sistema                                           | Impacto na Suite E2E                                  |
| :--------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------- |
| Nome único                   | Duas localizações não podem ter o mesmo `nome`.                          | Cobrir 400 na criação e na atualização.               |
| Autenticação em duas camadas | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.            | Sem sessão válida a resposta é sempre `498`.          |
| RBAC liberal                 | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota. | Usuário comum aqui é cenário positivo (201), não 403. |

## Modelo de Localizacao

| Campo       | Tipo    | Requerido | Observação             |
| :---------- | :------ | :-------- | :--------------------- |
| `nome`      | string  | Sim       | Único entre ativas.    |
| `ativo`     | boolean | Não       | Default `true`.        |
| `descricao` | string  | Não       | Máximo 200 caracteres. |

## Massa de Dados Recomendada

| Entidade                      | Objetivo nos testes                                       |
| :---------------------------- | :-------------------------------------------------------- |
| Admin / Usuário Padrão (seed) | Tokens bearer para os cenários felizes e de RBAC.         |
| Localização criada em teste   | Nome sempre prefixado `zz-localizacao-`, sufixo por UUID. |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério                                    |
| :--------------------- | :------------------------------------------- | :------------------------------------------ |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`.                       |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem, com as credenciais do usuário padrão. |

## POST /localizacoes — Cadastro

| Funcionalidade                       | Comportamento Esperado                            | Verificações                                                    | Critérios de Aceite                            |
| :----------------------------------- | :------------------------------------------------ | :-------------------------------------------------------------- | :--------------------------------------------- |
| **Cenários felizes**                 |                                                   |                                                                 |                                                |
| Cadastro válido                      | Deve criar a localização.                         | `POST /localizacoes` com `nome` único.                          | Retorna `201`; `data._id` presente.            |
| Usuário sem permissão administrativa | Deve permitir o cadastro (RBAC libera esta rota). | `POST /localizacoes` com token do usuário padrão.               | Retorna `201`.                                 |
| **Cenários tristes**                 |                                                   |                                                                 |                                                |
| Sem `nome`                           | Deve rejeitar por campo obrigatório ausente.      | `POST /localizacoes` com `{}`.                                  | Retorna `400`; `errors` contém `path: 'nome'`. |
| Nome já existente                    | Deve rejeitar duplicidade.                        | `POST` com `nome` de localização já cadastrada.                 | Retorna `400`.                                 |
| Sem token / token inválido           | Deve bloquear requisição não autenticada.         | `POST /localizacoes` sem header ou com `Bearer token-invalido`. | Retorna `498`.                                 |

## GET /localizacoes — Listagem

| Funcionalidade       | Comportamento Esperado                    | Verificações                             | Critérios de Aceite                                              |
| :------------------- | :---------------------------------------- | :--------------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes** |                                           |                                          |                                                                  |
| Listagem paginada    | Deve retornar coleção paginada.           | `GET /localizacoes` autenticado.         | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| **Cenários tristes** |                                           |                                          |                                                                  |
| Sem token            | Deve bloquear requisição não autenticada. | `GET /localizacoes` sem `Authorization`. | Retorna `498`.                                                   |

## GET /localizacoes/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                      | Verificações                                  | Critérios de Aceite                 |
| :--------------------- | :------------------------------------------ | :-------------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                             |                                               |                                     |
| Busca por id existente | Deve retornar a localização correspondente. | `GET /localizacoes/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                             |                                               |                                     |
| Id malformado          | Deve rejeitar formato inválido.             | `GET /localizacoes/id-invalido`.              | Retorna `400`.                      |
| Id válido inexistente  | Deve falhar pois não existe.                | `GET /localizacoes/000000000000000000000000`. | Retorna `404`.                      |

## PATCH /localizacoes/:id — Atualização

| Funcionalidade                         | Comportamento Esperado              | Verificações                                    | Critérios de Aceite                    |
| :------------------------------------- | :---------------------------------- | :---------------------------------------------- | :------------------------------------- |
| **Cenários felizes**                   |                                     |                                                 |                                        |
| Atualizar nome                         | Deve renomear a localização.        | `PATCH /localizacoes/:id` com novo `nome`.      | Retorna `200`; `data.nome` atualizado. |
| **Cenários tristes**                   |                                     |                                                 |                                        |
| Nome já existente em outra localização | Deve rejeitar duplicidade.          | `PATCH` usando `nome` de outra localização.     | Retorna `400`.                         |
| Localização inexistente                | Deve falhar pois o alvo não existe. | `PATCH /localizacoes/000000000000000000000000`. | Retorna `404`.                         |

## PATCH /localizacoes/:id/inativar — Inativação

| Funcionalidade                 | Comportamento Esperado                  | Verificações                                             | Critérios de Aceite                |
| :----------------------------- | :-------------------------------------- | :------------------------------------------------------- | :--------------------------------- |
| **Cenários felizes**           |                                         |                                                          |                                    |
| Inativar localização existente | Deve marcar a localização como inativa. | `PATCH /localizacoes/:id/inativar`.                      | Retorna `200`; `data.ativo=false`. |
| **Cenários tristes**           |                                         |                                                          |                                    |
| Localização inexistente        | Deve falhar pois o alvo não existe.     | `PATCH /localizacoes/000000000000000000000000/inativar`. | Retorna `404`.                     |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                              |
| :------------------------- | :----------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente. |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array. |
| Autenticação               | Sem token/token inválido sempre `498`.                       |
| Massa de dados             | Todo nome criado em teste usa prefixo `zz-localizacao-`.     |

## Estratégia de Organização dos Testes E2E

| Bloco                                          | Objetivo                                              |
| :--------------------------------------------- | :---------------------------------------------------- |
| `beforeAll`                                    | Autenticar admin e usuário padrão para toda a suíte.  |
| `describe('POST /localizacoes')`               | Cadastro, validação, duplicidade, RBAC, autenticação. |
| `describe('GET /localizacoes')`                | Listagem paginada.                                    |
| `describe('GET /localizacoes/:id')`            | Detalhe, id malformado, 404.                          |
| `describe('PATCH /localizacoes/:id')`          | Atualização, duplicidade, 404.                        |
| `describe('PATCH /localizacoes/:id/inativar')` | Inativação, 404.                                      |

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
