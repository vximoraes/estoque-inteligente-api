# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Comandos

```bash
npm run dev              # servidor de dev com hot reload (tsx watch server.js), na PORT (padrão 3010)
npm start                # roda uma vez, sem watch
npm test                 # jest --coverage (todos os testes)
npx jest path/to/file.test.ts            # roda um único arquivo de teste
npx jest -t "test name"                  # roda testes que casam com um nome
npm run seed              # popula o MongoDB com dados fake (src/seeds/seeds.ts)
npm run typecheck         # tsc --noEmit
npm run lint / lint:fix
npm run format / format:check            # prettier
npm run fix               # eslint --fix + prettier --write
docker compose up --build                # API + MongoDB + MinIO
```

Requer MongoDB acessível via `DB_URL` (ver `.env.example`). Testes de model sobem sua própria instância de `mongodb-memory-server` (por arquivo, em `beforeAll`/`afterAll`); `jest.setup.js` só define `NODE_ENV=test` e mocka MinIO/Sharp.

Este repositório é um workspace de um monorepo maior; o front-end irmão fica em `../estoque-inteligente-front` (com seu próprio `CLAUDE.md`) e precisa se manter sincronizado quanto ao contrato de autenticação descrito abaixo.

## Arquitetura

App Express montado em `src/app.ts`; o entrypoint do servidor é `server.ts`. Os módulos seguem um padrão em camadas consistente em `src/modules/<nome>/`:

```
<Nome>Model.ts          # schema/model Mongoose
<Nome>Schema.ts         # schema Zod para validação de payload de create/update
<Nome>QuerySchema.ts    # schema Zod para validação de query string / id
<Nome>FilterBuilder.ts  # monta os filtros Mongo a partir dos parâmetros de query
<Nome>Repository.ts     # acesso a dados (encapsula o Model, usa mongoose-paginate-v2)
<Nome>Service.ts        # lógica de negócio, chama o Repository
<Nome>Controller.ts     # faz parse do req com os schemas Zod, chama o Service, retorna CommonResponse
<nome>Routes.ts         # express.Router ligando os métodos do controller aos verbos HTTP
<nome>Docs.ts           # registra a documentação OpenAPI/Swagger do módulo (via @asteasolutions/zod-to-openapi)
index.ts                # barrel export do que está acima
```

Módulos: `usuario`, `categoria`, `localizacao`, `item`, `estoque`, `fornecedor`, `movimentacao`, `notificacao`, `orcamento`, `emprestimo`, `grupo`, `rota`, `ia`. Novas funcionalidades CRUD devem seguir essa mesma divisão de arquivos em vez de introduzir outra camada.

**Autenticação & permissões** (duas camadas independentes, ambas exigidas nas rotas protegidas):
- Autenticação de sessão é [better-auth](https://better-auth.com) (`src/config/auth.ts`), montada em `/api/auth/*` via `toNodeHandler`. Sessões ficam no Mongo, baseadas em cookie, com Google OAuth + e-mail/senha. `AuthMiddleware.ts` checa se existe uma sessão válida.
- Autorização granular é um RBAC próprio: `AuthPermission.ts` busca a rota requisitada na coleção `rota` (módulo `rota`), checa se o método HTTP está habilitado nela, e então chama `PermissionService` para verificar se o `grupo` do usuário tem essa permissão. Adicionar uma rota nova geralmente exige um registro/seed correspondente de `Rota`, senão ela retorna 404/403 mesmo com o código acessível.

**Respostas & erros**: controllers retornam via `CommonResponse` (`src/utils/helpers/CommonResponse.ts`) para um envelope consistente; falhas lançam `CustomError` (`src/utils/helpers/CustomError.ts`), capturado centralmente pelo middleware `errorHandler` montado por último em `app.ts`.

**Camada de IA/MCP** (`src/modules/ia/`, `src/libs/mcp/`): um assistente de chat embutido no app, construído com LangChain (`@langchain/core`, `@langchain/google-genai`, `@langchain/ollama`), que acessa os próprios dados do app através de um servidor MCP (`@modelcontextprotocol/sdk`) exposto em rotas registradas em `src/libs/mcp/mcpRoutes.ts`. As ferramentas MCP ficam em `src/libs/mcp/tools/` (um arquivo por ferramenta de consulta somente-leitura, ex.: `buscarItens.ts`, `resumoEstoque.ts`) — são as ferramentas que o LLM pode chamar, não endpoints HTTP para o front-end.

**Docs**: a UI do Swagger/OpenAPI é servida em `/docs` (Scalar), gerada a partir dos arquivos `*Docs.ts` registrados em `src/utils/openapi/registry.ts`.

**Logging**: `pino`, configurado em `src/utils/logger.ts`; verboso quando `DEBUGLOG=true`. O log por requisição é o `LogRoutesMiddleware`.
