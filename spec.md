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

## 4. Arquitetura de Componentes e UI (Atualização de Layout)
* **CrimeDistributionChart (Gráfico de Rosca / Donut Chart):**
  - Deve ser implementado utilizando a biblioteca `recharts` (componentes `<PieChart>`, `<Pie>`, `<Cell>`).
  - **Disposição Estrutural (Layout Vertical):** O contêiner interno do cartão deve seguir um fluxo de coluna (`display: flex; flex-direction: column; align-items: center;`).
  - **Legendas/Listagem:** A listagem detalhada por Tipo de Crime (contendo o indicador de cor, nome da categoria, porcentagem e valor absoluto) deve ser renderizada na parte superior do bloco de conteúdo.
  - **Gráfico de Pizza:** O gráfico de rosca físico com o totalizador centralizado (`total`) deve se posicionar obrigatoriamente **abaixo** dessa listagem de legendas, centralizado horizontalmente.
  - O estilo visual deve herdar os tokens globais do Flat Design 2.0 (sem bordas grossas ou sombras internas).

## 5. Gerenciamento de Estado e Lógica (Atualização)
1. **Estado do Filtro de Mês:**
   - Adicionar o estado `mesSelecionado` (Valor inicial: 'Todos') no `src/App.tsx`.
2. **Extração Dinâmica de Filtros:**
   - O componente `FilterBar` deve extrair dinamicamente a lista de meses únicos presentes no `mockData.json` para preencher as opções do novo dropdown de meses, evitando duplicados.
3. **Lógica de Filtragem Cruzada (useMemo):**
   - A constante `dadosFiltrados` deve passar a filtrar os registros considerando quatro critérios simultâneos: Município, Tipo de Crime, Ano e Mês.
   - Se o mês selecionado for 'Todos', a restrição de mês deve ser ignorada na filtragem.