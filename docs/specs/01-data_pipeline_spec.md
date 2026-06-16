# Especificação: Automação e Pipeline de Dados (Playwright + Pandas)

## 1. Visão Geral
O objetivo deste pipeline é operar como um robô de extração 100% automatizado (RPA/Web Scraping). Ele navega no portal da Secretaria de Segurança Pública de São Paulo (SSP-SP), interage com os formulários para descarregar os dados brutos e utiliza um pipeline ETL para converter esses dados.

## 2. Stack Tecnológico
* **Linguagem:** Python 3.x
* **Ambiente Virtual:** Utilização obrigatória da diretoria `.venv`.
* **Automação Web:** `playwright` (para navegação headless e interceção de downloads).
* **Processamento de Dados:** `pandas`, `openpyxl`.
* **Gestão de Dependências:** `requirements.txt`.

## 3. Fluxo de Automação (ETL)
1. **Extração Tripla (Ano > Região > Município):** O fluxo do Playwright extrai opções de Ano, Região e Município e faz o download iterativo.
2. **Inclusão de Todos os Tipos de Crime:** A planilha oficial lista dezenas de crimes. Sanitização Universal aplicando Title Case e removendo espaços.
3. **Persistência Relacional:** O Pandas lê, agrupa e usa SQLAlchemy/psycopg2 para inserção no PostgreSQL.
4. **Higienização de Tipos de Crime:**
   - Remoção de números entre parênteses.
   - Remoção de linhas onde o crime começa com "Total".
   - Exclusão de linhas de vítimas (Nº De Vítimas).
5. **Dicionário de Padronização:** Substituições exatas (ex: "Furto - Outros" -> "Furto (Geral)").
6. **Criação de Macro-Categorias:** Nova coluna `categoria_crime` inferida a partir do nome do crime.

## 4. Resiliência, Performance e Tolerância a Falhas
* **Cache de Checkpoints em Memória (O(1)):** No início do processo, é executada uma única consulta no banco de dados (`carregar_progresso_banco()`) fazendo o JOIN entre ocorrencias e municipios para carregar todos os pares `"MUNICÍPIO_ANO"` existentes. Esse conjunto é armazenado em um `set` global na memória do Python (`PROGRESSO_CACHE`), reduzindo o I/O do banco de dados (evitando consultas N+1 repetitivas no banco) e acelerando significativamente a performance da raspagem.
* **Retentativas:** Limite máximo de 3 tentativas para interação (`MAX_RETRIES = 3`).
* **Oscilações:** Timeout espera 5 segundos e tenta novamente recarregando a página.
* **Falha Graciosa:** Pula cidade com erro após 3 tentativas sem derrubar a execução global.
