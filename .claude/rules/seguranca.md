---
description: Segurança como requisito funcional. Sempre ativa.
---

# Segurança (security-first)

- Segurança = requisito funcional, não melhoria opcional.
- Validar 100% dos inputs (`req.params`, `req.query`, `req.body`) via Zod (`<Nome>Schema.ts`/`<Nome>QuerySchema.ts`) no Controller, antes de chamar o Service — nunca confiar em dado bruto do request.
- Nunca confiar em dado do cliente sem validar autorização + contexto do usuário autenticado — toda rota protegida passa por `AuthMiddleware` (sessão) e `AuthPermission`/`PermissionService` (RBAC), inclusive a exceção hardcoded de auto-acesso em `/usuarios/:id` deve continuar comparando `params.id === userId`, não confiar em campo do body.
- Nunca vazar segredo, stack trace, token, cookie, hash, credencial ou detalhe interno em resposta HTTP (`CommonResponse.error`) ou log (`pino`) — `errorHandler` central deve sempre mapear pra mensagem segura.
- Sem fallback silencioso em auth/autorização — ausência de sessão ou permissão sempre gera `CustomError` explícito (401/403), nunca segue o fluxo como se autorizado.
- Fluxos multi-etapa (ex.: criar `usuario` + registro relacionado, Auth + tabela de negócio): garantir consistência transacional (Mongoose session/transaction) ou compensação explícita se uma etapa falhar no meio.
- Dependências: preferir libs maduras e mantidas. Evitar abandonadas/risco conhecido.
- Toda rota nova precisa do registro `Rota` correspondente (domínio/flags certos) — sem isso a permissão nega mesmo com código certo, e não é aceitável abrir rota sem esse registro "temporariamente".
