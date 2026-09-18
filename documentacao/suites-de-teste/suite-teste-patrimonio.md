# Suite de Testes E2E — Patrimonio (`/patrimonios`)

Testes E2E (endpoint) que validam cadastro (individual e em lote), listagem, histórico de eventos, atualização de metadados, transição de status, transferência de localização e inativação de unidades de patrimônio.

Arquivo: `src/modules/patrimonio/__tests__/patrimonioRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                                  | Comportamento Atual do Sistema                                                                           | Impacto na Suite E2E                                                          |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| Categoria deve ser permanente          | Só aceita categoria com `tipo: 'permanente'`; categoria de consumo é rejeitada.                          | Cobrir `400` ao usar categoria de tipo errado.                                |
| `numero_patrimonio` único entre ativos | Índice único parcial (só entre `ativo: true`) **e** checagem explícita no Service antes de gravar.       | Cobrir `409` tanto na criação individual quanto no lote.                      |
| Máquina de estados de status           | Só transições listadas em `EVENTO_POR_TRANSICAO` são aceitas; `'Emprestado'` nunca é destino manual.     | Cobrir transição válida, mesmo status, e tentativa de ir para `'Emprestado'`. |
| Todo evento gera `PatrimonioEvento`    | Cadastro, transição de status e transferência de localização criam um registro em `patrimonios_eventos`. | `GET /:id/eventos` deve sempre conter ao menos o evento de `cadastro`.        |
| Autenticação em duas camadas           | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                                            | Sem sessão válida a resposta é sempre `498`.                                  |
| RBAC liberal                           | O grupo `Usuario` (não-admin) tem todas as permissões ativas nesta rota.                                 | Usuário comum aqui é cenário positivo (201), não 403.                         |

## Modelo de Patrimonio

| Campo                 | Tipo     | Requerido | Observação                                                                   |
| :-------------------- | :------- | :-------- | :--------------------------------------------------------------------------- |
| `numero_patrimonio`   | string   | Sim       | Único entre unidades ativas; salvo em maiúsculas.                            |
| `categoria`           | ObjectId | Sim       | Deve referenciar categoria com `tipo: 'permanente'`.                         |
| `localizacao`         | ObjectId | Sim       | —                                                                            |
| `status`              | string   | Não       | `'Disponível'` (default) \| `'Emprestado'` \| `'Manutenção'` \| `'Baixado'`. |
| `modelo`/`fabricante` | string   | Não       | Máximo 100 caracteres cada.                                                  |

## Massa de Dados Recomendada

| Entidade                      | Objetivo nos testes                                                               |
| :---------------------------- | :-------------------------------------------------------------------------------- |
| Admin / Usuário Padrão (seed) | Tokens bearer para os cenários felizes e de RBAC.                                 |
| Categoria de tipo permanente  | Pré-requisito de todo patrimônio criado em teste (`criarCategoria` com override). |
| Localização                   | Pré-requisito de criação e alvo da transferência.                                 |
| Patrimônio criado em teste    | `numero_patrimonio` sempre prefixado `zz-patrimonio-`, sufixo por UUID.           |

## Pré-condições Técnicas da Suite

| Etapa                                           | Objetivo                              | Critério                       |
| :---------------------------------------------- | :------------------------------------ | :----------------------------- |
| `logarAdmin()` / `logarUsuarioPadrao()`         | Autenticar admin e usuário não-admin. | `200` e `body.token` em ambos. |
| `criarCategoria(token, { tipo: 'permanente' })` | Categoria válida para patrimônio.     | `201` e `data._id`.            |
| `criarLocalizacao()`                            | Localização válida para patrimônio.   | `201` e `data._id`.            |

## POST /patrimonios — Cadastro individual

| Funcionalidade                       | Comportamento Esperado                               | Verificações                                                                        | Critérios de Aceite                                           |
| :----------------------------------- | :--------------------------------------------------- | :---------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| **Cenários felizes**                 |                                                      |                                                                                     |                                                               |
| Cadastro válido                      | Deve criar com `status='Disponível'` e `ativo=true`. | `POST /patrimonios` com `numero_patrimonio`, `categoria` permanente, `localizacao`. | Retorna `201`; `data.status='Disponível'`; `data.ativo=true`. |
| Usuário sem permissão administrativa | Deve permitir o cadastro (RBAC libera esta rota).    | `POST /patrimonios` com token do usuário padrão.                                    | Retorna `201`.                                                |
| **Cenários tristes**                 |                                                      |                                                                                     |                                                               |
| Sem campos obrigatórios              | Deve rejeitar payload vazio.                         | `POST /patrimonios` com `{}`.                                                       | Retorna `400`.                                                |
| Categoria inexistente                | Deve falhar pois a categoria não existe.             | `POST` com `categoria: 000000000000000000000000`.                                   | Retorna `404`.                                                |
| Categoria de tipo consumo            | Deve rejeitar categoria incompatível.                | `POST` usando categoria com `tipo: 'consumo'`.                                      | Retorna `400`.                                                |
| `numero_patrimonio` já existente     | Deve rejeitar duplicidade entre unidades ativas.     | `POST` reaproveitando `numero_patrimonio` de unidade já cadastrada.                 | Retorna `409`.                                                |
| Sem token                            | Deve bloquear requisição não autenticada.            | `POST /patrimonios` sem `Authorization`.                                            | Retorna `498`.                                                |

## POST /patrimonios/lote — Cadastro em lote

| Funcionalidade                         | Comportamento Esperado                                              | Verificações                                                    | Critérios de Aceite                                                                 |
| :------------------------------------- | :------------------------------------------------------------------ | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Cenários felizes**                   |                                                                     |                                                                 |                                                                                     |
| Numeração sequencial                   | Deve criar N unidades com `${prefixo}-0001`, `${prefixo}-0002`, ... | `POST /patrimonios/lote` com `quantidade: 3` e `prefixo` único. | Retorna `201`; `data` tem 3 itens; `numero_patrimonio` sequencial com zero-padding. |
| **Cenários tristes**                   |                                                                     |                                                                 |                                                                                     |
| Quantidade fora do intervalo permitido | Deve rejeitar `quantidade` fora de 1–500.                           | `POST /patrimonios/lote` com `quantidade: 0`.                   | Retorna `400`.                                                                      |

## GET /patrimonios — Listagem

| Funcionalidade       | Comportamento Esperado                    | Verificações                            | Critérios de Aceite                                              |
| :------------------- | :---------------------------------------- | :-------------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes** |                                           |                                         |                                                                  |
| Listagem paginada    | Deve retornar coleção paginada.           | `GET /patrimonios` autenticado.         | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| **Cenários tristes** |                                           |                                         |                                                                  |
| Sem token            | Deve bloquear requisição não autenticada. | `GET /patrimonios` sem `Authorization`. | Retorna `498`.                                                   |

## GET /patrimonios/:id — Detalhe

| Funcionalidade         | Comportamento Esperado                     | Verificações                                 | Critérios de Aceite                 |
| :--------------------- | :----------------------------------------- | :------------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                            |                                              |                                     |
| Busca por id existente | Deve retornar o patrimônio correspondente. | `GET /patrimonios/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                            |                                              |                                     |
| Id malformado          | Deve rejeitar formato inválido.            | `GET /patrimonios/id-invalido`.              | Retorna `400`.                      |
| Id válido inexistente  | Deve falhar pois não existe.               | `GET /patrimonios/000000000000000000000000`. | Retorna `404`.                      |

## GET /patrimonios/:id/eventos — Histórico

| Funcionalidade                      | Comportamento Esperado                           | Verificações                                        | Critérios de Aceite                                             |
| :---------------------------------- | :----------------------------------------------- | :-------------------------------------------------- | :-------------------------------------------------------------- |
| **Cenários felizes**                |                                                  |                                                     |                                                                 |
| Listar eventos incluindo o cadastro | Deve conter ao menos o evento `tipo='cadastro'`. | `GET /patrimonios/:id/eventos` logo após a criação. | Retorna `200`; `data.docs` contém evento com `tipo='cadastro'`. |

## PATCH /patrimonios/:id — Atualização de metadados

| Funcionalidade         | Comportamento Esperado              | Verificações                                   | Critérios de Aceite                      |
| :--------------------- | :---------------------------------- | :--------------------------------------------- | :--------------------------------------- |
| **Cenários felizes**   |                                     |                                                |                                          |
| Atualizar `modelo`     | Deve atualizar o campo de metadado. | `PATCH /patrimonios/:id` com novo `modelo`.    | Retorna `200`; `data.modelo` atualizado. |
| **Cenários tristes**   |                                     |                                                |                                          |
| Patrimônio inexistente | Deve falhar pois o alvo não existe. | `PATCH /patrimonios/000000000000000000000000`. | Retorna `404`.                           |

## PATCH /patrimonios/:id/status — Transição de status

| Funcionalidade                         | Comportamento Esperado                                           | Verificações                                     | Critérios de Aceite                        |
| :------------------------------------- | :--------------------------------------------------------------- | :----------------------------------------------- | :----------------------------------------- |
| **Cenários felizes**                   |                                                                  |                                                  |                                            |
| Disponível → Manutenção                | Deve transicionar e gerar evento `manutencao_entrada`.           | `PATCH /:id/status` com `status: 'Manutenção'`.  | Retorna `200`; `data.status='Manutenção'`. |
| **Cenários tristes**                   |                                                                  |                                                  |                                            |
| Transicionar para o mesmo status atual | Deve rejeitar transição redundante.                              | `PATCH /:id/status` com `status` igual ao atual. | Retorna `400`.                             |
| Transição direta para `'Emprestado'`   | Deve rejeitar — só o fluxo de empréstimo pode gerar esse status. | `PATCH /:id/status` com `status: 'Emprestado'`.  | Retorna `400`.                             |

## PATCH /patrimonios/:id/localizacao — Transferência

| Funcionalidade                    | Comportamento Esperado                                       | Verificações                                          | Critérios de Aceite                                             |
| :-------------------------------- | :----------------------------------------------------------- | :---------------------------------------------------- | :-------------------------------------------------------------- |
| **Cenários felizes**              |                                                              |                                                       |                                                                 |
| Transferir para outra localização | Deve atualizar `localizacao` e gerar evento `transferencia`. | `PATCH /:id/localizacao` com nova `localizacao`.      | Retorna `200`; `data.localizacao._id` igual à nova localização. |
| **Cenários tristes**              |                                                              |                                                       |                                                                 |
| Localização inexistente           | Deve falhar pois a localização não existe.                   | `PATCH /:id/localizacao` com localização inexistente. | Retorna `404`.                                                  |

## PATCH /patrimonios/:id/inativar — Inativação

| Funcionalidade                | Comportamento Esperado                 | Verificações                                            | Critérios de Aceite |
| :---------------------------- | :------------------------------------- | :------------------------------------------------------ | :------------------ |
| **Cenários felizes**          |                                        |                                                         |                     |
| Inativar patrimônio existente | Deve marcar o patrimônio como inativo. | `PATCH /patrimonios/:id/inativar`.                      | Retorna `200`.      |
| **Cenários tristes**          |                                        |                                                         |                     |
| Patrimônio inexistente        | Deve falhar pois o alvo não existe.    | `PATCH /patrimonios/000000000000000000000000/inativar`. | Retorna `404`.      |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                              |
| :------------------------- | :----------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente. |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array. |
| Autenticação               | Sem token sempre `498`.                                      |
| Máquina de estados         | Toda transição fora de `EVENTO_POR_TRANSICAO` retorna `400`. |

## Estratégia de Organização dos Testes E2E

| Bloco                                            | Objetivo                                                       |
| :----------------------------------------------- | :------------------------------------------------------------- |
| `beforeAll`                                      | Autenticar admin e usuário padrão para toda a suíte.           |
| `describe('POST /patrimonios')`                  | Cadastro, categoria inválida, duplicidade, RBAC, autenticação. |
| `describe('POST /patrimonios/lote')`             | Numeração sequencial, limite de quantidade.                    |
| `describe('GET /patrimonios')`                   | Listagem paginada.                                             |
| `describe('GET /patrimonios/:id')`               | Detalhe, id malformado, 404.                                   |
| `describe('GET /patrimonios/:id/eventos')`       | Histórico de eventos.                                          |
| `describe('PATCH /patrimonios/:id')`             | Atualização de metadados, 404.                                 |
| `describe('PATCH /patrimonios/:id/status')`      | Transições válidas e inválidas.                                |
| `describe('PATCH /patrimonios/:id/localizacao')` | Transferência, localização inexistente.                        |
| `describe('PATCH /patrimonios/:id/inativar')`    | Inativação, 404.                                               |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                                 | Diretriz                                                                                                                                                                                                                                                                                            |
| :------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foto do patrimônio                    | `POST`/`DELETE /:id/foto` ficam fora desta suíte — dependem de MinIO real (não mockado nas suítes de rota).                                                                                                                                                                                         |
| Bug corrigido durante o endurecimento | `PatrimonioService` não validava `numero_patrimonio` duplicado antes desta suíte — o índice único do Mongo nunca era criado fora de `NODE_ENV=development` (`autoIndex` desligado em `test`/produção). Corrigido com checagem explícita em `PatrimonioService.validarNumeroPatrimonio`/`criarLote`. |
| Execução serial                       | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.                                                                                                                                                                                                                     |
