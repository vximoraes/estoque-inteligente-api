# API conventions

## Formato de resposta

Toda resposta passa por `CommonResponse` (`src/utils/helpers/CommonResponse.ts`), envelope fixo:

```json
{
  "error": false,
  "code": 200,
  "message": "...",
  "data": { "docs": [...], "totalDocs": 0, "limit": 15, "totalPages": 0, "page": 1, "pagingCounter": 1, "hasPrevPage": false, "hasNextPage": false, "prevPage": null, "nextPage": null },
  "errors": []
}
```

- `CommonResponse.success/created/error/serverError` — nunca montar o JSON de resposta na mão num controller.
- Listagens paginam via `mongoose-paginate-v2` (`Repository` chama `.paginate(...)`), o formato acima é o retorno padrão da lib.
- Erros de negócio: `throw new CustomError({ statusCode, errorType, field, details, customMessage })` (`src/utils/helpers/CustomError.ts`) em Service/Repository — nunca `res.status(...)` fora do Controller, nunca `throw` de string/objeto solto. O `errorHandler` central converte o `CustomError` na resposta `CommonResponse.error`.

## Validação

- `<Nome>Schema.ts` (Zod) valida body de create/update; `<Nome>QuerySchema.ts` valida query string e `:id`. Controller sempre faz `Schema.parse(...)` antes de chamar o Service — nunca confiar em `req.body`/`req.query` sem passar pelo schema.
- `<Nome>FilterBuilder.ts` traduz query já validada em filtro Mongo — filtros novos entram aí, não espalhados dentro do Repository/Service.

## Autenticação & RBAC

- Sessão: Better Auth (`src/config/auth.ts`), montado em `/api/auth/*`. `AuthMiddleware.ts` exige sessão válida (cookie ou, via plugin `bearer()`, header `Authorization: Bearer <token>`).
- Autorização: `AuthPermission.ts` resolve a rota chamada na coleção `rota` (`rota`, `dominio`, flags `buscar/enviar/substituir/modificar/excluir` por método HTTP — ver `RotaModel.ts`) e chama `PermissionService.hasPermission(usuarioId, rota, dominio, metodo, params, httpMethod)`. Permissão vem da união dos `grupos` do usuário (mais permissões diretas nele, se houver campo `permissoes`).
- Exceção hardcoded em `PermissionService`: usuário sempre pode `GET/PATCH/PUT/DELETE` no próprio registro em `/usuarios/:id` (comparação `params.id === userId`), independente de grupo.
- **Toda rota nova precisa de um registro `Rota` correspondente** (seed ou criado via `/rotas`) com o domínio/flags certos — sem isso, `AuthPermission` nega mesmo com o código e o `Router` corretos.

## Tipos de entidade / módulo novo

- Um módulo novo replica a lista completa de arquivos descrita no `CLAUDE.md` (`Model/Schema/QuerySchema/FilterBuilder/Repository/Service/Controller/Routes/Docs/index`) — não pular etapa nem inventar camada nova.
- Docs OpenAPI (`<nome>Docs.ts`) são geradas a partir do mesmo Zod schema usado na validação (`@asteasolutions/zod-to-openapi`) — ao mudar um `Schema.ts`, atualizar o `Docs.ts` correspondente para não desalinhar `/docs`.

## Camada de IA/MCP

- Ferramentas em `src/libs/mcp/tools/` são **somente leitura** (consulta a dados já existentes) — não adicionar tool que escreve/edita dados sem alinhar antes, já que o LLM as chama de forma autônoma dentro do chat.
- O servidor MCP (`src/libs/mcp/mcpRoutes.ts`, rota `/mcp`) exige a mesma sessão Better Auth do resto da API (`getAuth().api.getSession(...)`) — não é um endpoint aberto.
