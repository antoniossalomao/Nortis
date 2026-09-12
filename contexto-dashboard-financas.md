# Contexto — App de Gestão de Finanças Pessoais

## Stack atual
- Single-file HTML/CSS/JS puro (sem build, sem framework).
- Gráficos: Chart.js 4.4.1 via CDN (`cdnjs.cloudflare.com`).
- Persistência: API `window.storage` (get/set assíncrono, chave-valor, escopo pessoal) — **não é localStorage**, é uma API de storage do ambiente Claude Artifacts. Se for portar pra fora do Claude, precisa trocar por localStorage, IndexedDB ou backend real.
- Sem dependências de backend/API externa hoje.

## Estrutura de dados
```js
// transaction
{ id, type: "receita"|"gasto", desc, amount, category, date }

// goal (meta de economia)
{ id, name, target, current }
```
Categorias fixas:
- receita: Salário, Estágio, Freelance, Outros
- gasto: Moradia, Alimentação, Transporte, Lazer, Saúde, Educação, Assinaturas, Outros

## Funcionalidades implementadas
- KPIs do mês: receitas, gastos, saldo, taxa de economia (%).
- Navegação de mês (setas prev/next).
- Gráfico de tendência (barras, últimos 6 meses, receita vs gasto).
- Gráfico donut de gastos por categoria.
- Tabela de transações do mês (add/remover).
- Metas de economia com barra de progresso e botões de incremento rápido (+50/+100/+500).
- Modais de criação (lançamento e meta).

## Design system
- Tema escuro preto/azul, glassmorphism (blur + bordas translúcidas).
- Paleta: `--blue:#4d7fff`, `--cyan:#5eead4`, `--green:#34d399` (receita), `--red:#fb7185` (gasto).
- Tipografia tabular (`font-feature-settings: 'tnum'`) pra alinhar números.
- Ícones SVG inline (sem bibliotecas de ícone).

## O que falta / possíveis próximos passos
- Editar transação existente (hoje só cria/remove).
- Orçamento por categoria (limite mensal + alerta de estouro).
- Exportar/importar dados (JSON ou CSV).
- Múltiplas contas/carteiras.
- Filtro por categoria na tabela.
- Recorrência automática (ex: salário todo mês).
- Decidir stack de persistência real se for virar um app de verdade (fora do Claude): localStorage simples, IndexedDB, ou backend com SQLite/Postgres.
- Responsividade mobile (hoje só tem breakpoint básico em 920px).

## Pedido pro Codex
Preciso de ajuda para [DESCREVER A TAREFA ESPECÍFICA DE HOJE — ex: "portar isso pra um app standalone com localStorage" / "adicionar edição de transação" / "criar orçamento por categoria"].
