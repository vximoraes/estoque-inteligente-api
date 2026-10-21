# Suite de Testes E2E — Emprestimo (`/emprestimos`)

Testes E2E (endpoint) que validam o ciclo de vida de um empréstimo por quantidade: criação, devolução (total/parcial), desfazer devolução, atualização e exclusão.

Arquivo: `src/modules/emprestimo/__tests__/emprestimoRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                               | Comportamento Atual do Sistema                                                                                               | Impacto na Suite E2E                                                                  |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| Dois modos de empréstimo            | `item`+`localizacao`+`quantidade_emprestada` (consumo) ou `patrimonio` (unidade). Esta suíte cobre só o modo por quantidade. | `criarDependenciasEmprestimo` monta item/localização/estoque via `criarMovimentacao`. |
| `quantidade_aberta` é derivado      | Calculado como `quantidade_emprestada - quantidade_devolvida`, nunca enviado pelo cliente.                                   | Assert sobre o valor retornado, nunca enviado no payload.                             |
| Exclusão bloqueada com saldo aberto | `DELETE` só é permitido quando `quantidade_aberta === 0`; senão retorna `400`.                                               | Cobrir os dois casos: bloqueado (aberto) e permitido (devolvido).                     |
| Autenticação em duas camadas        | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                                                                | Sem sessão válida a resposta é sempre `498`.                                          |
| RBAC liberal                        | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota.                                                     | Usuário comum aqui é cenário positivo (201), não 403.                                 |

## Modelo de Emprestimo

| Campo                          | Tipo     | Requerido             | Observação                                        |
| :----------------------------- | :------- | :-------------------- | :------------------------------------------------ |
| `item`                         | ObjectId | Sim (modo quantidade) | Obrigatório quando não há `patrimonio`.           |
| `localizacao`                  | ObjectId | Sim                   | —                                                 |
| `quantidade_emprestada`        | number   | Sim (modo quantidade) | Entre 1 e 999.999.999.                            |
| `quantidade_devolvida`         | number   | —                     | Default `0`; atualizado por `PATCH .../devolver`. |
| `quantidade_aberta` (derivado) | number   | —                     | `quantidade_emprestada - quantidade_devolvida`.   |
| `solicitante_nome`             | string   | Sim                   | 3 a 120 caracteres.                               |
| `data_prevista_devolucao`      | Date     | Não                   | Deve ser uma data futura.                         |

## Massa de Dados Recomendada

| Entidade                                     | Objetivo nos testes                                                              |
| :------------------------------------------- | :------------------------------------------------------------------------------- |
| Admin / Usuário Padrão (seed)                | Tokens bearer para os cenários felizes e de RBAC.                                |
| Item + Localização + Movimentação de entrada | Pré-requisito de todo empréstimo por quantidade (`criarDependenciasEmprestimo`). |

## Pré-condições Técnicas da Suite

| Etapa                                   | Objetivo                                                                 | Critério                       |
| :-------------------------------------- | :----------------------------------------------------------------------- | :----------------------------- |
| `logarAdmin()` / `logarUsuarioPadrao()` | Autenticar admin e usuário não-admin.                                    | `200` e `body.token` em ambos. |
| `criarDependenciasEmprestimo()`         | Cria item, localização e movimentação de entrada com estoque suficiente. | `201` em cada etapa.           |

## POST /emprestimos — Criação

| Funcionalidade                       | Comportamento Esperado                                   | Verificações                                                            | Critérios de Aceite                                                    |
| :----------------------------------- | :------------------------------------------------------- | :---------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **Cenários felizes**                 |                                                          |                                                                         |                                                                        |
| Criação válida                       | Deve criar o empréstimo com `quantidade_aberta` correta. | `POST /emprestimos` com `item`, `localizacao`, `quantidade_emprestada`. | Retorna `201`; `data.quantidade_aberta` igual à quantidade emprestada. |
| Usuário sem permissão administrativa | Deve permitir a criação (RBAC libera esta rota).         | `POST /emprestimos` com token do usuário padrão.                        | Retorna `201`.                                                         |
| **Cenários tristes**                 |                                                          |                                                                         |                                                                        |
| Sem campos obrigatórios              | Deve rejeitar payload vazio.                             | `POST /emprestimos` com `{}`.                                           | Retorna `400`.                                                         |
| Sem token                            | Deve bloquear requisição não autenticada.                | `POST /emprestimos` sem `Authorization`.                                | Retorna `498`.                                                         |

## GET /emprestimos — Listagem

| Funcionalidade       | Comportamento Esperado                    | Verificações                            | Critérios de Aceite                                              |
| :------------------- | :---------------------------------------- | :-------------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes** |                                           |                                         |                                                                  |
| Listagem paginada    | Deve retornar coleção paginada.           | `GET /emprestimos` autenticado.         | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| **Cenários tristes** |                                           |                                         |                                                                  |
| Sem token            | Deve bloquear requisição não autenticada. | `GET /emprestimos` sem `Authorization`. | Retorna `498`.                                                   |

## GET /emprestimos/tendencia — Série temporal

| Funcionalidade       | Comportamento Esperado                   | Verificações                              | Critérios de Aceite           |
| :------------------- | :--------------------------------------- | :---------------------------------------- | :---------------------------- |
| **Cenários felizes** |                                          |                                           |                               |
| Retornar tendência   | Deve retornar a série temporal agregada. | `GET /emprestimos/tendencia` autenticado. | Retorna `200`; `error=false`. |

## GET /emprestimos/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                     | Verificações                                 | Critérios de Aceite |
| :--------------------- | :----------------------------------------- | :------------------------------------------- | :------------------ |
| **Cenários felizes**   |                                            |                                              |                     |
| Busca por id existente | Deve retornar o empréstimo correspondente. | `GET /emprestimos/:id`.                      | Retorna `200`.      |
| **Cenários tristes**   |                                            |                                              |                     |
| Id válido inexistente  | Deve falhar pois não existe.               | `GET /emprestimos/000000000000000000000000`. | Retorna `404`.      |

## PATCH /emprestimos/:id/devolver — Devolução

| Funcionalidade         | Comportamento Esperado                                      | Verificações                                                       | Critérios de Aceite                                                 |
| :--------------------- | :---------------------------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------ |
| **Cenários felizes**   |                                                             |                                                                    |                                                                     |
| Devolução parcial      | Deve reduzir `quantidade_aberta` e manter `status='Ativo'`. | `PATCH .../devolver` com `quantidade_devolvida` menor que o total. | Retorna `200`; `data.quantidade_aberta` reduzida; `status='Ativo'`. |
| **Cenários tristes**   |                                                             |                                                                    |                                                                     |
| Empréstimo inexistente | Deve falhar pois o alvo não existe.                         | `PATCH /emprestimos/000000000000000000000000/devolver`.            | Retorna `404`.                                                      |

## PATCH /emprestimos/:id/desfazer-devolucao — Estorno de devolução

| Funcionalidade                | Comportamento Esperado                                            | Verificações                                                      | Critérios de Aceite                                     |
| :---------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------------- | :------------------------------------------------------ |
| **Cenários felizes**          |                                                                   |                                                                   |                                                         |
| Desfazer devolução registrada | Deve restaurar `quantidade_aberta` ao valor anterior à devolução. | `PATCH .../devolver` seguido de `PATCH .../desfazer-devolucao`.   | Retorna `200`; `data.quantidade_aberta` volta ao total. |
| **Cenários tristes**          |                                                                   |                                                                   |                                                         |
| Empréstimo inexistente        | Deve falhar pois o alvo não existe.                               | `PATCH /emprestimos/000000000000000000000000/desfazer-devolucao`. | Retorna `404`.                                          |

## PUT /emprestimos/:id — Atualização

| Funcionalidade         | Comportamento Esperado                   | Verificações                                 | Critérios de Aceite |
| :--------------------- | :--------------------------------------- | :------------------------------------------- | :------------------ |
| **Cenários felizes**   |                                          |                                              |                     |
| Atualizar observações  | Deve atualizar `observacoes_emprestimo`. | `PUT /emprestimos/:id` com nova observação.  | Retorna `200`.      |
| **Cenários tristes**   |                                          |                                              |                     |
| Empréstimo inexistente | Deve falhar pois o alvo não existe.      | `PUT /emprestimos/000000000000000000000000`. | Retorna `404`.      |

## DELETE /emprestimos/:id — Exclusão

| Funcionalidade                     | Comportamento Esperado                               | Verificações                                               | Critérios de Aceite |
| :--------------------------------- | :--------------------------------------------------- | :--------------------------------------------------------- | :------------------ |
| **Cenários tristes**               |                                                      |                                                            |                     |
| Empréstimo em aberto               | Deve rejeitar exclusão enquanto houver saldo aberto. | `DELETE` logo após a criação (sem devolução).              | Retorna `400`.      |
| **Cenários felizes**               |                                                      |                                                            |                     |
| Empréstimo já totalmente devolvido | Deve excluir quando `quantidade_aberta === 0`.       | `PATCH .../devolver` com devolução total, depois `DELETE`. | Retorna `200`.      |
| **Cenários tristes**               |                                                      |                                                            |                     |
| Empréstimo inexistente             | Deve falhar pois o alvo não existe.                  | `DELETE /emprestimos/000000000000000000000000`.            | Retorna `404`.      |

## Cenários Transversais Obrigatórios (E2E)

| Tema                         | Verificação E2E                                                    |
| :--------------------------- | :----------------------------------------------------------------- |
| Contrato básico de sucesso   | `error=false`, `code` igual ao status HTTP, `data` presente.       |
| Contrato básico de erro      | `error=true`, `code` igual ao status HTTP, `errors` é array.       |
| Autenticação                 | Sem token sempre `498`.                                            |
| Regra de negócio de exclusão | `DELETE` só é aceito com saldo zerado — testado nos dois sentidos. |

## Estratégia de Organização dos Testes E2E

| Bloco                                                   | Objetivo                                                 |
| :------------------------------------------------------ | :------------------------------------------------------- |
| `beforeAll`                                             | Autenticar admin e usuário padrão para toda a suíte.     |
| `describe('POST /emprestimos')`                         | Criação, validação, RBAC, autenticação.                  |
| `describe('GET /emprestimos')`                          | Listagem paginada.                                       |
| `describe('GET /emprestimos/tendencia')`                | Série temporal agregada.                                 |
| `describe('GET /emprestimos/:id')`                      | Detalhe, 404.                                            |
| `describe('PATCH /emprestimos/:id/devolver')`           | Devolução parcial, 404.                                  |
| `describe('PATCH /emprestimos/:id/desfazer-devolucao')` | Estorno de devolução, 404.                               |
| `describe('PUT /emprestimos/:id')`                      | Atualização, 404.                                        |
| `describe('DELETE /emprestimos/:id')`                   | Bloqueio com saldo aberto, exclusão após devolução, 404. |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                             | Diretriz                                                                                                               |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| Empréstimo de unidade patrimonial | Fora do escopo desta suíte — coberto indiretamente pelas transições de status testadas em `suite-teste-patrimonio.md`. |
| Execução serial                   | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.                                        |
