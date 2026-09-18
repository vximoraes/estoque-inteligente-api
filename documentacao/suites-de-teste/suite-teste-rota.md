# Suite de Testes E2E — Rota (`/rotas`)

Testes E2E (endpoint) que validam cadastro, listagem/filtro, atualização e exclusão dos registros de `Rota` — a tabela que sustenta o RBAC (`AuthPermission`) de toda a API.

Arquivo: `src/modules/rota/__tests__/rotaRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                                          | Comportamento Atual do Sistema                                                                                 | Impacto na Suite E2E                                                                              |
| :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| `AuthPermission` resolve por primeiro segmento | O middleware pega só o primeiro segmento da URL (`req.url.split('/')[0]`) e busca esse nome na coleção `rota`. | Registros com nome `usuarios:id`/`itens:id/foto` no seed são letra morta — nunca são consultados. |
| Nome de rota único                             | Duas `Rota` não podem ter o mesmo `nome`.                                                                      | Cobrir `409` na criação e na atualização.                                                         |
| Exclusão bloqueia a rota atual da requisição   | `RotaService.deletar` impede excluir a `Rota` cujo nome coincide com o path da própria requisição de exclusão. | Não testável sem tocar rota real do sistema — não coberto por esta suíte (ver observações).       |
| RBAC restritivo                                | O grupo `Usuario` (não-admin) tem todas as permissões desativadas nesta rota.                                  | Usuário comum aqui é sempre cenário negativo (`403`).                                             |
| Autenticação em duas camadas                   | `AuthMiddleware` roda antes de `AuthPermission` em toda rota.                                                  | Sem sessão válida a resposta é sempre `498`.                                                      |

**Regra rígida desta suíte:** só cria/altera registros `Rota` com nome prefixado `zz-rota-teste-`, nunca mexe nos registros do seed — esta suíte muta a própria tabela de RBAC do servidor compartilhado, e alterar/excluir um registro semeado (`itens`, `categorias`, ...) derruba silenciosamente todas as outras suítes de rota (elas passam a receber `404`/`403` sem relação aparente com a causa).

## Modelo de Rota

| Campo        | Tipo    | Requerido | Observação                                                |
| :----------- | :------ | :-------- | :-------------------------------------------------------- |
| `rota`       | string  | Sim       | Nome do primeiro segmento da URL (ex.: `'itens'`); único. |
| `ativo`      | boolean | Não       | Default `true`.                                           |
| `buscar`     | boolean | Não       | Habilita `GET`; default `false`.                          |
| `enviar`     | boolean | Não       | Habilita `POST`; default `false`.                         |
| `substituir` | boolean | Não       | Habilita `PUT`; default `false`.                          |
| `modificar`  | boolean | Não       | Habilita `PATCH`; default `false`.                        |
| `excluir`    | boolean | Não       | Habilita `DELETE`; default `false`.                       |

## Massa de Dados Recomendada

| Entidade                      | Objetivo nos testes                                      |
| :---------------------------- | :------------------------------------------------------- |
| Admin / Usuário Padrão (seed) | Tokens bearer para os cenários felizes e de RBAC.        |
| Rota criada em teste          | Nome sempre prefixado `zz-rota-teste-`, sufixo por UUID. |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério              |
| :--------------------- | :------------------------------------------- | :-------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`. |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem.                 |

## POST /rotas — Cadastro

| Funcionalidade                       | Comportamento Esperado                       | Verificações                                      | Critérios de Aceite               |
| :----------------------------------- | :------------------------------------------- | :------------------------------------------------ | :-------------------------------- |
| **Cenários felizes**                 |                                              |                                                   |                                   |
| Cadastro válido                      | Deve criar a rota com `ativo=true`.          | `POST /rotas` com `rota: 'zz-rota-teste-<uuid>'`. | Retorna `201`; `data.ativo=true`. |
| **Cenários tristes**                 |                                              |                                                   |                                   |
| Sem campo `rota`                     | Deve rejeitar por campo obrigatório ausente. | `POST /rotas` com `{}`.                           | Retorna `400`.                    |
| Nome já existente                    | Deve rejeitar duplicidade.                   | `POST` reaproveitando `rota` já cadastrada.       | Retorna `409`.                    |
| Usuário sem permissão administrativa | Deve bloquear.                               | `POST /rotas` com token do usuário padrão.        | Retorna `403`.                    |
| Sem token                            | Deve bloquear requisição não autenticada.    | `POST /rotas` sem `Authorization`.                | Retorna `498`.                    |

## GET /rotas — Listagem e filtro

| Funcionalidade                       | Comportamento Esperado                    | Verificações                              | Critérios de Aceite                                              |
| :----------------------------------- | :---------------------------------------- | :---------------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes**                 |                                           |                                           |                                                                  |
| Listagem paginada                    | Deve retornar coleção paginada.           | `GET /rotas` autenticado como admin.      | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| Filtro por nome                      | Deve retornar a rota criada em teste.     | `GET /rotas?rota=<nome>`.                 | Retorna `200`; `data.docs` contém a rota esperada.               |
| **Cenários tristes**                 |                                           |                                           |                                                                  |
| Usuário sem permissão administrativa | Deve bloquear.                            | `GET /rotas` com token do usuário padrão. | Retorna `403`.                                                   |
| Sem token                            | Deve bloquear requisição não autenticada. | `GET /rotas` sem `Authorization`.         | Retorna `498`.                                                   |

## GET /rotas/:id — Detalhe

| Funcionalidade         | Comportamento Esperado               | Verificações                           | Critérios de Aceite                 |
| :--------------------- | :----------------------------------- | :------------------------------------- | :---------------------------------- |
| **Cenários felizes**   |                                      |                                        |                                     |
| Busca por id existente | Deve retornar a rota correspondente. | `GET /rotas/:id`.                      | Retorna `200`; `data._id` esperado. |
| **Cenários tristes**   |                                      |                                        |                                     |
| Id malformado          | Deve rejeitar formato inválido.      | `GET /rotas/id-invalido`.              | Retorna `400`.                      |
| Id válido inexistente  | Deve falhar pois não existe.         | `GET /rotas/000000000000000000000000`. | Retorna `404`.                      |

## PATCH /rotas/:id — Atualização

| Funcionalidade                  | Comportamento Esperado              | Verificações                                      | Critérios de Aceite                    |
| :------------------------------ | :---------------------------------- | :------------------------------------------------ | :------------------------------------- |
| **Cenários felizes**            |                                     |                                                   |                                        |
| Atualizar nome                  | Deve renomear a rota.               | `PATCH /rotas/:id` com novo `rota`.               | Retorna `200`; `data.rota` atualizado. |
| **Cenários tristes**            |                                     |                                                   |                                        |
| Nome já existente em outra rota | Deve rejeitar duplicidade.          | `PATCH` usando `rota` de outro registro de teste. | Retorna `409`.                         |
| Rota inexistente                | Deve falhar pois o alvo não existe. | `PATCH /rotas/000000000000000000000000`.          | Retorna `404`.                         |

## DELETE /rotas/:id — Exclusão

| Funcionalidade                  | Comportamento Esperado               | Verificações                                           | Critérios de Aceite |
| :------------------------------ | :----------------------------------- | :----------------------------------------------------- | :------------------ |
| **Cenários felizes**            |                                      |                                                        |                     |
| Deletar rota de teste existente | Deve excluir a rota criada em teste. | `DELETE /rotas/:id` (nome prefixado `zz-rota-teste-`). | Retorna `200`.      |
| **Cenários tristes**            |                                      |                                                        |                     |
| Rota inexistente                | Deve falhar pois o alvo não existe.  | `DELETE /rotas/000000000000000000000000`.              | Retorna `404`.      |

## Cenários Transversais Obrigatórios (E2E)

| Tema                             | Verificação E2E                                                                 |
| :------------------------------- | :------------------------------------------------------------------------------ |
| Contrato básico de sucesso       | `error=false`, `code` igual ao status HTTP, `data` presente.                    |
| Contrato básico de erro          | `error=true`, `code` igual ao status HTTP, `errors` é array.                    |
| Autenticação                     | Sem token sempre `498`.                                                         |
| RBAC restritivo                  | Usuário comum sempre recebe `403` nesta rota.                                   |
| Isolamento do RBAC compartilhado | Toda mutação usa nome prefixado `zz-rota-teste-` — nunca toca registro do seed. |

## Estratégia de Organização dos Testes E2E

| Bloco                           | Objetivo                                                |
| :------------------------------ | :------------------------------------------------------ |
| `beforeAll`                     | Autenticar admin e usuário padrão para toda a suíte.    |
| `describe('POST /rotas')`       | Cadastro, validação, duplicidade, RBAC, autenticação.   |
| `describe('GET /rotas')`        | Listagem paginada, filtro por nome, RBAC, autenticação. |
| `describe('GET /rotas/:id')`    | Detalhe, id malformado, 404.                            |
| `describe('PATCH /rotas/:id')`  | Atualização, duplicidade, 404.                          |
| `describe('DELETE /rotas/:id')` | Exclusão, 404.                                          |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                                 | Diretriz                                                                                                                                                                                           |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Rota sem registro → 404" não coberto | Esse comportamento do `AuthPermission` só é observável derrubando um registro do seed — incompatível com a regra rígida desta suíte. Não coberto para preservar o isolamento das outras 11 suítes. |
| Bug corrigido durante o endurecimento | `RotaRepository.atualizar` usava `findByIdAndUpdate` sem `{ new: true }` e devolvia o documento **antes** da atualização — inconsistente com todos os outros módulos. Corrigido.                   |
| Execução serial obrigatória           | `maxWorkers: 1` — indispensável aqui mais do que em qualquer outra suíte, pois esta é a única que muta a tabela de RBAC compartilhada.                                                             |
