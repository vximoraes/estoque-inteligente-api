# Suite de Testes E2E — Notificacao (`/notificacoes`)

Testes E2E (endpoint) que validam criação, listagem, marcação de leitura e inativação de notificações, sempre no escopo do usuário autenticado.

Arquivo: `src/modules/notificacao/__tests__/notificacaoRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                              | Comportamento Atual do Sistema                                                                              | Impacto na Suite E2E                                                      |
| :--------------------------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| Escopo por usuário autenticado     | `usuario` no payload de `POST` é ignorado — o Service sempre grava `req.user_id` como dono.                 | Cenário "usuário inexistente no payload" vira "campo ignorado", não erro. |
| Isolamento entre usuários          | `GET`/`PATCH` em `/notificacoes/:id` filtram por `usuario` do dono — outro usuário recebe `404`, não `403`. | Cobrir 404 ao acessar notificação de outro usuário.                       |
| Sem filtro por query no controller | `GET /notificacoes` ignora `?usuario=`; só `?visualizada=` é aplicado.                                      | Não testar filtro por `usuario` via query — não existe.                   |
| Autenticação em duas camadas       | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                                               | Sem sessão válida a resposta é sempre `498`.                              |

## Modelo de Notificacao

| Campo         | Tipo     | Requerido | Observação                                               |
| :------------ | :------- | :-------- | :------------------------------------------------------- |
| `mensagem`    | string   | Sim       | Máximo 500 caracteres.                                   |
| `usuario`     | ObjectId | —         | Sempre sobrescrito pelo Service com o autor autenticado. |
| `visualizada` | boolean  | Não       | Default `false`.                                         |
| `dataLeitura` | Date     | Não       | Preenchida ao marcar como visualizada.                   |

## Massa de Dados Recomendada

| Entidade                      | Objetivo nos testes                                      |
| :---------------------------- | :------------------------------------------------------- |
| Admin / Usuário Padrão (seed) | Autores independentes — provam o isolamento por usuário. |
| Notificação criada em teste   | Sempre no escopo de quem chamou `POST`.                  |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério              |
| :--------------------- | :------------------------------------------- | :-------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`. |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem.                 |

## POST /notificacoes — Criação

| Funcionalidade                        | Comportamento Esperado                                      | Verificações                                        | Critérios de Aceite                      |
| :------------------------------------ | :---------------------------------------------------------- | :-------------------------------------------------- | :--------------------------------------- |
| **Cenários felizes**                  |                                                             |                                                     |                                          |
| Criação válida                        | Deve criar a notificação para o autor, `visualizada=false`. | `POST /notificacoes` com `mensagem`.                | Retorna `201`; `data.visualizada=false`. |
| Campo `usuario` do payload é ignorado | Deve sempre usar o autor autenticado como dono.             | `POST` com `usuario` apontando para id inexistente. | Retorna `201` mesmo assim.               |
| **Cenários tristes**                  |                                                             |                                                     |                                          |
| Sem `mensagem`                        | Deve rejeitar por campo obrigatório ausente.                | `POST /notificacoes` com `{}`.                      | Retorna `400`.                           |
| `mensagem` de tipo errado             | Deve rejeitar tipo inválido.                                | `POST` com `mensagem: 12345`.                       | Retorna `400`.                           |
| Sem token                             | Deve bloquear requisição não autenticada.                   | `POST /notificacoes` sem `Authorization`.           | Retorna `498`.                           |

## GET /notificacoes — Listagem

| Funcionalidade                      | Comportamento Esperado                                           | Verificações                                     | Critérios de Aceite                                      |
| :---------------------------------- | :--------------------------------------------------------------- | :----------------------------------------------- | :------------------------------------------------------- |
| **Cenários felizes**                |                                                                  |                                                  |                                                          |
| Listar apenas notificações do autor | Deve retornar só notificações do usuário autenticado, paginadas. | `GET /notificacoes` com token do usuário padrão. | Retorna `200`; `data.docs`/`totalDocs`/`page` presentes. |
| Filtrar por `visualizada=false`     | Deve retornar apenas as não lidas.                               | `GET /notificacoes?visualizada=false`.           | Retorna `200`; todos os `docs` têm `visualizada=false`.  |
| **Cenários tristes**                |                                                                  |                                                  |                                                          |
| Sem token                           | Deve bloquear requisição não autenticada.                        | `GET /notificacoes` sem `Authorization`.         | Retorna `498`.                                           |

## GET /notificacoes/:id — Detalhe

| Funcionalidade               | Comportamento Esperado                                 | Verificações                                       | Critérios de Aceite                 |
| :--------------------------- | :----------------------------------------------------- | :------------------------------------------------- | :---------------------------------- |
| **Cenários felizes**         |                                                        |                                                    |                                     |
| Busca por id existente       | Deve retornar a notificação do próprio autor.          | `GET /notificacoes/:id`.                           | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**         |                                                        |                                                    |                                     |
| Notificação inexistente      | Deve falhar pois não existe.                           | `GET /notificacoes/000000000000000000000000`.      | Retorna `404`.                      |
| Notificação de outro usuário | Deve falhar por isolamento entre usuários (não é 403). | `GET` de uma notificação criada por outro usuário. | Retorna `404`.                      |

## PATCH /notificacoes/:id/visualizar e PUT /notificacoes/:id/visualizar — Marcar como lida

| Funcionalidade                      | Comportamento Esperado          | Verificações                                                     | Critérios de Aceite                     |
| :---------------------------------- | :------------------------------ | :--------------------------------------------------------------- | :-------------------------------------- |
| **Cenários felizes**                |                                 |                                                                  |                                         |
| Marcar como visualizada (PATCH)     | Deve marcar `visualizada=true`. | `PATCH /notificacoes/:id/visualizar`.                            | Retorna `200`; `data.visualizada=true`. |
| Marcar como visualizada (PUT)       | Idêntico via verbo `PUT`.       | `PUT /notificacoes/:id/visualizar`.                              | Retorna `200`; `data.visualizada=true`. |
| **Cenários tristes**                |                                 |                                                                  |                                         |
| Notificação inexistente (PATCH/PUT) | Deve falhar pois não existe.    | `PATCH`/`PUT /notificacoes/000000000000000000000000/visualizar`. | Retorna `404`.                          |

## PATCH /notificacoes/visualizar-todas — Marcar todas como lidas

| Funcionalidade                        | Comportamento Esperado                           | Verificações                                                                | Critérios de Aceite                                                   |
| :------------------------------------ | :----------------------------------------------- | :-------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Cenários felizes**                  |                                                  |                                                                             |                                                                       |
| Marcar todas as notificações do autor | Deve zerar as notificações não lidas do usuário. | `PATCH /notificacoes/visualizar-todas` seguido de `GET ?visualizada=false`. | Retorna `200`; listagem seguinte com `visualizada=false` volta vazia. |

## PATCH /notificacoes/:id/inativar — Inativação

| Funcionalidade                 | Comportamento Esperado                        | Verificações                                             | Critérios de Aceite |
| :----------------------------- | :-------------------------------------------- | :------------------------------------------------------- | :------------------ |
| **Cenários felizes**           |                                               |                                                          |                     |
| Inativar notificação existente | Deve inativar a notificação do próprio autor. | `PATCH /notificacoes/:id/inativar`.                      | Retorna `200`.      |
| **Cenários tristes**           |                                               |                                                          |                     |
| Notificação inexistente        | Deve falhar pois não existe.                  | `PATCH /notificacoes/000000000000000000000000/inativar`. | Retorna `404`.      |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                                               |
| :------------------------- | :---------------------------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente.                  |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array.                  |
| Autenticação               | Sem token sempre `498`.                                                       |
| Isolamento por usuário     | Toda notificação só é visível/editável por quem a criou (dono = autenticado). |

## Estratégia de Organização dos Testes E2E

| Bloco                                                    | Objetivo                                                         |
| :------------------------------------------------------- | :--------------------------------------------------------------- |
| `beforeAll`                                              | Autenticar admin e usuário padrão para toda a suíte.             |
| `describe('POST /notificacoes')`                         | Criação, ignorância do campo `usuario`, validação, autenticação. |
| `describe('GET /notificacoes')`                          | Listagem por autor, filtro `visualizada`, autenticação.          |
| `describe('GET /notificacoes/:id')`                      | Detalhe, 404, isolamento entre usuários.                         |
| `describe('PATCH /notificacoes/:id/visualizar')` e `PUT` | Marcação de leitura individual, 404.                             |
| `describe('PATCH /notificacoes/visualizar-todas')`       | Marcação em massa.                                               |
| `describe('PATCH /notificacoes/:id/inativar')`           | Inativação, 404.                                                 |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                                                                       |
| :----------------------------- | :--------------------------------------------------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste.                                         |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                                                            |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado — usado como segundo autor para provar isolamento. |

## Observações de Implementação para os Casos E2E

| Ponto                            | Diretriz                                                                          |
| :------------------------------- | :-------------------------------------------------------------------------------- |
| `GET /notificacoes/stream` (SSE) | Fora do escopo desta suíte — exige cliente de streaming, custo alto para o valor. |
| Execução serial                  | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.   |
