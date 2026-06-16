# Especificação: Lógica de Filtros e Cascata no Frontend

## 1. Filtragem Cruzada
A SPA utiliza regras complexas de filtragem cruzada e cascatas de dependências.

## 2. Cascata Geográfica (Região > Município)
* **Estado Inicial:** `regiaoSelecionada` ('Capital'), `municipioSelecionado` ('São Paulo (Capital)').
* O dropdown de Município é dependente do de Região. 
* Fica desabilitado se a Região for "Todas". 
* Quando uma Região é selecionada, o município assume o padrão "Todas as cidades", permitindo visualização agregada macro.

## 3. Cascata de Tipologia (Categoria > Tipo Específico)
* **Estado Inicial:** `categoriaSelecionada` ('Todas').
* O dropdown de Categoria precede o de Tipo de Crime.
* Selecionar Categoria altera as opções de Tipo para listar apenas crimes daquela macro-categoria.

## 4. Filtro de Ano e Mês
* Ano é listado em ordem decrescente.
* Mês padrão inicial: 'Todos'. O componente extrai dinamicamente a lista de meses únicos dos dados retornados.
* Quando o ano é nulo ou vazio, exibe a série histórica completa (todos os anos).
