# Especificação: Frontend e UI (Neumorphic Design System)

## 1. Visão Geral
Single Page Application (SPA) para exibição de estatísticas de segurança com Design System Neumórfico (Soft UI).
* **Framework:** React com TypeScript (Vite).
* **Estilização:** CSS Modules e Variáveis Globais de CSS.
* **Ícones e Gráficos:** Lucide React e Recharts.

## 2. Design System Neumórfico
### 2.1. Variáveis CSS (`src/styles/variables.css`)
Suporte nativo a temas Light e Dark com troca reativa.
* **Light Theme:** Fundo `#E0E5EC`, Sombras planas (`20px 20px 60px #bec3c9, -20px -20px 60px #ffffff`), Texto Slate 700 e Cyan.
* **Dark Theme:** Fundo `#1C212E`, Sombras escuras (`20px 20px 60px #181c27, -20px -20px 60px #202635`), Texto Gray 100 e Violeta.
Elementos com bordas arredondadas generosas (`border-radius: 20px` a `30px`).

## 3. Cartões de Resumo (Summary Cards)
* **Layout:** Horizontal (`row`, `gap: 1rem`) com ícone à esquerda e blocos de texto à direita.
* **Ícones:** Total (`BarChart` ou similares), Frequente (`AlertCircle`), Média (`Calendar`).
* **Badge de Porcentagem:** Dinâmica, comparando com período anterior. Apenas visível se existirem dados comparativos.
