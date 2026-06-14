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

## 4. Arquitetura de Componentes e UI (Atualização de Legendas)
* **CrimeDistributionChart (Gráfico de Rosca / Donut Chart):**
  - O componente não deve renderizar todos os crimes brutos.
  - Deve classificar (sort) o array de dados processados em ordem decrescente pelo volume de ocorrências.
  - Manter apenas os 4 tipos de crimes com maiores índices como fatias individuais.
  - Todos os crimes restantes devem ter seus valores somados e agrupados sob uma única fatia rotulada dinamicamente como "Outros", garantindo que a rosca sempre feche 100% do total real.
  - Deve conter um título e subtítulo alinhados ao padrão Enterprise UI.
  - **Disposição Estrutural:** O layout principal do card deve seguir um fluxo vertical (`display: flex; flex-direction: column; gap: 1.5rem;`).
  - **Legendas Customizadas (Lista de Progresso 100% Width):**
    - A lista de legendas deve ser posicionada na parte superior do card, acima do gráfico de rosca, e ocupar toda a largura disponível (`width: 100%`).
    - Cada item da legenda deve ser um bloco contendo duas linhas:
      - **Linha Superior (Dados):** Um marcador circular com a cor correspondente à fatia, o nome do crime alinhado à esquerda, e à direita os valores textuais (o número absoluto em negrito e a porcentagem sutil ao lado, ex: **4,312** `34.6%`).
      - **Linha Inferior (Barra de Progresso):** Um contêiner de fundo cinza sutil (`var(--color-border)`) com 100% de largura, altura fina (ex: 4px ou 6px) e arredondado, contendo uma barra interna preenchida com a cor correspondente ao crime, cuja largura (`width`) seja equivalente à porcentagem daquele crime no total acumulado.
  - **Gráfico Físico (Rosca):** Deve ser posicionado na base do card, centralizado horizontalmente, exibindo o número totalizador no centro da rosca (`total`).
* **Cartões de Resumo (Summary Cards) - Layout e Ícones:**
  - **Layout:** O contêiner interno de cada cartão deve usar um layout horizontal (`display: flex; flex-direction: row; align-items: center; gap: 1rem;`). O ícone fica à esquerda e o bloco de texto (título e valor) à direita.
  - **Ícones (Substituição):** - Card Total: Substituir o ícone de carro por um ícone de gráfico ou somatório (ex: `BarChart`, `TrendingUp` ou `Activity` do Lucide-react/FontAwesome).
    - Card Frequente: Substituir por um ícone de alerta ou foco (ex: `AlertCircle` ou `Target`).
    - Card Média: Substituir por um ícone de calendário ou calculadora (ex: `Calendar` ou `Calculator`).
  - **Lógica da Porcentagem (Badge):** A porcentagem (badge verde/vermelho) no Card de Total deve ser calculada dinamicamente. Ela deve comparar o Total de Ocorrências do período atualmente selecionado com o período equivalente anterior. Se não houver dados anteriores para comparar, a badge não deve ser renderizada na tela.
  * **Tabela de Dados (Data Grid):**
  - Renomear o componente de "Detalhamento por Região" para "Detalhamento de Ocorrências".
  - O subtítulo deve refletir o nível de detalhe atual do filtro (ex: "Análise granular das ocorrências registradas").
  - **Colunas:** 1. `Município / Crime` (Exibe o nome do município ou do tipo de crime, dependendo do que estiver agrupado).
    2. `Ocorrências` (Valor absoluto).
    3. `Variação (Mês)` (Valor da coluna `variacao_mensal` gerada pelo Python).
    4. `Status` (Badge visual: Vermelho com texto "Alerta" se variação > 0; Verde com texto "Estável/Queda" se variação <= 0).
  - A tabela deve ser alimentada pelo estado `dadosFiltrados` e possuir paginação ou scroll interno se passar de 5 a 10 itens.
  - A coluna de "Ações" (AÇÕES) pode ser removida por enquanto, pois não temos sub-rotas no momento.

## 5. Gerenciamento de Estado e Lógica (Atualização)
1. **Estado do Filtro de Mês:**
   - Adicionar o estado `mesSelecionado` (Valor inicial: 'Todos') no `src/App.tsx`.
2. **Extração Dinâmica de Filtros:**
   - O componente `FilterBar` deve extrair dinamicamente a lista de meses únicos presentes no `mockData.json` para preencher as opções do novo dropdown de meses, evitando duplicados.
3. **Lógica de Filtragem Cruzada (useMemo):**
   - A constante `dadosFiltrados` deve passar a filtrar os registros considerando quatro critérios simultâneos: Município, Tipo de Crime, Ano e Mês.
   - Se o mês selecionado for 'Todos', a restrição de mês deve ser ignorada na filtragem.
4. **Filtros em Cascata (Região > Município):**
   - Adicionar o estado `regiaoSelecionada` (iniciando em 'Todas').
   - O `FilterBar` deve apresentar o dropdown de "Região" antes do de "Município".
   - A lista do dropdown de Municípios deve ser gerada dinamicamente baseada na Região selecionada (se uma região específica for escolhida, mostrar apenas cidades daquela região).