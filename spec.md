# Especificação de Projeto: Monitor de Segurança SP (Neumorphic Design System)

## 1. Visão Geral
Construir o frontend de uma aplicação web (Single Page Application) que exibe dados estatísticos de criminalidade do estado de São Paulo. Esta fase foca na implementação de um **Design System Neumórfico (Soft UI)** com suporte nativo a temas Claro (Light) e Escuro (Dark). A troca de temas deve ser reativa.

## 2. Stack Tecnológico e Arquitetura Visual
* **Framework:** React com TypeScript (Vite).
* **Estilização:** CSS Modules (arquivos `.module.css` localizados ao lado de cada componente).
* **Fundação Visual:** Design Tokens definidos como Variáveis CSS globais no arquivo `src/styles/variables.css`. O tema é controlado alternando a classe `.theme-light` ou `.theme-dark` no elemento `body`.
* **Ícones:** Lucide React.
* **Visualização de Dados:** Recharts.

## 3. Design System & Design Tokens (src/styles/variables.css)

### 3.1. Princípios Neumórficos
O estilo neomórfico deve ser aplicado consistentemente. Elementos principais (como cartões e botões) devem ter bordas arredondadas generosas (`border-radius: 20px`) e sombras "suaves" que criam a ilusão de extrusão.

### 3.2. Estrutura de Tokens (CSS Variables)

Defina as seguintes variáveis dentro de `:root`, `.theme-light` e `.theme-dark`.

| Categoria | Token | Descrição |
| :--- | :--- | :--- |
| **Fundo** | `--color-bg` | A cor base do fundo (tela inteira). |
| **Superfície** | `--color-surface` | A cor dos cartões e elementos principais. Deve ser sutilmente diferente do fundo. |
| **Sombras (Claro)** | `--shadow-primary-flat` | `20px 20px 60px #bec3c9, -20px -20px 60px #ffffff` |
| **Sombras (Escuro)** | `--shadow-primary-flat` | `20px 20px 60px #181c27, -20px -20px 60px #202635` |
| **Texto** | `--color-text-primary` | Cor principal para títulos e dados. |
| **Texto Sutil** | `--color-text-secondary` | Cor para legendas e descrições menos importantes. |
| **Destaque** | `--color-accent` | Cor secundária sutil para interatividade (ex: um cyan ou roxo suave). |

### 3.3. Paleta Sugerida de Cores (Tokens)

```css
/* src/styles/variables.css */
:root {
  /* Espaçamento e Arredondamento Universais */
  --radius-xl: 30px;
  --radius-lg: 20px;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
}

.theme-light {
  --color-bg: #E0E5EC; /* Base Neumórfica Neutra */
  --color-surface: #E0E5EC; /* Superfície idêntica ao fundo */
  --color-text-primary: #374151; /* Slate 700 */
  --color-text-secondary: #6B7280; /* Slate 500 */
  --color-accent: #22D3EE; /* Cyan Suave */
  --shadow-primary-flat: 20px 20px 60px #bec3c9, -20px -20px 60px #ffffff;
}

.theme-dark {
  --color-bg: #1C212E; /* Dark Neutro */
  --color-surface: #1C212E;
  --color-text-primary: #F3F4F6; /* Gray 100 */
  --color-text-secondary: #9CA3AF; /* Gray 400 */
  --color-accent: #A78BFA; /* Violet Suave */
  --shadow-primary-flat: 20px 20px 60px #181c27, -20px -20px 60px #202635;
}
```

## 4. Arquitetura de Componentes e UI (Flat Design 2.0 / Enterprise UI)
A interface adota um design focado em dados, limpo e de alto contraste.
* **Estilo Base dos Cartões:** Sombras espessas são proibidas. Componentes como `Header`, `FilterBar`, `StatCards` e `TrendChart` devem usar:
  - `background-color: var(--color-surface)`
  - `border: 1px solid var(--color-border)`
  - `border-radius: var(--radius-md)`
  - `box-shadow: var(--shadow-subtle)`
* **StatCards:** Devem incluir "badges" (etiquetas) de variação percentual (ex: +12.5% ou -4.2%). Use as variáveis `--color-success` e `--color-danger` (com seus respectivos backgrounds) para estilizá-los.
* **TrendChart:** Gráfico de área limpo. A linha deve usar `var(--color-accent)` e o preenchimento da área deve ser muito sutil, usando `var(--color-accent-light)`.
* **RegionTable (Novo):** Tabela de dados estatísticos inserida abaixo do gráfico, contendo as colunas: Região, Ocorrências, Variação, Status e Ações. Segue a mesma lógica de bordas finas do sistema.

## 5. Instruções de Execução para o Agente
1. Leia as regras de UI atualizadas.
2. Refatore os arquivos `.module.css` existentes para remover qualquer estilo neomórfico residual e aplicar o padrão de bordas do Flat Design.
3. Atualize os componentes React para corresponder à nova estrutura (adicionando os badges nos cards).
4. Crie o novo componente estático `RegionTable.tsx` e `RegionTable.module.css`.