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

### 4. Requisitos de Implementação

#### 4.1. Componente de Troca de Tema (```src/components/ThemeToggle```)
Crie um componente simples (pode ser um botão ou um switch neomórfico) que utiliza um React Hook (ex: ```useEffect``` e ```useState```) para adicionar/remover as classes ```.theme-light``` e ```.theme-dark``` do body. Persista a preferência no localStorage.

#### 4.2. Estilização de Componentes Neumórficos
* Aplique os tokens consistentemente nos arquivos .```module.css```:

* ```App``` (Layout): Deve usar ```background-color: var(--color-bg)``` e ```color: var(--color-text-primary)```.

* ```Header```: Barra superior sutil.

* ```StatCards``` e ```TrendChart``` (Container): Devem usar a sombra principal para parecerem extrudados.

```css
.cardContainer {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-primary-flat);
  padding: var(--spacing-lg);
}
```
* Filtros (Dropdowns): Devem usar uma sombra mais suave ou uma versão "pressionada" (inset box-shadow) para interatividade.

### 5. Instruções de Execução para o Agente
1. Crie o arquivo ```src/styles/variables.css``` com as variáveis descritas no item 3.3.

2. Certifique-se de que este arquivo CSS global seja importado no ```src/main.tsx```.

3. Desenvolva o componente ```src/components/ThemeToggle``` e integre-o ao Header ou App para alternar as classes do body.

4. Atualize os arquivos ```.module.css``` dos componentes existentes (```Header```, ```StatCards```, ```TrendChart```) para utilizar os novos tokens e aplicar as sombras neumórficas.

5. Faça um commit ao final da implementação: ```feat: implementa design system neumórfico e temas claro/escuro.```