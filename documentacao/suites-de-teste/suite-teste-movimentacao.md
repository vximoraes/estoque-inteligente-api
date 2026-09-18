# Suite de Testes E2E — Movimentacao (`/movimentacoes`)

Testes E2E (endpoint) que validam registro e consulta de movimentações de entrada/saída de estoque, incluindo os endpoints agregados de resumo e tendência.

Arquivo: `src/modules/movimentacao/__tests__/movimentacaoRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                         | Comportamento Atual do Sistema                                                    | Impacto na Suite E2E                                   |
| :---------------------------- | :-------------------------------------------------------------------------------- | :----------------------------------------------------- |
| Sem exclusão/atualização      | Só existem `GET` e `POST` em `/movimentacoes` — é um registro histórico imutável. | Suíte não testa `PATCH`/`DELETE`.                      |
| Item inexistente é erro forte | `POST` com `item` inexistente falha com `404`, não `400`.                         | Cenário de referência inválida usa status exato `404`. |
| Autenticação em duas camadas  | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                     | Sem sessão válida a resposta é sempre `498`.           |
| RBAC liberal                  | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota.          | Usuário comum aqui é cenário positivo (201), não 403.  |

## Modelo de Movimentacao

| Campo         | Tipo     | Requerido | Observação                                                     |
| :------------ | :------- | :-------- | :------------------------------------------------------------- |
| `tipo`        | string   | Não       | `'entrada'` ou `'saida'`.                                      |
| `quantidade`  | number   | Não       | String numérica na entrada.                                    |
| `item`        | ObjectId | Sim       | Deve existir.                                                  |
| `localizacao` | ObjectId | Sim       | Deve existir.                                                  |
| `data_hora`   | —        | —         | Preenchido automaticamente; rejeitado se enviado pelo cliente. |

## Massa de Dados Recomendada

| Entidade                            | Objetivo nos testes                                       |
| :---------------------------------- | :-------------------------------------------------------- |
| Admin / Usuário Padrão (seed)       | Tokens bearer para os cenários felizes e de RBAC.         |
| Item + Localização criados em teste | Pré-requisito de toda movimentação (`criarMovimentacao`). |

## Pré-condições Técnicas da Suite

| Etapa                                | Objetivo                                     | Critério              |
| :----------------------------------- | :------------------------------------------- | :-------------------- |
| `logarAdmin()`                       | Autenticar com credenciais do admin semeado. | `200` e `body.token`. |
| `logarUsuarioPadrao()`               | Autenticar com o usuário não-admin semeado.  | Idem.                 |
| `criarItem()` / `criarLocalizacao()` | Pré-requisitos de uma movimentação.          | `201` em ambos.       |

## POST /movimentacoes — Registro

| Funcionalidade                       | Comportamento Esperado                            | Verificações                                                        | Critérios de Aceite                 |
| :----------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------ | :---------------------------------- |
| **Cenários felizes**                 |                                                   |                                                                     |                                     |
| Registro de entrada válido           | Deve criar a movimentação.                        | `POST /movimentacoes` com `tipo: 'entrada'`, `item`, `localizacao`. | Retorna `201`; `data._id` presente. |
| Usuário sem permissão administrativa | Deve permitir o registro (RBAC libera esta rota). | `POST /movimentacoes` com token do usuário padrão.                  | Retorna `201`.                      |
| **Cenários tristes**                 |                                                   |                                                                     |                                     |
| Sem campos obrigatórios              | Deve rejeitar payload vazio.                      | `POST /movimentacoes` com `{}`.                                     | Retorna `400`.                      |
| Item inexistente                     | Deve falhar pois o item referenciado não existe.  | `POST` com `item: 000000000000000000000000`.                        | Retorna `404`.                      |
| Sem token                            | Deve bloquear requisição não autenticada.         | `POST /movimentacoes` sem `Authorization`.                          | Retorna `498`.                      |

## GET /movimentacoes — Listagem

| Funcionalidade       | Comportamento Esperado                    | Verificações                              | Critérios de Aceite                                              |
| :------------------- | :---------------------------------------- | :---------------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes** |                                           |                                           |                                                                  |
| Listagem paginada    | Deve retornar coleção paginada.           | `GET /movimentacoes` autenticado.         | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| **Cenários tristes** |                                           |                                           |                                                                  |
| Sem token            | Deve bloquear requisição não autenticada. | `GET /movimentacoes` sem `Authorization`. | Retorna `498`.                                                   |

## GET /movimentacoes/resumo — Resumo agregado

| Funcionalidade        | Comportamento Esperado                       | Verificações                             | Critérios de Aceite           |
| :-------------------- | :------------------------------------------- | :--------------------------------------- | :---------------------------- |
| **Cenários felizes**  |                                              |                                          |                               |
| Retornar resumo geral | Deve retornar o agregado de entradas/saídas. | `GET /movimentacoes/resumo` autenticado. | Retorna `200`; `error=false`. |

## GET /movimentacoes/tendencia — Série temporal

| Funcionalidade       | Comportamento Esperado                   | Verificações                                | Critérios de Aceite           |
| :------------------- | :--------------------------------------- | :------------------------------------------ | :---------------------------- |
| **Cenários felizes** |                                          |                                             |                               |
| Retornar tendência   | Deve retornar a série temporal agregada. | `GET /movimentacoes/tendencia` autenticado. | Retorna `200`; `error=false`. |

## GET /movimentacoes/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                       | Verificações                                   | Critérios de Aceite                 |
| :--------------------- | :------------------------------------------- | :--------------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                              |                                                |                                     |
| Busca por id existente | Deve retornar a movimentação correspondente. | `GET /movimentacoes/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                              |                                                |                                     |
| Id malformado          | Deve rejeitar formato inválido.              | `GET /movimentacoes/id-invalido`.              | Retorna `400`.                      |
| Id válido inexistente  | Deve falhar pois não existe.                 | `GET /movimentacoes/000000000000000000000000`. | Retorna `404`.                      |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                                    |
| :------------------------- | :----------------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente.       |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array.       |
| Autenticação               | Sem token sempre `498`.                                            |
| Imutabilidade              | Nenhum teste tenta `PATCH`/`DELETE` — rota não expõe esses verbos. |

## Estratégia de Organização dos Testes E2E

| Bloco                                      | Objetivo                                                   |
| :----------------------------------------- | :--------------------------------------------------------- |
| `beforeAll`                                | Autenticar admin e usuário padrão para toda a suíte.       |
| `describe('POST /movimentacoes')`          | Registro, validação, item inexistente, RBAC, autenticação. |
| `describe('GET /movimentacoes')`           | Listagem paginada.                                         |
| `describe('GET /movimentacoes/resumo')`    | Resumo agregado.                                           |
| `describe('GET /movimentacoes/tendencia')` | Série temporal.                                            |
| `describe('GET /movimentacoes/:id')`       | Detalhe, id malformado, 404.                               |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                | Diretriz                                                                                            |
| :------------------- | :-------------------------------------------------------------------------------------------------- |
| Helper compartilhado | `test/helpers/rotasTestHelper.ts::criarMovimentacao` cria item e localização quando não informados. |
| Execução serial      | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.                     |
