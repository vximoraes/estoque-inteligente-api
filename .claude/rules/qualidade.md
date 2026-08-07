---
description: Qualidade, performance, consistência e postura frente a specs.
---

# Qualidade, Performance e Consistência

## Implementação

- Mudança pequena, coesa, focada no escopo da issue.
- Refatorar quando corrigir bug/risco/perf/complexidade/consistência exigir. Refatoração ampla fora de escopo = pedir autorização.
- Ler o código antes de alterar. Relatar inconsistência achada antes de corrigir fora de escopo.
- Preservar contratos públicos (formato de resposta `CommonResponse`, campos de `data`) salvo se a issue exigir mudança.
- Toda entrega roda `npm run fix` (lint + format), `npm run typecheck` e smoke dos fluxos críticos afetados (`npx jest <arquivo>` do módulo tocado, no mínimo).

## Performance (alvo do TCC)

- Normal: 1-3 usuários simultâneos. Máx resiliência: 100 req/min, 10 usuários, sem crash.
- Evitar N+1: usar `.populate()`/agregação do Mongoose em vez de query em loop no `Repository`/`Service`.
- Paginação e filtro sempre no banco (`mongoose-paginate-v2` + `FilterBuilder`) — nunca carregar coleção inteira pra filtrar/paginar em memória.
- Reduzir payload: `select`/projeção quando o endpoint não precisa do documento inteiro.
- Não bloquear o event loop — nada de laço síncrono pesado (hash custoso, parsing grande) no caminho de uma request.
- Isolar chamadas externas (ex.: envio de e-mail, chamada ao provider de IA em `src/modules/ia/`) da transação principal — falha nelas não deve derrubar a resposta do endpoint que as disparou.

## Consistência global

- Código, validação Zod, contrato de resposta (`CommonResponse`) e doc OpenAPI (`<nome>Docs.ts`) sempre 100% consistentes entre si.
- Padronizar nomenclatura, regra de negócio e formato de erro (`CustomError`) nos módulos afetados.
- API é fonte de verdade sobre nomes/tipos de campo — spec descreve intenção, schema Mongoose/Zod real decide o contrato.

## Specs são base, não teto

- Cumprir 100% dos contratos, campos, validações e checklists da spec.
- Verificar contrato real (`<Nome>Model.ts`, `<Nome>Schema.ts`, `/docs`) antes de confiar na spec.
- Divergência spec×implementação: corrigir na implementação, alinhando nome/tipo real usado em Model e Schema.
- Liberdade acima da spec: guard defensivo extra, seguir padrão do codebase, validação mais estrita que o mínimo pedido.
- Aceite final: funciona, contrato coerente, seguro, performático, robusto sob concorrência.
