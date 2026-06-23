# Capacidades do Agente de IA

Documentação do agente conversacional do Estoque Inteligente: ferramentas MCP disponíveis, escopo, guardrails e princípios de segurança.

---

## Modelo e Configuração

| Parâmetro | Valor |
|---|---|
| Modelo | Gemini 2.5 Flash (`gemini-2.5-flash`) |
| Framework de orquestração | LangGraph (`createReactAgent`) |
| Paradigma de raciocínio | ReAct (Reasoning and Acting) |
| Temperatura | `0.2` |
| Janela de contexto (histórico) | 15 mensagens |
| Protocolo de integração | MCP via `MultiServerMCPClient` |
| Autenticação | Bearer Token (propagado do usuário autenticado) |

---

## Ferramentas MCP Disponíveis

O servidor MCP (`/mcp`) expõe 10 ferramentas de **somente leitura**, organizadas por domínio operacional.

### Inventário

#### `buscarItens`
Busca itens do inventário com filtros opcionais de nome e status.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | `string` | Não | Busca parcial (case-insensitive) pelo nome do item |
| `status` | `enum` | Não | `"Em Estoque"` · `"Baixo Estoque"` · `"Indisponível"` |
| `limite` | `integer` | Não | Máximo de resultados (1–50, padrão: 20) |

**Retorna:** `id`, `nome`, `descricao`, `quantidade`, `estoque_minimo`, `status`, `categoria`

---

#### `buscarEstoque`
Consulta registros de quantidade distribuída por localização.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `itemId` | `string` | Não | ID do item para filtrar |
| `localizacaoId` | `string` | Não | ID da localização para filtrar |
| `limite` | `integer` | Não | Máximo de resultados (1–50, padrão: 20) |

**Retorna:** `item`, `localizacao`, `quantidade`, `atualizado_em`

---

#### `verificarItensAbaixoMinimo`
Retorna todos os itens com quantidade abaixo ou igual ao estoque mínimo, ordenados pelo maior déficit.

Sem parâmetros de entrada.

**Retorna:** `nome`, `quantidade_atual`, `estoque_minimo`, `status`, `categoria`, `deficit`

---

#### `resumoEstoque`
Painel estatístico consolidado do inventário. Útil para responder perguntas amplas sem encadear múltiplas chamadas.

Sem parâmetros de entrada.

**Retorna:** `total_itens`, `em_estoque`, `baixo_estoque`, `indisponivel`, `emprestimos_ativos`, `emprestimos_atrasados`

---

### Movimentações e Empréstimos

#### `buscarMovimentacoes`
Lista entradas e saídas de estoque com filtros temporais e por item.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `tipo` | `enum` | Não | `"entrada"` · `"saida"` (minúsculas) |
| `dataInicio` | `string` | Não | ISO 8601 (ex: `2026-01-01`) |
| `dataFim` | `string` | Não | ISO 8601 (ex: `2026-12-31`) |
| `itemNome` | `string` | Não | Busca parcial pelo nome do item |
| `limite` | `integer` | Não | Máximo de resultados (1–50, padrão: 20) |

**Retorna:** `tipo`, `item`, `localizacao`, `quantidade`, `responsavel`, `data_hora`

---

#### `buscarEmprestimos`
Recupera empréstimos com status calculado em tempo real (não armazenado no banco).

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | `enum` | Não | `"Ativo"` · `"Devolvido"` · `"Atrasado"` |
| `solicitanteNome` | `string` | Não | Busca parcial pelo nome do solicitante |
| `limite` | `integer` | Não | Máximo de resultados (1–50, padrão: 20) |

**Retorna:** `item`, `localizacao`, `solicitante`, `quantidade_emprestada`, `quantidade_devolvida`, `quantidade_aberta`, `data_prevista_devolucao`, `status`

> **Nota:** o `status` é calculado em tempo real com base em `quantidade_aberta` e `data_prevista_devolucao`.

---

### Orçamentos

#### `buscarOrcamentos`
Lista orçamentos com itens e fornecedores associados.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | `string` | Não | Busca parcial pelo nome do orçamento |
| `limite` | `integer` | Não | Máximo de resultados (1–50, padrão: 20) |

**Retorna:** `id`, `nome`, `descricao`, `total`, `quantidade_itens`, `itens[]` (item, fornecedor, quantidade, valor_unitario, subtotal), `criado_em`

---

### Entidades de Suporte

#### `buscarCategorias`
Lista todas as categorias de itens ativas.

Sem parâmetros de entrada.

**Retorna:** `id`, `nome`

---

#### `buscarLocalizacoes`
Lista todos os locais de armazenamento ativos (prateleiras, depósitos, laboratórios, etc.).

Sem parâmetros de entrada.

**Retorna:** `id`, `nome`, `descricao`

---

#### `buscarFornecedores`
Lista fornecedores ativos com filtro opcional por nome.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | `string` | Não | Busca parcial pelo nome do fornecedor |

**Retorna:** `id`, `nome`, `contato`, `email`

---

## Escopo e Guardrails

### O que o agente responde

- Itens do estoque (quantidades, categorias, localização, status)
- Movimentações de entrada e saída
- Empréstimos de equipamentos
- Orçamentos e pedidos de compra
- Alertas de estoque mínimo e itens indisponíveis
- Análises e inferências derivadas dos dados acima (rankings, comparações, prioridades)
- Cumprimentos e saudações simples

### O que o agente recusa

- Perguntas sobre programação, código ou tecnologia em geral
- Assuntos não relacionados ao trabalho (entretenimento, piadas, etc.)
- Qualquer tarefa fora do domínio de estoque

### Comportamento analítico esperado

O agente **não recusa** análises que possam ser derivadas dos dados disponíveis. Exemplos:

| Pergunta do usuário | Comportamento esperado |
|---|---|
| "Qual item teve mais movimentações?" | Chama `buscarMovimentacoes`, conta por item, ranqueia |
| "Quais itens precisam de reposição urgente?" | Chama `verificarItensAbaixoMinimo`, ordena por déficit |
| "Qual o item mais solicitado em empréstimos?" | Chama `buscarEmprestimos`, agrega por item |

---

## Restrição de Somente Leitura

O agente **não executa nenhuma operação de escrita**. Não é possível via IA:

- Cadastrar, editar ou excluir itens
- Registrar movimentações ou empréstimos
- Criar ou modificar orçamentos
- Alterar qualquer registro no banco de dados

Toda alteração de dados deve ser feita pelo usuário por meio das interfaces gráficas do sistema. Essa restrição é aplicada em duas camadas:

1. **Servidor MCP** — nenhuma ferramenta de escrita está registrada
2. **System prompt** — instrução explícita de que o agente é somente leitura

---

## Formato das Respostas

- Sempre em **Markdown**
- Tabelas para listas de itens e dados tabulares
- Negrito para valores críticos, nomes de itens e totais
- Respostas curtas e diretas — sem parágrafos introdutórios
- Idioma: **Português do Brasil**
- Erros internos ou falhas de ferramenta: reportados em uma única frase (`Não foi possível obter os dados no momento.`)
