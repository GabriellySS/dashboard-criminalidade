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
* **Cache de Checkpoints em Memória (O(1)):** No início do processo, é executada uma única consulta no banco de dados (`_carregar_progresso_banco()`) fazendo o JOIN entre ocorrencias e municipios para carregar todos os pares `"MUNICÍPIO_ANO"` existentes. Esse conjunto é armazenado em um `set` de instância na memória do Python (`self._progresso_cache`), reduzindo o I/O do banco de dados (evitando consultas N+1 repetitivas no banco) e acelerando significativamente a performance da raspagem.
* **Retentativas:** Limite máximo de 3 tentativas para interação (`MAX_RETRIES = 3`).
* **Oscilações:** Timeout espera 5 segundos e tenta novamente recarregando a página.
* **Falha Graciosa:** Pula cidade com erro após 3 tentativas sem derrubar a execução global.

---

## 5. Variáveis de Ambiente e Conexão com o Banco (atualizado em perf/sec-p0-fundacao)

O pipeline **não utiliza mais credenciais hardcoded**. A conexão com o banco de dados é configurada
exclusivamente via variável de ambiente, lida com `python-dotenv`.

### Variável Requerida

| Variável | Descrição | Definida em |
|---|---|---|
| `DATABASE_URL` | String completa de conexão PostgreSQL | `.env` (local) / ambiente do sistema (produção) |

### Como Configurar

1. Na raiz do projeto, copie `.env.example` para `.env`.
2. Defina `DATABASE_URL` com suas credenciais.
3. O arquivo `.env` está no `.gitignore` e **jamais deve ser commitado**.

### Comportamento em Ausência de Variável

Se `DATABASE_URL` não estiver definida, o módulo `db_connection.py` levanta
`EnvironmentError` explicitamente na inicialização, impedindo que o pipeline rode
com configuração inválida silenciosa.

---

## 6. Arquitetura do Pipeline — Strategy Pattern (atualizado em refactor/pipeline-strategy-pattern)

### 6.1 Motivação

O scraper original era um script procedural monolítico (`scraper.py` com ~330 linhas)
acoplado exclusivamente ao portal da SSP-SP. Qualquer novo estado exigiria duplicar
todo o arquivo. A refatoração para **Strategy Pattern** desacopla a interface do
comportamento concreto, permitindo adicionar novos estados sem alterar o núcleo.

### 6.2 Estrutura de Diretórios

```
pipeline/
├── __init__.py
├── core/
│   ├── __init__.py          # re-exporta BaseScraper
│   └── base_scraper.py      # Interface abstrata (contrato)
└── adapters/
    ├── __init__.py
    └── ssp_sp/
        ├── __init__.py      # re-exporta SSPSpScraper
        └── scraper.py       # Implementação concreta SSP-SP

scraper.py                   # Entrypoint na raiz (runner enxuto, retrocompatível)
```

### 6.3 Interface Abstrata — `BaseScraper`

**Arquivo:** `pipeline/core/base_scraper.py`

```python
from abc import ABC, abstractmethod

class BaseScraper(ABC):
    estado_sigla: str   # ex: 'SP' — resolvido no ETL loader para estado_id
    fonte_nome: str     # ex: 'SSP-SP' — usado em logs e tabela fontes_dados

    @abstractmethod
    def get_available_years(self) -> list[int]:
        """Retorna anos disponíveis na fonte, em ordem decrescente."""
        ...

    @abstractmethod
    def run(self) -> None:
        """Executa o ciclo completo de ETL para o estado."""
        ...
```

**Validação fail-fast:** `__init_subclass__` verifica que toda subclasse concreta
declara `estado_sigla` e `fonte_nome` em tempo de definição da classe, não em runtime.

### 6.4 Adaptador Concreto — `SSPSpScraper`

**Arquivo:** `pipeline/adapters/ssp_sp/scraper.py`

Implementa `BaseScraper` com toda a lógica da SSP-SP encapsulada em métodos privados:

| Método | Responsabilidade |
|---|---|
| `run()` | Orquestra o ETL completo (cria temp_dir → carrega cache → scrape → cleanup) |
| `get_available_years()` | Navega headless para ler anos disponíveis no `<select>` |
| `_carregar_progresso_banco()` | Popula `self._progresso_cache` (set O(1)) com checkpoints do banco |
| `_scrape_with_playwright()` | Loop Playwright por (ano × região × município) com retry e checkpoint |
| `_processar_e_carregar_lote(filepath)` | Parse xlsx → transform → `carregar_dados_para_banco()` |

**Bug corrigido ([SCRAPER-02]):** `parse_mes_ano` agora usa `int()` explícito com
validação de range em vez de f-string `f"20{ano_suffix}"`, eliminando a ambiguidade
para sufixos como `"00"`.

### 6.5 Entrypoint — `scraper.py` (raiz)

O arquivo `scraper.py` na raiz do projeto foi reduzido a um runner enxuto:

```python
from pipeline.adapters.ssp_sp import SSPSpScraper

def main() -> None:
    scraper = SSPSpScraper()
    scraper.run()

if __name__ == "__main__":
    main()
```

**Retrocompatibilidade total:** `python scraper.py` continua funcionando exatamente
como antes. Nenhuma alteração é necessária em scripts de agendamento (cron, Celery, etc.).

### 6.6 Como Adicionar um Novo Estado (Guia)

1. Crie o diretório `pipeline/adapters/<sigla_uf>/`.
2. Crie `pipeline/adapters/<sigla_uf>/__init__.py` re-exportando a classe.
3. Crie `pipeline/adapters/<sigla_uf>/scraper.py` com a classe concreta:

```python
from pipeline.core import BaseScraper

class SSPRJScraper(BaseScraper):
    estado_sigla = "RJ"
    fonte_nome   = "ISP-RJ"

    def get_available_years(self) -> list[int]:
        # consulta API do ISP-RJ ou página de metadados
        ...

    def run(self) -> None:
        # lógica de extração específica do RJ
        ...
```

4. No entrypoint `scraper.py` (ou em um `sources.yaml` futuro — P3), importe e instancie o novo scraper.
5. Certifique-se que o estado `"RJ"` existe na tabela `estados` no banco (via seed do schema v2).
