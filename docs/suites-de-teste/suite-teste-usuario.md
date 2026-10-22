# Suite de Testes E2E — Usuario (`/usuarios`)

Testes E2E (endpoint) que validam o fluxo de convite (não há autocadastro público), listagem, busca, atualização e exclusão de usuários.

Arquivo: `src/modules/usuario/__tests__/usuarioRoutes.test.ts`

## Visão de Fluxo e Regras de Negócio

| Regra                                 | Comportamento Atual do Sistema                                                                                                         | Impacto na Suite E2E                                                                       |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| Sem autocadastro                      | Só existe `POST /usuarios/convidar`, restrito a administradores.                                                                       | Toda massa de usuário nasce via convite, nunca via `sign-up`.                              |
| Convite não falha por causa de e-mail | O disparo do e-mail de convite é fire-and-forget (`sendResetPassword` não propaga falha) — o endpoint sempre responde `201`.           | Não há mais necessidade de tolerar `500` nos asserts desta suíte.                          |
| `email` imutável via `PUT`            | `UsuarioUpdateSchema` omite `email`; qualquer valor enviado é ignorado silenciosamente.                                                | Assert explícito de que o e-mail não muda após `PUT`.                                      |
| Auto-acesso ao próprio registro       | Usuário sem permissão administrativa ainda pode `GET/PATCH/PUT` no próprio `/usuarios/:id` (o `DELETE` saiu da exceção em 2026-10-21). | Cenário dedicado provando esse caso, distinto do bloqueio geral.                           |
| RBAC restritivo                       | O grupo `Usuario` (não-admin) tem **todas** as permissões desativadas nesta rota (exceto auto-acesso).                                 | Usuário comum aqui é cenário negativo (`403`), ao contrário da maioria dos outros módulos. |

## Modelo de Usuario

| Campo         | Tipo    | Requerido | Observação                                            |
| :------------ | :------ | :-------- | :---------------------------------------------------- |
| `nome`        | string  | Sim       | —                                                     |
| `email`       | string  | Sim       | Único; imutável após criação via `PUT`/`PATCH`.       |
| `ativo`       | boolean | —         | `false` até a ativação da conta via token de convite. |
| `convidadoEm` | Date    | —         | Preenchido no momento do convite.                     |

## Massa de Dados Recomendada

| Entidade                   | Objetivo nos testes                                                 |
| :------------------------- | :------------------------------------------------------------------ |
| Admin (seed)               | Único autorizado a convidar/listar/gerenciar outros usuários.       |
| Usuário Padrão (seed)      | Prova o bloqueio geral do RBAC e o auto-acesso ao próprio registro. |
| Usuário convidado em teste | `nome`/`email` sempre prefixados `zz-usuario-`, sufixo por UUID.    |

## Pré-condições Técnicas da Suite

| Etapa                  | Objetivo                                     | Critério              |
| :--------------------- | :------------------------------------------- | :-------------------- |
| `logarAdmin()`         | Autenticar com credenciais do admin semeado. | `200` e `body.token`. |
| `logarUsuarioPadrao()` | Autenticar com o usuário não-admin semeado.  | Idem.                 |

## POST /usuarios/convidar — Convite

| Funcionalidade                       | Comportamento Esperado                                         | Verificações                                           | Critérios de Aceite                                                                                     |
| :----------------------------------- | :------------------------------------------------------------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Cenários felizes**                 |                                                                |                                                        |                                                                                                         |
| Convite válido                       | Deve criar usuário pendente de ativação, sem expor credencial. | `POST /usuarios/convidar` com `nome` e `email`.        | Retorna `201`; `data.usuario.ativo=false`; `data.usuario.convidadoEm` presente; sem `senha`/`password`. |
| **Cenários tristes**                 |                                                                |                                                        |                                                                                                         |
| Sem `nome`                           | Deve rejeitar por campo obrigatório ausente.                   | `POST /usuarios/convidar` com `{ email }`.             | Retorna `400`.                                                                                          |
| Sem `email`                          | Deve rejeitar por campo obrigatório ausente.                   | `POST /usuarios/convidar` com `{ nome }`.              | Retorna `400`.                                                                                          |
| E-mail já existente                  | Deve rejeitar duplicidade.                                     | `POST` reaproveitando `email` de convite anterior.     | Retorna `400`.                                                                                          |
| Usuário sem permissão administrativa | Deve bloquear — só admin convida.                              | `POST /usuarios/convidar` com token do usuário padrão. | Retorna `403`.                                                                                          |
| Sem token                            | Deve bloquear requisição não autenticada.                      | `POST /usuarios/convidar` sem `Authorization`.         | Retorna `498`.                                                                                          |

## GET /usuarios — Listagem e busca

| Funcionalidade                       | Comportamento Esperado                                | Verificações                                 | Critérios de Aceite                                              |
| :----------------------------------- | :---------------------------------------------------- | :------------------------------------------- | :--------------------------------------------------------------- |
| **Cenários felizes**                 |                                                       |                                              |                                                                  |
| Listagem paginada                    | Deve retornar coleção paginada.                       | `GET /usuarios` autenticado como admin.      | Retorna `200`; `data.docs` array; campos de paginação presentes. |
| Filtro por nome                      | Deve retornar apenas usuários que casam com o filtro. | `GET /usuarios?nome=<nome>`.                 | Retorna `200`; `data.docs` contém o usuário esperado.            |
| **Cenários tristes**                 |                                                       |                                              |                                                                  |
| Usuário sem permissão administrativa | Deve bloquear listagem geral.                         | `GET /usuarios` com token do usuário padrão. | Retorna `403`.                                                   |
| Sem token                            | Deve bloquear requisição não autenticada.             | `GET /usuarios` sem `Authorization`.         | Retorna `498`.                                                   |

## GET /usuarios/:id — Detalhe

| Funcionalidade                  | Comportamento Esperado                            | Verificações                                        | Critérios de Aceite                 |
| :------------------------------ | :------------------------------------------------ | :-------------------------------------------------- | :---------------------------------- |
| **Cenários felizes**            |                                                   |                                                     |                                     |
| Busca por id existente (admin)  | Deve retornar o usuário correspondente.           | `GET /usuarios/:id` como admin.                     | Retorna `200`; `data._id` esperado. |
| Auto-acesso ao próprio registro | Deve permitir mesmo sem permissão administrativa. | `GET /usuarios/:meuId` com token do usuário padrão. | Retorna `200`.                      |
| **Cenários tristes**            |                                                   |                                                     |                                     |
| Id malformado                   | Deve rejeitar formato inválido.                   | `GET /usuarios/id-invalido`.                        | Retorna `400`.                      |
| Id válido inexistente           | Deve falhar pois não existe.                      | `GET /usuarios/000000000000000000000000`.           | Retorna `404`.                      |

## PUT /usuarios/:id — Atualização

| Funcionalidade             | Comportamento Esperado                   | Verificações                                           | Critérios de Aceite                                      |
| :------------------------- | :--------------------------------------- | :----------------------------------------------------- | :------------------------------------------------------- |
| **Cenários felizes**       |                                          |                                                        |                                                          |
| Atualizar nome             | Deve renomear o usuário.                 | `PUT /usuarios/:id` com novo `nome`.                   | Retorna `200`; `data.nome` atualizado.                   |
| E-mail não muda via update | Deve ignorar `email` enviado no payload. | `PUT` com `email: 'novo@email.com'`, seguido de `GET`. | Retorna `200`; `GET` posterior mantém o e-mail original. |
| **Cenários tristes**       |                                          |                                                        |                                                          |
| Usuário inexistente        | Deve falhar pois o alvo não existe.      | `PUT /usuarios/000000000000000000000000`.              | Retorna `404`.                                           |

## DELETE /usuarios/:id — Exclusão

| Funcionalidade            | Comportamento Esperado              | Verificações                                        | Critérios de Aceite |
| :------------------------ | :---------------------------------- | :-------------------------------------------------- | :------------------ |
| **Cenários felizes**      |                                     |                                                     |                     |
| Deletar usuário existente | Deve excluir o usuário convidado.   | `DELETE /usuarios/:id`.                             | Retorna `200`.      |
| **Cenários tristes**      |                                     |                                                     |                     |
| Usuário inexistente       | Deve falhar pois o alvo não existe. | `DELETE /usuarios/000000000000000000000000`.        | Retorna `404`.      |
| Excluir a própria conta   | Deve recusar.                       | Admin exclui a si mesmo (`exclusaoRoutes.test.ts`). | Retorna `400`.      |

## Exclusão lógica (`exclusaoRoutes.test.ts`)

| Funcionalidade              | Comportamento Esperado                                 | Verificações                                                    | Critérios de Aceite                                                                             |
| :-------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| Excluir                     | Encerra as sessões, recusa login e some das consultas. | Admin exclui o usuário padrão; token antigo, novo login, `GET`. | Sessão antiga `498`; login `401`, igual a senha errada; `GET /usuarios/:id` `404`; lista vazia. |
| Convidar o mesmo e-mail     | Restaura a conta em vez de criar outra.                | `POST /usuarios/convidar` com o e-mail excluído.                | `201`, mesmo `_id`; login com a senha de antes `200`.                                           |
| Sem permissão em `usuarios` | Deve bloquear.                                         | Usuário padrão exclui um convidado.                             | Retorna `403`.                                                                                  |

## Convite, ativação e PATCH (`conviteRoutes.test.ts`)

Lê o token de convite direto da coleção `verification` do banco de teste (`ROUTES_TEST_DB_URL`, exportada pelo `globalSetup`), porque o e-mail fica desligado na API de teste.

| Funcionalidade                          | Comportamento Esperado                                              | Verificações                                                           | Critérios de Aceite                                           |
| :-------------------------------------- | :------------------------------------------------------------------ | :--------------------------------------------------------------------- | :------------------------------------------------------------ |
| **Cenários felizes**                    |                                                                     |                                                                        |                                                               |
| Ativar com token no corpo               | Deve definir a senha e liberar o login.                             | Login antes (`401`), `POST /ativar-conta` com `{ token, senha }`.       | `200`; login seguinte `200` com `token`.                      |
| Token na URL                            | Continua aceito por compatibilidade.                                | `POST /ativar-conta?token=...` com `{ senha }`.                         | Retorna `200`.                                                |
| PATCH pelo admin                        | Deve alterar o nome de outro usuário.                               | `PATCH /usuarios/:id` com `nome`.                                      | `200`; `data.nome` novo.                                      |
| PATCH no próprio registro               | Usuário ativado altera o próprio fuso.                              | `PATCH /usuarios/:proprio` com `fuso_horario`.                         | `200`; `data.fuso_horario` novo.                              |
| **Cenários tristes**                    |                                                                     |                                                                        |                                                               |
| Token reaproveitado                     | Não deve trocar a senha de novo.                                    | Segunda ativação com o mesmo token.                                    | `400`/`401`; login com a segunda senha falha.                 |
| Token inválido / ausente / senha fraca  | Deve recusar.                                                       | Token inexistente; sem token; `senha: 'fraca'`.                        | `401`; `400`; `400`.                                          |
| Reenviar para quem já ativou            | Deve recusar.                                                       | `POST /usuarios/:id/reenviar-convite` após ativar.                     | Retorna `400`.                                                |
| Reenviar sem e-mail configurado         | Deve avisar que não reenviou.                                       | Mesmo endpoint com usuário pendente.                                   | Retorna `503`.                                                |
| Reenviar para inexistente               | Deve falhar.                                                        | `ID_INEXISTENTE`.                                                      | Retorna `404`.                                                |
| PATCH em outro usuário sem permissão    | Usuário comum não altera terceiros.                                 | `PATCH /usuarios/:outro`.                                              | Retorna `403`.                                                |
| PATCH com nome fora do padrão ou fuso inexistente | Deve recusar.                                             | `nome: 'nome minúsculo'`; `fuso_horario: 'Lugar/Nenhum'`.              | Retorna `400`.                                                |

## Cenários Transversais Obrigatórios (E2E)

| Tema                       | Verificação E2E                                                                                    |
| :------------------------- | :------------------------------------------------------------------------------------------------- |
| Contrato básico de sucesso | `error=false`, `code` igual ao status HTTP, `data` presente.                                       |
| Contrato básico de erro    | `error=true`, `code` igual ao status HTTP, `errors` é array.                                       |
| Autenticação               | Sem token sempre `498`.                                                                            |
| RBAC restritivo            | Único módulo em que o usuário comum recebe `403` na maioria das rotas, exceto no próprio registro. |

## Estratégia de Organização dos Testes E2E

| Bloco                                 | Objetivo                                                |
| :------------------------------------ | :------------------------------------------------------ |
| `beforeAll`                           | Autenticar admin e usuário padrão para toda a suíte.    |
| `describe('POST /usuarios/convidar')` | Convite, validação, duplicidade, RBAC, autenticação.    |
| `describe('GET /usuarios')`           | Listagem paginada, filtro por nome, RBAC, autenticação. |
| `describe('GET /usuarios/:id')`       | Detalhe, auto-acesso, id malformado, 404.               |
| `describe('PUT /usuarios/:id')`       | Atualização, imutabilidade de e-mail, 404.              |
| `describe('DELETE /usuarios/:id')`    | Exclusão, 404.                                          |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                               |
| :----------------------------- | :----------------------------------------- |
| `PORT`                         | Monta `BASE_URL`; default `3011` em teste. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                    |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.           |

## Observações de Implementação para os Casos E2E

| Ponto                   | Diretriz                                                                                                                                                                                                                                                                                          |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Correção de diagnóstico | Os 17 asserts antigos do tipo `expect([201, 500])` partiam do pressuposto errado de que a falta de `EMAIL_USER`/`EMAIL_APP_PASSWORD` faria o convite falhar com `500`. Investigação confirmou que `sendResetPassword` (`src/config/auth.ts`) é fire-and-forget — o convite sempre responde `201`. |
| Foto de perfil          | `PUT /usuarios/:id/foto` e `DELETE /usuarios/:id/foto` ficam fora desta suíte — dependem de MinIO real.                                                                                                                                                                                           |
| Reenvio de convite      | `POST /usuarios/:id/reenviar-convite` e `POST /ativar-conta` ficam fora desta suíte — dependem do token de verificação, não recuperável por uma suíte caixa-preta via HTTP.                                                                                                                       |
| Execução serial         | `maxWorkers: 1` — as 12 suítes de rota compartilham um único servidor de teste.                                                                                                                                                                                                                   |
