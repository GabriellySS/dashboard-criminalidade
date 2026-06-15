# Especificação: Automação e Pipeline de Dados SSP-SP (Playwright + Pandas)

## 1. Visão Geral
O objetivo deste script em Python é operar como um robô de extração 100% automatizado (RPA/Web Scraping). Ele deve abrir um browser invisível, navegar no portal da Secretaria de Segurança Pública de São Paulo (SSP-SP), interagir com os formulários para descarregar os dados brutos e, em seguida, utilizar um pipeline ETL para converter esses dados no formato JSON exigido pelo frontend em React.

## 2. Stack Tecnológico e Ambiente
* **Linguagem:** Python 3.x
* **Ambiente Virtual:** Utilização obrigatória da diretoria `.venv`.
* **Automação Web:** `playwright` (para navegação headless e interceção de downloads).
* **Processamento de Dados:** `pandas`, `openpyxl`.
* **Gestão de Dependências:** `requirements.txt`.

## 3. Estrutura de Dados Esperada (Banco de Dados PostgreSQL)
Os dados consolidados devem ser inseridos em tabelas relacionais no PostgreSQL. O esquema deve conter as seguintes informações por registro (exemplo de colunas):
- `id` (UUID ou Serial, Chave Primária)
- `regiao` (VARCHAR)
- `municipio` (VARCHAR)
- `categoria_crime` (VARCHAR)
- `tipo_crime` (VARCHAR)
- `ano` (INTEGER)
- `mes` (VARCHAR)
- `ocorrencias` (INTEGER)
- `variacao_mensal` (NUMERIC)

## 4. Fluxo de Automação Real (Escala Total: Anos x Cidades x Crimes)
1. **Extração Tripla (Ano > Região > Município):**
   - O fluxo do Playwright deve ser: Selecionar Ano -> Extrair opções de Região -> Para cada Região, selecionar -> Extrair opções de Município atreladas a essa região -> Para cada Município, exportar.
   - O arquivo temporário salvo deve conter a região no nome, ou a lógica do Pandas deve inferir a região com base nas pastas/nomes para embutir a coluna `regiao` no banco de dados.
2. **Inclusão de Todos os Tipos de Crime (Pandas ETL):**
   - A planilha oficial da SSP-SP lista dezenas de crimes em suas linhas. O script deve parar de filtrar tipos específicos.
   - **Sanitização Universal:** A função `normalize_text` deve aplicar um `Title Case` robusto (ex: "HOMICÍDIO DOLOSO" vira "Homicídio Doloso") e remover espaços em branco invisíveis (`strip()`) em toda e qualquer string da coluna `tipo_crime`.
3. **Persistência Relacional:** O Pandas deve ler o `TEMP_DIR`, agrupar os milhares de arquivos por Município e Crime, mantendo a série histórica de todos os anos contínua, e usar `SQLAlchemy` junto ao driver `psycopg2` para inserir os registros diretamente nas tabelas relacionais do banco PostgreSQL.
4. **Higienização de Tipos de Crime (Pandas ETL):**
   - O script deve limpar os nomes dos crimes ANTES de realizar a carga no PostgreSQL.
   - **Remoção de Lixo:** Utilizar Expressões Regulares (Regex) para remover qualquer número entre parênteses no final das strings (ex: ` (1)`, ` (2)`).
   - **Prevenção de Dupla Contagem:** O Pandas deve excluir (dropar) sumariamente qualquer linha onde a coluna `tipo_crime` comece com a palavra "Total".
   - **Isolamento de Métricas:** O Pandas deve excluir sumariamente qualquer linha onde a coluna `tipo_crime` comece com "Nº De Vítimas" ou "N° De Vítimas". Apenas as ocorrências base (BOs) devem permanecer no dataset.
5. **Dicionário de Padronização (De -> Para):**
   - Aplicar substituições exatas (replace) nas strings para melhorar a UX do painel:
     - "Furto - Outros" -> "Furto (Geral)"
     - "Roubo - Outros" -> "Roubo (Geral)"
     - "Homicídio Culposo Outros" -> "Homicídio Culposo"
     - "Lesão Corporal Culposa - Outras" -> "Lesão Corporal Culposa"
     - "Por Acidente De Trânsito" -> "(Trânsito)"
6. **Criação de Macro-Categorias (Nova Coluna):**
   - O Pandas deve criar uma nova coluna `categoria_crime` inferida a partir do nome do crime. Regras principais:
     - Contém "Homicídio Doloso" -> "Homicídio Doloso"
     - Contém "Homicídio Culposo" -> "Homicídio Culposo"
     - Contém "Lesão Corporal" -> "Lesão Corporal"
     - Contém "Roubo" -> "Roubo"
     - Contém "Furto" -> "Furto"
     - Contém "Estupro" -> "Estupro"
     - Qualquer outro caso -> "Outros Crimes"

## 5. Instruções para o Agente
1. Leia a atualização de escala estadual no @scraper_spec.md.
2. Refatore o `scraper.py` para remover a trava que limitava a extração apenas a São Paulo e Cotia.
3. Atualize a função de normalização de texto para tratar dinamicamente o nome de qualquer município do estado que apareça na planilha baixada.
4. Mantenha o cálculo de `variacao_mensal` agrupado por `["municipio", "tipo_crime"]` para que a variação percentual seja calculada corretamente e isolada dentro de cada cidade.