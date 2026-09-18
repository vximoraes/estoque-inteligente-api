# Testing

Duas suítes independentes: unitária (Jest com transform via Babel, ver bloco `"jest"` em `package.json`) e de rotas (`jest.routes.config.cjs`, contra um servidor real). `jest.setup.js` só se aplica à suíte unitária — seta `NODE_ENV=test` e mocka MinIO/Sharp/`getAuth()`, não sobe banco nenhum.

## Rodar

```bash
npm test                                                 # unitária, com coverage
npx jest src/modules/item/__tests__/ItemModel.test.ts    # um arquivo unitário
npx jest -t "nome do teste"                              # por nome

npm run test:server                                      # sobe a API de teste (porta 3011, Mongo efêmero, seed automático)
npm run test:routes                                      # em outro terminal — ou deixe o próprio globalSetup subir o servidor sozinho
```

## Testes de Model (confiáveis, é o padrão a seguir)

Ficam em `src/modules/<nome>/__tests__/<Nome>Model.test.ts`. Cada arquivo sobe sua **própria** instância `mongodb-memory-server` em `beforeAll` e derruba em `afterAll`:

```ts
mongoServer = await MongoMemoryServer.create();
await mongoose.connect(mongoServer.getUri());
```

Testam o schema Mongoose isoladamente (validação, índices únicos, defaults) — não sobem o Express app. Ao criar um módulo novo, copiar esse padrão de um módulo existente (`item` ou `categoria`) em vez de inventar setup próprio.

## Testes de rotas (`*Routes.test.ts`) — suíte de integração real, use como referência

Os arquivos `src/modules/*/__tests__/*Routes.test.ts` fazem `supertest` contra `BASE_URL` (`http://localhost:${PORT}`, default `3011` em teste) e autenticam via `POST /api/auth/sign-in/email` (Better Auth, plugin `bearer()`), lendo `res.body.token`. `npm run test:routes` (`jest.routes.config.cjs`) cuida de tudo sozinho: `globalSetup` sobe um `MongoMemoryReplSet`, roda `src/seeds/seeds.ts` e inicia `server.ts` real; `globalTeardown` derruba tudo no final. Rodam com `maxWorkers: 1` — as 12 suítes compartilham um único servidor e banco, então nenhuma pode mutar dado do seed (usar sempre prefixo `zz-<recurso>-` nos nomes criados em teste).

Helper compartilhado em `test/helpers/rotasTestHelper.ts` (fora de `src/`, não é coletado por nenhuma das duas configs de Jest) — concentra login (`logarAdmin`/`logarUsuarioPadrao`), factories (`criarCategoria`, `criarItem`, ...) e asserts de envelope/paginação. Usar esse helper em vez de duplicar `request(BASE_URL).post(...).set('Authorization', ...)` em cada arquivo novo.

O seed cria três identidades fixas: admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, acesso total) e usuário padrão (`USER_EMAIL`/`USER_PASSWORD`, grupo `Usuario` — sem acesso a `usuarios`/`grupos`/`rotas`, acesso total ao resto). Use o usuário padrão para os cenários de RBAC (`403` nas rotas restritas, `200`/`201` nas demais) — nunca dependa de um usuário criado manualmente fora do seed.

Documentação por recurso em `documentacao/suites-de-teste/suite-teste-<recurso>.md` — mantida sincronizada com esses arquivos de teste.

## Outros testes unitários

`src/middlewares/__tests__/` e `src/utils/**/__tests__/` testam middlewares e helpers isoladamente (sem subir banco), geralmente mockando dependências diretas.
