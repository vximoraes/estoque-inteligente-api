# Suite de Testes E2E — Estoque (`/estoques`)

Testes E2E (endpoint) que validam a listagem somente-leitura de estoques (quantidade de um item numa localização).

Arquivo: `src/modules/estoque/__tests__/estoqueRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                             | Comportamento Atual do Sistema                                                                             | Impacto na Suite E2E                                         |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| Módulo somente-leitura            | Não existem `POST`/`PATCH`/`DELETE` em `/estoques`; documentos nascem via movimentação.                    | Suíte só cobre `GET`.                                        |
| Um documento por item+localização | Índice único `{ item, localizacao }`; a quantidade de um item numa localização é sempre um único registro. | Massa de dados usa `criarMovimentacao` para gerar o estoque. |
| Autenticação em duas camadas      | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                                              | Sem sessão válida a resposta é sempre `498`.                 |
| RBAC liberal                      | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota.                                   | Usuário comum aqui é cenário positivo (200), não 403.        |

## Modelo de Estoque

| Campo         | Tipo     | Requerido | Observação                                   |
| :------------ | :------- | :-------- | :------------------------------------------- |
| `item`        | ObjectId | Sim       | Referência a `itens`.                        |
| `localizacao` | ObjectId | Sim       | Referência a `localizacoes`.                 |
| `quantidade`  | number   | Não       | Somada a cada movimentação de entrada/saída. |

## Massa de Dados Recomendada

| Entidade                          | Objetivo nos testes                                              |
| :-------------------------------- | :--------------------------------------------------------------- |
| Admin / Usuário Padrão (seed)     | Tokens bearer para os cenários felizes e de RBAC.                |
| Item + Localização + Movimentação | `criarMovimentacao` gera o documento de `Estoque` indiretamente. |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério                      |
| :--------------------- | :------------------------------------------- | :---------------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`.         |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem.                         |
| `criarMovimentacao()`  | Gera item, localização e estoque associado.  | `201` na movimentação criada. |

## GET /estoques — Listagem

| Funcionalidade                       | Comportamento Esperado                            | Verificações                                 | Critérios de Aceite                                                 |
| :----------------------------------- | :------------------------------------------------ | :------------------------------------------- | :------------------------------------------------------------------ |
| **Cenários felizes**                 |                                                   |                                              |                                                                     |
| Listagem paginada                    | Deve retornar coleção paginada.                   | `GET /estoques` autenticado.                 | Retorna `200`; `data.docs` array; campos de paginação presentes.    |
| Filtro por item                      | Deve retornar apenas estoques do item informado.  | `GET /estoques?item=:itemId`.                | Retorna `200`; todos os `data.docs` têm `item._id` igual ao filtro. |
| Usuário sem permissão administrativa | Deve permitir a listagem (RBAC libera esta rota). | `GET /estoques` com token do usuário padrão. | Retorna `200`.                                                      |
| **Cenários tristes**                 |                                                   |                                              |                                                                     |
| Sem token                            | Deve bloquear requisição não autenticada.         | `GET /estoques` sem `Authorization`.         | Retorna `498`.                                                      |

## GET /estoques/item/:itemId — Listagem por item

| Funcionalidade             | Comportamento Esperado                    | Verificações                      | Critérios de Aceite                   |
| :------------------------- | :---------------------------------------- | :-------------------------------- | :------------------------------------ |
| **Cenários felizes**       |                                           |                                   |                                       |
| Listar estoques de um item | Deve retornar todos os registros do item. | `GET /estoques/item/:itemId`.     | Retorna `200`; `data.docs` não vazio. |
| **Cenários tristes**       |                                           |                                   |                                       |
| itemId malformado          | Deve rejeitar formato inválido.           | `GET /estoques/item/id-invalido`. | Retorna `400`.                        |

## GET /estoques/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                  | Verificações                              | Critérios de Aceite                 |
| :--------------------- | :-------------------------------------- | :---------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                         |                                           |                                     |
| Busca por id existente | Deve retornar o estoque correspondente. | `GET /estoques/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                         |                                           |                                     |
| Id malformado          | Deve rejeitar formato inválido.         | `GET /estoques/id-invalido`.              | Retorna `400`.                      |
| Id válido inexistente  | Deve falhar pois não existe.            | `GET /estoques/000000000000000000000000`. | Retorna `404`.                      |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                                                                  |
| :------------------------- | :----------------------------------------------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente.                                     |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array.                                     |
| Autenticação               | Sem token sempre `498`.                                                                          |
| Módulo somente-leitura     | Nenhum teste desta suíte cria/altera dado de `Estoque` direto — tudo vem de `criarMovimentacao`. |

## Estratégia de Organização dos Testes E2E

| Bloco                                    | Objetivo                                                |
| :--------------------------------------- | :------------------------------------------------------ |
| `beforeAll`                              | Autenticar admin e usuário padrão para toda a suíte.    |
| `describe('GET /estoques')`              | Listagem paginada, filtro por item, RBAC, autenticação. |
| `describe('GET /estoques/item/:itemId')` | Listagem por item, itemId malformado.                   |
| `describe('GET /estoques/:id')`          | Detalhe, id malformado, 404.                            |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                    | Diretriz                                                                                                    |
| :----------------------- | :---------------------------------------------------------------------------------------------------------- |
| Geração indireta de dado | Não há factory `criarEstoque` — o documento nasce do hook `post('save')` de `Movimentacao` sobre `Estoque`. |
| Execução serial          | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.                             |
