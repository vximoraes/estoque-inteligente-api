---
description: Princípios de engenharia obrigatórios em qualquer alteração de código.
---

# Princípios de Engenharia

## DRY — Don't Repeat Yourself

- Lógica repetida em ≥2 lugares vira helper (`src/utils/`), extensão de `Repository`/`Service` compartilhada ou middleware.
- Regra de negócio duplicada = fonte única de verdade — regra de validação vive no `<Nome>Schema.ts`/`<Nome>QuerySchema.ts`, nunca copiada num segundo módulo.
- Duplicação incidental (2 módulos parecidos por razões diferentes, ex.: `item` e `categoria` com validação levemente distinta) NÃO é violação — não abstrair cedo demais.

## KISS — Keep It Simple

- Solução mais simples que resolve o requisito. Sem camada especulativa acima da divisão padrão (Model/Schema/QuerySchema/FilterBuilder/Repository/Service/Controller/Routes/Docs).
- Preferir código legível a "esperto". Se precisa de comentário pra explicar o quê, simplificar.

## YAGNI — You Aren't Gonna Need It

- Implementar só o que a issue/spec pede. Sem endpoint, campo ou tool MCP "pro futuro".
- Sem generalizar `FilterBuilder`/`Service` sem 2+ casos de uso reais.

## SOLID (subset pragmático — não dogmático)

- **SRP**: Controller só faz parse+chamada+resposta; Service só regra de negócio; Repository só acesso a dado. Arquivo que mistura camadas é sinal de quebra.
- **DIP**: Service depende do `Repository` (abstração de acesso a dado), não monta query Mongo direto; Controller depende do `Service`, não acessa Model.
- OCP/ISP: aplicar onde services/interfaces se beneficiam de fato (ex.: `FilterBuilder` extensível por query) — não forçar interface em módulo simples.
- LSP: só relevante com herança — evitar herança entre Services/Models, preferir composição.

**Prioridade em conflito:** KISS/YAGNI vencem SOLID. Nunca adicionar abstração SOLID que YAGNI condena.
