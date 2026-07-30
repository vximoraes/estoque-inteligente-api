# Fluxo GitLab

Gerenciado via `glab` CLI (grupo `estoque-inteligente`, projetos `estoque-inteligente-api` e `estoque-inteligente-front`). **Toda ação de push, criação/merge de MR e criação/fechamento de issue exige confirmação explícita do usuário antes de executar** — vale para qualquer tipo de task (feature, bug fix, chore, etc.), não só exemplos específicos.

## Labels

Toda issue carrega três eixos, sempre:
- `prio::P1|P2|P3` — prioridade
- `size::XS|S|M|L|XL` — tamanho estimado
- `type::Bug|Chore|Code|Code Test|Documentation|Feature|Plan Test|Spike` — natureza da tarefa

Mais o eixo de status:
- `workflow::Backlog` → `workflow::Opened` → `workflow::Doing` → `workflow::QA` → (`workflow::Review` quando há MR aberta)

**Issue fechada não carrega nenhuma label `workflow::`** — o estado "closed" do próprio GitLab já basta; não usar `workflow::Closed`.

Para remover uma label via `glab issue update`, usar `--unlabel "nome"` — **nunca** `--label "-nome"`. Esse segundo formato não remove nada, cria uma label lixo literal chamada `-nome` e deixa a original intacta.

## Assignee

Toda issue criada via `glab issue create` leva `--assignee vximoraes` (dono do projeto) — não deixar sem assignee.

## Branches

Nome: `<numero-da-issue>-slug-do-titulo` (ex.: `6-migrar-arquitetura-da-api-para-modulos`), criada a partir de `develop`.

## MRs

Alvo padrão é `develop` (não `main`). Ao abrir a MR, descrição referencia a issue (`Fecha #N`) — o GitLab não fecha a issue nem limpa a label `workflow::` sozinho no merge; isso é feito manualmente depois.

## Fechar uma task

1. Merge da MR (branch → `develop`)
2. Remover labels `workflow::*` da issue
3. `glab issue close <numero>`
