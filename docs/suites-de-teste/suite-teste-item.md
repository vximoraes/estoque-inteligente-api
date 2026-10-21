# Suite de Testes E2E — Item (`/itens`)

Testes E2E (endpoint) que validam cadastro, listagem, estatísticas, atualização e inativação de itens de almoxarifado (consumo).

Arquivo: `src/modules/item/__tests__/itemRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                            | Comportamento Atual do Sistema                                                                                                                                      | Impacto na Suite E2E                                        |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------- |
| Categoria deve ser de consumo    | Um item só pode usar categoria com `tipo: 'consumo'`; categoria `permanente` é rejeitada.                                                                           | Cobrir `400` ao usar categoria de tipo errado.              |
| Status derivado, não editável    | `status` (`Indisponível`/`Baixo Estoque`/`Em Estoque`) é calculado a partir de `estoque_minimo` e da quantidade agregada em `estoques`, nunca enviado pelo cliente. | Ao criar sem estoque, `status` sempre nasce `Indisponível`. |
| `quantidade` só via movimentação | `PATCH /itens/:id` ignora silenciosamente um `quantidade` enviado no body.                                                                                          | Assert explícito de que o valor enviado não é aplicado.     |
| Nome único                       | Dois itens não podem ter o mesmo `nome`.                                                                                                                            | Cobrir `400` na criação e na atualização.                   |
| Autenticação em duas camadas     | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                                                                                                       | Sem sessão válida a resposta é sempre `498`.                |
| RBAC liberal                     | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota.                                                                                            | Usuário comum aqui é cenário positivo (201), não 403.       |

## Modelo de Item

| Campo               | Tipo     | Requerido | Observação                                               |
| :------------------ | :------- | :-------- | :------------------------------------------------------- |
| `nome`              | string   | Sim       | Único entre ativos.                                      |
| `categoria`         | ObjectId | Sim       | Deve referenciar categoria com `tipo: 'consumo'`.        |
| `estoque_minimo`    | number   | Não       | String numérica na entrada; default `0`.                 |
| `tipo`              | string   | Não       | Sempre `'consumo'`; imutável.                            |
| `ativo`             | boolean  | Não       | Default `true`.                                          |
| `status` (derivado) | string   | —         | Calculado pelo hook de `Estoque`, não aceito no payload. |

## Massa de Dados Recomendada

| Entidade                      | Objetivo nos testes                                             |
| :---------------------------- | :-------------------------------------------------------------- |
| Admin / Usuário Padrão (seed) | Tokens bearer para os cenários felizes e de RBAC.               |
| Categoria de consumo          | Pré-requisito de todo item criado em teste (`tipo: 'consumo'`). |
| Categoria de permanente       | Usada só para o cenário de rejeição de categoria incompatível.  |
| Item criado em teste          | Nome sempre prefixado `zz-item-`, sufixo por UUID.              |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério              |
| :--------------------- | :------------------------------------------- | :-------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`. |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem.                 |
| `criarCategoria()`     | Categoria de consumo pré-requisito de item.  | `201` e `data._id`.   |

## POST /itens — Cadastro

| Funcionalidade                       | Comportamento Esperado                                           | Verificações                                                 | Critérios de Aceite                                             |
| :----------------------------------- | :--------------------------------------------------------------- | :----------------------------------------------------------- | :-------------------------------------------------------------- |
| **Cenários felizes**                 |                                                                  |                                                              |                                                                 |
| Cadastro válido com status inicial   | Deve criar o item já com `ativo=true` e `status='Indisponível'`. | `POST /itens` com `categoria` de consumo e `estoque_minimo`. | Retorna `201`; `data.ativo=true`; `data.status='Indisponível'`. |
| Usuário sem permissão administrativa | Deve permitir o cadastro (RBAC libera esta rota).                | `POST /itens` com token do usuário padrão.                   | Retorna `201`.                                                  |
| **Cenários tristes**                 |                                                                  |                                                              |                                                                 |
| Sem campos obrigatórios              | Deve rejeitar por `categoria` ausente.                           | `POST /itens` com `{}`.                                      | Retorna `400`; `errors` contém `path: 'categoria'`.             |
| Nome já existente                    | Deve rejeitar duplicidade.                                       | `POST` com `nome` de item já cadastrado.                     | Retorna `400`.                                                  |
| Categoria inexistente                | Deve rejeitar referência inválida.                               | `POST` com `categoria: 000000000000000000000000`.            | Retorna `400`; `errors` contém `path: 'categoria'`.             |
| Categoria de tipo permanente         | Deve rejeitar categoria incompatível com item de consumo.        | `POST` usando categoria com `tipo: 'permanente'`.            | Retorna `400`.                                                  |
| Sem token / token inválido           | Deve bloquear requisição não autenticada.                        | `POST /itens` sem header ou com `Bearer token-invalido`.     | Retorna `498`.                                                  |

## GET /itens — Listagem

| Funcionalidade       | Comportamento Esperado                    | Verificações                      | Critérios de Aceite                                              |
| :------------------- | :---------------------------------------- | :-------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes** |                                           |                                   |                                                                  |
| Listagem paginada    | Deve retornar coleção paginada.           | `GET /itens` autenticado.         | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| **Cenários tristes** |                                           |                                   |                                                                  |
| Sem token            | Deve bloquear requisição não autenticada. | `GET /itens` sem `Authorization`. | Retorna `498`.                                                   |

## GET /itens/stats — Estatísticas

| Funcionalidade               | Comportamento Esperado                    | Verificações                    | Critérios de Aceite           |
| :--------------------------- | :---------------------------------------- | :------------------------------ | :---------------------------- |
| **Cenários felizes**         |                                           |                                 |                               |
| Retornar estatísticas gerais | Deve retornar o resumo agregado de itens. | `GET /itens/stats` autenticado. | Retorna `200`; `error=false`. |

## GET /itens/:id — Detalhe

| Funcionalidade         | Comportamento Esperado               | Verificações                           | Critérios de Aceite                 |
| :--------------------- | :----------------------------------- | :------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                      |                                        |                                     |
| Busca por id existente | Deve retornar o item correspondente. | `GET /itens/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                      |                                        |                                     |
| Id malformado          | Deve rejeitar formato inválido.      | `GET /itens/id-invalido`.              | Retorna `400`.                      |
| Id válido inexistente  | Deve falhar pois não existe.         | `GET /itens/000000000000000000000000`. | Retorna `404`.                      |

## PATCH /itens/:id — Atualização

| Funcionalidade                            | Comportamento Esperado                              | Verificações                             | Critérios de Aceite                           |
| :---------------------------------------- | :-------------------------------------------------- | :--------------------------------------- | :-------------------------------------------- |
| **Cenários felizes**                      |                                                     |                                          |                                               |
| Atualizar campos permitidos               | Deve renomear o item.                               | `PATCH /itens/:id` com novo `nome`.      | Retorna `200`; `data.nome` atualizado.        |
| Recalcular status ao mudar estoque_minimo | Deve recalcular `status` a partir do novo mínimo.   | `PATCH` com novo `estoque_minimo`.       | Retorna `200`; `data.status` reflete a regra. |
| `quantidade` no body é ignorado           | Não deve permitir alterar `quantidade` diretamente. | `PATCH` com `{ quantidade: 999 }`.       | Retorna `200`; `data.quantidade !== 999`.     |
| **Cenários tristes**                      |                                                     |                                          |                                               |
| Nome já existente em outro item           | Deve rejeitar duplicidade.                          | `PATCH` usando `nome` de outro item.     | Retorna `400`.                                |
| Item inexistente                          | Deve falhar pois o alvo não existe.                 | `PATCH /itens/000000000000000000000000`. | Retorna `404`.                                |

## PATCH /itens/:id/inativar — Inativação

| Funcionalidade          | Comportamento Esperado              | Verificações                                      | Critérios de Aceite                |
| :---------------------- | :---------------------------------- | :------------------------------------------------ | :--------------------------------- |
| **Cenários felizes**    |                                     |                                                   |                                    |
| Inativar item existente | Deve marcar o item como inativo.    | `PATCH /itens/:id/inativar`.                      | Retorna `200`; `data.ativo=false`. |
| **Cenários tristes**    |                                     |                                                   |                                    |
| Item inexistente        | Deve falhar pois o alvo não existe. | `PATCH /itens/000000000000000000000000/inativar`. | Retorna `404`.                     |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                              |
| :------------------------- | :----------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente. |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array. |
| Autenticação               | Sem token/token inválido sempre `498`.                       |
| Massa de dados             | Todo nome criado em teste usa prefixo `zz-item-`.            |

## Estratégia de Organização dos Testes E2E

| Bloco                                   | Objetivo                                                      |
| :-------------------------------------- | :------------------------------------------------------------ |
| `beforeAll`                             | Autenticar admin e usuário padrão para toda a suíte.          |
| `describe('POST /itens')`               | Cadastro, validação, duplicidade, categoria inválida, RBAC.   |
| `describe('GET /itens')`                | Listagem paginada.                                            |
| `describe('GET /itens/stats')`          | Estatísticas agregadas.                                       |
| `describe('GET /itens/:id')`            | Detalhe, id malformado, 404.                                  |
| `describe('PATCH /itens/:id')`          | Atualização, imutabilidade de `quantidade`, duplicidade, 404. |
| `describe('PATCH /itens/:id/inativar')` | Inativação, 404.                                              |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                | Diretriz                                                                                                                |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| Helper compartilhado | `test/helpers/rotasTestHelper.ts::criarItem` cria a categoria de consumo automaticamente quando não informada.          |
| Foto do item         | `POST/DELETE /itens/:id/foto` ficam fora desta suíte — dependem de MinIO real (ver seção de riscos do plano de testes). |
| Execução serial      | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.                                         |
