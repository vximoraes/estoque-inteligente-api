# Testing

Jest com transform via Babel (`babel-jest`, ver bloco `"babel"`/`"jest"` em `package.json`), `testEnvironment: node`. `jest.setup.js` só seta `NODE_ENV=test` e mocka MinIO/Sharp — não sobe banco nenhum globalmente.

## Rodar

```bash
npm test                                          # tudo, com coverage
npx jest src/modules/item/__tests__/ItemModel.test.ts   # um arquivo
npx jest -t "nome do teste"                       # por nome
```

## Testes de Model (confiáveis, é o padrão a seguir)

Ficam em `src/modules/<nome>/__tests__/<Nome>Model.test.ts`. Cada arquivo sobe sua **própria** instância `mongodb-memory-server` em `beforeAll` e derruba em `afterAll`:

```ts
mongoServer = await MongoMemoryServer.create();
await mongoose.connect(mongoServer.getUri());
```

Testam o schema Mongoose isoladamente (validação, índices únicos, defaults) — não sobem o Express app. Ao criar um módulo novo, copiar esse padrão de um módulo existente (`item` ou `categoria`) em vez de inventar setup próprio.

## Testes de rotas (`*Routes.test.ts`) — quebrados, não usar como referência

Os arquivos `src/modules/*/__tests__/*Routes.test.ts` fazem `supertest` contra `BASE_URL` e tentam logar via `POST /login` com JWT (`process.env.JWT_SECRET_ACCESS_TOKEN`). Esse fluxo é anterior à migração para Better Auth: a rota `/login` não existe mais (auth agora é `/api/auth/*`), e o suite falha antes mesmo de rodar por causa do transform do Babel não entender o pacote ESM do `better-auth` (`SyntaxError: Cannot use import statement outside a module` ao importar `AuthMiddleware.ts`). Não copiar esse padrão para testes novos nem assumir que esses arquivos passam — hoje eles quebram no `require` do `AuthMiddleware`. Se for necessário testar uma rota end-to-end, alinhar antes com o usuário como autenticar via Better Auth nesse contexto (sessão de teste, cookie, ou mock de `getAuth()`).

## Outros testes unitários

`src/middlewares/__tests__/` e `src/utils/**/__tests__/` testam middlewares e helpers isoladamente (sem subir banco), geralmente mockando dependências diretas.
