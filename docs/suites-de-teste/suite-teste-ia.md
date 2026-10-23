# Suite de Testes E2E — Conversas da IA (`/ia/conversas`)

Testes E2E (endpoint) do CRUD de conversas e do envio de mensagem com resposta em _stream_. O Gemini é trocado por um modelo falso local (`test/helpers/geminiFalso.ts`), então a suíte não gasta cota nem depende de rede, mas percorre o caminho real: agente LangChain, cliente MCP, `/mcp` da própria API de teste e gravação da conversa.

Arquivo: `src/modules/ia/__tests__/iaRoutes.regressao.test.ts` (suíte de regressão, `npm run test:regressao`)

## Visão de Fluxo e Regras de Negócio

| Regra                       | Comportamento Atual do Sistema                                                                                                                     | Impacto na Suite E2E                                                                      |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| Modelo configurável por URL | `GEMINI_BASE_URL` (vazio em produção) muda o endereço da API do Gemini. O `globalSetup` aponta para `http://localhost:3013` e usa uma chave falsa. | O teste sobe o modelo falso em `beforeAll` e define a resposta por caso (`responderCom`). |
| Resposta em SSE             | `POST /ia/conversas/:id/mensagens` responde `text/event-stream` com eventos `token`, `done` ou `error`.                                            | Helper `lerEventos` junta os `data:`.                                                     |
| MCP pela sessão do cookie   | O `IAService` repassa o cookie da requisição ao `/mcp`; com só `Authorization: Bearer` a ferramenta falharia.                                      | A suíte loga e envia o cookie de sessão nas rotas de mensagem.                            |
| MCP no próprio servidor     | O servidor de teste define `API_INTERNAL_URL` para a própria porta (antes herdava `localhost:3010` do `.env` e chamava a API de dev).              | O caso de ferramenta prova que o resultado vem do banco de teste.                         |
| Conversa por usuário        | Toda consulta filtra por `usuario`; conversa de outro usuário responde `404`.                                                                      | Cobrir 404 de leitura, exclusão e ausência na listagem para o usuário padrão.             |
| Falha do modelo             | Sem nenhum texto gerado, a pergunta é retirada da conversa e o _stream_ termina em `error`.                                                        | O modelo falso responde `500` em todos os modelos da cadeia.                              |

## Pré-condições Técnicas da Suite

| Etapa              | Objetivo                                         | Critério                  |
| :----------------- | :----------------------------------------------- | :------------------------ |
| `gemini.iniciar()` | Subir o modelo falso na porta `3013`.            | Servidor HTTP escutando.  |
| `logarAdmin()`     | Token para as rotas REST.                        | `200` e `body.token`.     |
| `cookieDoAdmin()`  | Cookie de sessão para as rotas que chamam o MCP. | `set-cookie` na resposta. |

## /ia/conversas — CRUD

| Funcionalidade             | Comportamento Esperado            | Verificações                                                    | Critérios de Aceite                                  |
| :------------------------- | :-------------------------------- | :-------------------------------------------------------------- | :--------------------------------------------------- |
| **Cenários felizes**       |                                   |                                                                 |                                                      |
| Criar com mensagem inicial | Título tirado da mensagem.        | `POST /ia/conversas` com `mensagem_inicial`.                    | `201`; `titulo` igual à mensagem; `mensagens` vazia. |
| Criar sem mensagem         | Título padrão.                    | `POST /ia/conversas` com `{}`.                                  | `titulo = 'Nova conversa'`.                          |
| Listar                     | Paginado, só do usuário.          | `GET /ia/conversas?limite=50`.                                  | `200`; envelope paginado; contém a criada.           |
| Obter por id               | Devolve a conversa.               | `GET /ia/conversas/:id`.                                        | `200`; `_id` igual.                                  |
| Excluir                    | Remove a conversa.                | `DELETE /ia/conversas/:id` e `GET` depois.                      | `204`; `GET` seguinte `404`.                         |
| **Cenários tristes**       |                                   |                                                                 |                                                      |
| Conversa de outro usuário  | Não aparece nem pode ser apagada. | `GET`, `DELETE` e listagem com o usuário padrão.                | `404`; `404`; ausente da lista.                      |
| Limite fora da faixa       | Deve recusar.                     | `GET /ia/conversas?limite=51`.                                  | `400`.                                               |
| Id inválido / inexistente  | Deve recusar / não encontrar.     | `GET` com `id-invalido`; `GET` e `DELETE` com `ID_INEXISTENTE`. | `400`; `404`; `404`.                                 |
| Sem sessão                 | Deve bloquear.                    | `GET /ia/conversas` sem token.                                  | `498`.                                               |

## POST /ia/conversas/:id/mensagens — Mensagem

| Funcionalidade                 | Comportamento Esperado                                                                                    | Verificações                                                                                           | Critérios de Aceite                                                                                                                                                     |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cenários felizes**           |                                                                                                           |                                                                                                        |                                                                                                                                                                         |
| Resposta em texto              | Envia os pedaços e grava pergunta e resposta.                                                             | Modelo falso responde "Resposta simulada.".                                                            | `200` `text/event-stream`; tokens formam o texto; último evento `done`; conversa com `user` e `assistant`.                                                              |
| Chamada de ferramenta pelo MCP | O agente executa a ferramenta no `/mcp` e manda o resultado de volta ao modelo.                           | 1ª chamada devolve `functionCall` de `buscarCategorias`; a 2ª (com `functionResponse`) responde texto. | Texto final no _stream_; evento `status` "Consultando categorias…"; o `functionResponse` enviado ao modelo contém `itens_ativos`.                                       |
| Resumo da conversa             | Com um lote de 10 mensagens fora da janela de 15, resume **depois** de responder, sem atrasar a resposta. | Conversa com 24 mensagens gravadas no banco e mais uma enviada.                                        | `done`; o pedido da resposta não traz o resumo e leva a mensagem 0; depois, `resumo` gravado, `resumoAteIndice = 11`, 26 mensagens e um `ia_usos` com `tipo: 'resumo'`. |
| **Cenários tristes**           |                                                                                                           |                                                                                                        |                                                                                                                                                                         |
| Modelo falha                   | Avisa e não deixa a pergunta órfã.                                                                        | Modelo falso responde `500`.                                                                           | Último evento `error`; `mensagens` continua vazia.                                                                                                                      |
| Mensagem vazia ou invisível    | Recusa antes de chamar o modelo.                                                                          | `content: ''` e `content: '​ ​'`.                                                                      | `400`; modelo falso não recebe chamada.                                                                                                                                 |
| Acima de 2000 caracteres       | Deve recusar.                                                                                             | `content` com 2001 caracteres.                                                                         | `400`.                                                                                                                                                                  |
| Conversa inexistente           | Deve falhar.                                                                                              | `ID_INEXISTENTE`.                                                                                      | `404`.                                                                                                                                                                  |

## Variáveis de Ambiente Usadas

| Variável                       | Uso na suite                                                                      |
| :----------------------------- | :-------------------------------------------------------------------------------- |
| `ROUTES_TEST_GEMINI_PORT`      | Porta do modelo falso (default `3013`), repassada pelo `globalSetup`.             |
| `GEMINI_BASE_URL`              | Definida só no servidor dos testes de rota; a API de teste do Cypress usa a real. |
| `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Login do admin semeado.                                                           |
| `USER_EMAIL`/`USER_PASSWORD`   | Login do usuário padrão semeado.                                                  |

## Observações de Implementação para os Casos E2E

| Ponto                   | Diretriz                                                                                                              |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Formato do modelo falso | Responde no formato do `streamGenerateContent?alt=sse` do Gemini (`candidates[0].content.parts`, `usageMetadata`).    |
| Nome da ferramenta      | Lido das `functionDeclarations` recebidas, para não depender de prefixo do adaptador MCP.                             |
| O que não cobre         | Qualidade da resposta, _prompt_ e escolha de ferramenta pelo modelo real: isso é a bateria de perguntas do relatório. |
