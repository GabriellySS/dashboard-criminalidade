# Especificação: Frontend e UI (Flat Design System)

## 1. Visão Geral
Single Page Application (SPA) para exibição de estatísticas de segurança com Design System Flat (Flat 2.0).
* **Framework:** React com TypeScript (Vite).
* **Estilização:** CSS Modules e Variáveis Globais de CSS.
* **Ícones e Gráficos:** Lucide React e Recharts.

## 2. Design System Flat
### 2.1. Variáveis CSS (`src/styles/variables.css`)
Suporte nativo a temas Light e Dark com troca reativa.
* **Light Theme:** Fundo `#F8FAFC`, Superfície `#FFFFFF`, Borda `#E2E8F0`, Texto Slate 900 (`#0F172A`) / Slate 500 (`#64748B`) e Destaque Blue 500 (`#3B82F6`).
* **Dark Theme:** Fundo `#0F172A`, Superfície `#1E293B`, Borda `#334155`, Texto Slate 50 (`#F8FAFC`) / Slate 400 (`#94A3B8`) e Destaque Blue 400 (`#60A5FA`).
* **Estrutura:** Bordas com arredondamento sutil (`border-radius: 6px` a `12px`) e sombras sutis (`--shadow-subtle`).

## 3. Cartões de Resumo (Summary Cards)
* **Layout:** Horizontal (`row`, `gap: 1rem`) com ícone à esquerda e blocos de texto à direita.
* **Ícones:** Total (`BarChart` ou similares), Frequente (`AlertCircle`), Média (`Calendar`).
* **Badge de Porcentagem:** Dinâmica, comparando com período anterior. Apenas visível se existirem dados comparativos.
