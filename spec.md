# Especificação de Projeto: MVP Dashboard de Segurança Pública (São Paulo)

## 1. Visão Geral
Construir o frontend de uma aplicação web (Single Page Application) que exibe dados estatísticos de criminalidade do estado de São Paulo. Esta fase do projeto utilizará dados estáticos (mock) para validar a interface, os filtros e a visualização gráfica antes da integração com uma API real.

## 2. Stack Tecnológico
* **Framework:** React com TypeScript (inicializado via Vite).
* **Estilização:** CSS Modules (arquivos `.module.css` para cada componente, garantindo escopo local e semântica no código).
* **Ícones:** Lucide React.
* **Visualização de Dados:** Recharts (para gráficos de linha e barras responsivos).

## 3. Estrutura de Dados (Mock)
Crie um arquivo `src/data/mockData.json` contendo um array de objetos com o seguinte formato. Gere dados fictícios, mas realistas, abrangendo os anos de 2019 a 2023 para as cidades de "São Paulo" (Capital) e "Cotia".

```json
[
  {
    "id": 1,
    "ano": 2023,
    "mes": "Janeiro",
    "municipio": "Cotia",
    "tipo_crime": "Roubo de Veículos",
    "ocorrencias": 45
  },
  {
    "id": 2,
    "ano": 2023,
    "mes": "Janeiro",
    "municipio": "São Paulo",
    "tipo_crime": "Roubo de Veículos",
    "ocorrencias": 1200
  }
]
```

*Gere pelo menos 50 registros variando anos, meses, as duas cidades e três tipos de crimes: "Roubo de Veículos", "Furtos" e "Homicídios Dolosos".*

## 4. Arquitetura de Componentes e UI
A interface deve ter um design limpo e moderno. Utilize variáveis de CSS (Custom Properties) no arquivo global para gerenciar a paleta de cores (fundo claro, cores de destaque para os gráficos, sombras suaves para os cartões).

1. ```Header``` (```Header.tsx``` + ```Header.module.css```): Barra de navegação simples contendo o título "Monitor de Segurança SP".

2. ```FilterBar``` (```FilterBar.tsx``` + ```FilterBar.module.css```): Uma barra de controles alinhada horizontalmente contendo:

    * Dropdown para selecionar o ```Município```.

    * Dropdown para selecionar o ```Tipo de Crime```.

    * Dropdown para selecionar o ```Ano```.

3. ```StatCards``` (```StatCards.tsx``` + ```StatCards.module.css```): Três cartões de resumo rápido exibidos no topo do painel:

    * Total de Ocorrências (baseado nos filtros atuais).

    * Média Mensal.

    * Mês com maior incidência.

4. ```TrendChart``` (```TrendChart.tsx``` + ```TrendChart.module.css```): Componente que renderiza um gráfico de linhas usando Recharts. O gráfico deve preencher bem o espaço e reagir instantaneamente aos filtros.

## 5. Gerenciamento de Estado e Lógica
O componente principal (```App.tsx``` ou ```Dashboard.tsx```) deve gerenciar o estado da aplicação utilizando React Hooks:

* Use ```useState``` para armazenar os valores selecionados nos filtros.

* Use ```useEffect``` ou ```useMemo``` para derivar os dados filtrados a partir do ```mockData.json``` sempre que um filtro for alterado.

* Se "Todos" estiver selecionado em um filtro, ele não deve restringir os dados.

## 6. Instruções de Execução para o Agente
1. Inicialize o projeto React com Vite e TypeScript.

2. Limpe os arquivos CSS globais padrão do Vite e configure uma paleta de cores básica usando ```:root```.

3. Instale as dependências: ```recharts``` e ```lucide-react```.

4. Crie a estrutura de pastas ```src/components```, ```src/data``` e ```src/types```.

5. Gere o arquivo ```mockData.json```.

6. Desenvolva os componentes descritos, criando um arquivo ```.module.css``` ao lado de cada ```.tsx```.

7. Garanta que o layout seja responsivo usando ```media queries``` nos módulos ```CSS```.
