# Plano de Expansão Arquitetural — Dashboard de Criminalidade

> **Classificação:** Documento Interno de Engenharia  
> **Autoria:** Auditoria Automatizada — Staff Software Engineer / Data Engineering  
> **Data:** Junho de 2026  
> **Versão:** 1.11 *(atualizado em 25/06/2026 — branch `feat/fullstack-p2-tipo-crime`)*  
> **Repositório:** `GabriellySS/dashboard-criminalidade`

---

## 1. Resumo Executivo

O projeto está em um ponto de inflexão crítico: o MVP foi validado com sucesso para o estado de **São Paulo** (fonte: SSP-SP), mas a arquitetura atual — em seus três pilares (Pipeline ETL, API e Frontend) — foi construída com acoplamento forte a esse único contexto geográfico e fonte de dados.

Este documento detalha os **gargalos identificados**, as **oportunidades de melhoria** e um **roadmap priorizado em três fases** para evoluir o sistema a uma plataforma nacional de análise criminal, capaz de ingerir dados de múltiplos estados, servir milhões de registros com baixa latência e entregar uma experiência de usuário de nível profissional.

**Impacto estimado das melhorias propostas:**

| Dimensão | Estado Atual | Após Expansão |
|---|---|---|
| Fontes de dados | 1 (SSP-SP) | N estados (arquitetura plugável) |
| Latência de API (rota pesada) | ~800ms–2s* | <120ms (com cache Redis) |
| Municípios suportados | ~645 (SP) | 5.570 (Brasil) |
| Índices no banco | 0 índices compostos | 4+ índices críticos |
| UX de carregamento | Estado binário loading/pronto | Skeleton progressivo + Suspense |

*Estimativa baseada em análise da query sem índices.

---

## 2. Diagnóstico Atual

### 2.1 Pontos Fortes

- **Pipeline robusto de checkpoint:** O `PROGRESSO_CACHE` em memória com verificação no banco (`carregar_progresso_banco`) evita re-scraping e torna o pipeline idempotente. Ponto de design correto e reutilizável.
- **ETL transacional:** O uso de `engine.begin()` no `etl_loader.py` garante atomicidade de cada lote — se uma inserção de ocorrências falhar, toda a operação do lote é revertida (rollback implícito). Fundamental para integridade de dados.
- **Skeleton Loader existente:** O componente `Skeleton.tsx` já existe e é usado no `RegionTable`. A infraestrutura de UX de carregamento está parcialmente implementada — basta expandi-la.
- **Agregação server-side:** A API já realiza `SUM` e `GROUP BY` antes de retornar dados ao cliente, evitando transferência massiva de registros brutos. Decisão arquitetural correta.
- **Schema relacional normalizado:** O banco de dados já possui 4 tabelas relacionadas com chaves estrangeiras e `CASCADE`, o que é uma base sólida para expansão.

### 2.2 Gargalos e Riscos Identificados

#### 🔴 Críticos (bloqueiam a escala)

**[DB-01] Ausência total de índices compostos**

O schema em [`database/schema.sql`](file:///e:/PROJETOS/dashboard-criminalidade/database/schema.sql) não possui nenhum índice além das PKs. A query principal de [`api/main.py`](file:///e:/PROJETOS/dashboard-criminalidade/api/main.py) filtra por `m.nome`, `r.nome`, `o.ano` e faz JOIN em 4 tabelas. Com dados de todo o Brasil (~5.570 municípios × N anos × N crimes), um `SEQUENTIAL SCAN` nessa query pode facilmente ultrapassar 10 segundos.

**[DB-02] Acoplamento geográfico implícito no schema**

A tabela `regioes` não possui nenhuma coluna de `estado` (UF). Uma "região" chamada "Capital" no banco não permite distinção entre a Capital de São Paulo e a Capital de outro estado. O sistema **não tem como** suportar múltiplos estados sem uma migração de schema.

**[DB-03] String de conexão com credenciais hardcoded**

Em [`db_connection.py`](file:///e:/PROJETOS/dashboard-criminalidade/db_connection.py), linha 12: `DATABASE_URL = 'postgresql://admin:admin@localhost:5432/ssp_dashboard'`. Credenciais em texto claro em código-fonte é um risco de segurança que bloqueia qualquer deploy em ambiente compartilhado ou CI/CD.

**[SCRAPER-01] Acoplamento total ao DOM da SSP-SP**

Em [`scraper.py`](file:///e:/PROJETOS/dashboard-criminalidade/scraper.py), a URL (`https://www.ssp.sp.gov.br/estatistica/dados-mensais`), os seletores CSS (`select.form-select`), o formato de arquivo (`.xlsx`) e a estrutura de colunas do Excel são todos hardcoded. Não há interface abstrata. Adicionar a SSP-RJ ou SDS-MG exigiria duplicar todo o arquivo de scraping.

**[SCRAPER-02] Parse de datas frágil**

Em [`scraper.py`](file:///e:/PROJETOS/dashboard-criminalidade/scraper.py), linha 107: `ano_full = f"20{ano_suffix}"`. Isso interpreta `ano_suffix = "00"` como `2000`, mas provavelmente significa 2100. Embora não seja crítico hoje, é uma bomba-relógio para dados históricos e uma dívida técnica a eliminar.

**[API-01] Ausência de cache**

A rota `/api/ocorrencias` executa uma query SQL com múltiplos JOINs e `GROUP BY` a cada requisição. Não há mecanismo de cache (Redis, memcached, ou mesmo cache em memória local). No cenário multi-estado, múltiplos usuários consultando "todos os estados" simultaneamente podem travar o banco de dados.

**[API-02] CORS completamente aberto**

Em [`api/main.py`](file:///e:/PROJETOS/dashboard-criminalidade/api/main.py), linha 37: `allow_origins=["*"]`. Isso é aceitável em desenvolvimento, mas é uma vulnerabilidade em produção — qualquer site pode fazer requisições autenticadas à API.

#### 🟡 Importantes (degradam performance e DX)

**[ETL-01] `df.iterrows()` em loop para inserções**

Em [`etl_loader.py`](file:///e:/PROJETOS/dashboard-criminalidade/etl_loader.py), os loops `for _, row in df_munis.iterrows()` e `for _, row in df_crimes.iterrows()` iteram linha a linha em Python, o que é O(N) com alto overhead. Para volumes de dados de todo o Brasil, isso se torna um gargalo significativo.

**[ETL-02] DELETE + INSERT em vez de UPSERT**

O padrão atual de limpar ocorrências antes de reinserir (`DELETE FROM ocorrencias WHERE municipio_id = ... AND ano = ...` seguido de bulk INSERT) é correto, mas existe risco de janela de inconsistência se o processo morrer entre o DELETE e o INSERT.

**[FRONTEND-01] Lista de anos hardcoded**

Em [`src/App.tsx`](file:///e:/PROJETOS/dashboard-criminalidade/src/App.tsx), linha 111: `return ['2024', '2023', '2022', '2021']`. Isso não reflete os anos reais no banco e vai quebrar automaticamente em 2025.

**[FRONTEND-02] `tiposCrimeList` sempre vazio**

Em [`src/App.tsx`](file:///e:/PROJETOS/dashboard-criminalidade/src/App.tsx), linha 107: `return ['Todos']`. O filtro de "Tipo de Crime" nunca funciona — o backend não retorna `tipo_crime` na rota de ocorrências. A funcionalidade está presente na UI mas é completamente inoperante.

**[FRONTEND-03] Filtro de Município desabilitado quando "Todas" regiões**

Em [`src/components/FilterBar/FilterBar.tsx`](file:///e:/PROJETOS/dashboard-criminalidade/src/components/FilterBar/FilterBar.tsx), linha 77: `disabled={regiaoSelecionada === 'Todas'}`. O usuário não pode buscar um município sem antes selecionar a região. Com dados de todo o Brasil (5.570 municípios), um `<select>` nativo se torna inutilizável — é necessário um componente de busca (Combobox/Autocomplete).

**[FRONTEND-04] URL da API hardcoded**

Em [`src/App.tsx`](file:///e:/PROJETOS/dashboard-criminalidade/src/App.tsx), linha 37: `http://localhost:8000`. Inviabiliza deploy em qualquer ambiente que não seja a máquina local.

#### 🟢 Melhorias de Qualidade

**[UX-01] Skeleton Loader incompleto**

O `Skeleton.tsx` existe mas só é usado no `RegionTable`. Os `StatCards`, `TrendChart` e `CrimeDistributionChart` recebem `isLoading={true}` mas implementam seu próprio estado de loading internamente — isso gera inconsistência visual e código duplicado.

**[UX-02] Sem feedback de erro para o usuário**

Em [`src/App.tsx`](file:///e:/PROJETOS/dashboard-criminalidade/src/App.tsx), linha 79: `console.error(...)`. Falhas na API são silenciosas para o usuário. Não há estado de erro (`isError`), nenhuma mensagem ou possibilidade de retry.

---

## 3. Roadmap de Implementação

### Fase 1 — Fundação: Banco de Dados e API (Semanas 1–3)

> **Objetivo:** Tornar a infraestrutura de dados pronta para escala nacional, sem nenhuma mudança visível no frontend.

#### 1.1 Migração do Schema para Multi-Estado

Criar migration SQL para adicionar o conceito de `estado` como entidade de primeira classe:

```sql
-- [NOVO] Tabela de estados
CREATE TABLE estados (
    id         SERIAL PRIMARY KEY,
    sigla      CHAR(2) UNIQUE NOT NULL,     -- ex: 'SP', 'RJ', 'MG'
    nome       VARCHAR(100) NOT NULL,
    regiao_br  VARCHAR(20) NOT NULL         -- 'Sudeste', 'Nordeste', etc.
);

-- [ALTERADO] Regiões passam a pertencer a um estado
ALTER TABLE regioes
    ADD COLUMN estado_id INT NOT NULL REFERENCES estados(id);

-- [NOVO] Fontes de dados por estado (registro de scrapers)
CREATE TABLE fontes_dados (
    id           SERIAL PRIMARY KEY,
    estado_id    INT NOT NULL REFERENCES estados(id),
    nome         VARCHAR(150) NOT NULL,     -- 'SSP-SP', 'SDS-MG', 'ISP-RJ'
    url_base     VARCHAR(500),
    tipo_acesso  VARCHAR(50) NOT NULL,      -- 'playwright', 'rest_api', 'csv_download'
    ativo        BOOLEAN NOT NULL DEFAULT TRUE,
    ultima_carga TIMESTAMPTZ
);

-- [NOVO] Log de execuções do pipeline
CREATE TABLE pipeline_logs (
    id             SERIAL PRIMARY KEY,
    fonte_id       INT NOT NULL REFERENCES fontes_dados(id),
    iniciado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_em  TIMESTAMPTZ,
    status         VARCHAR(20) NOT NULL,   -- 'running', 'success', 'failed'
    registros_ok   INT DEFAULT 0,
    registros_erro INT DEFAULT 0,
    mensagem       TEXT
);
```

#### 1.2 Índices Compostos Críticos

```sql
-- Coração da query principal: filtro por ano + município
CREATE INDEX CONCURRENTLY idx_ocorrencias_municipio_ano
    ON ocorrencias (municipio_id, ano, mes);

-- Filtro por tipo de crime + ano (para análise de categorias)
CREATE INDEX CONCURRENTLY idx_ocorrencias_crime_ano
    ON ocorrencias (tipo_crime_id, ano);

-- Join mais frequente
CREATE INDEX CONCURRENTLY idx_municipios_regiao
    ON municipios (regiao_id);

-- Lookup de regiões por estado
CREATE INDEX CONCURRENTLY idx_regioes_estado
    ON regioes (estado_id);

-- Busca textual por nome de município (case-insensitive)
CREATE INDEX CONCURRENTLY idx_municipios_nome_trgm
    ON municipios USING gin (nome gin_trgm_ops);
```

> **Impacto esperado:** Redução de `SEQUENTIAL SCAN` em `ocorrencias` de O(N) para O(log N) via index scan, com speedup de 10x–50x em tabelas com milhões de linhas.

#### 1.3 Variáveis de Ambiente e Segurança

Criar `.env` e `.env.example`. Ler `DATABASE_URL` via `python-dotenv`. Configurar `CORS_ORIGINS` como lista de domínios explícita em produção.

#### 1.4 Cache de API com Redis

Adicionar camada de cache para rotas de leitura pesadas:

- `GET /api/ocorrencias?estado=SP&ano=2024` → TTL de 30 minutos
- `GET /api/municipios?estado=SP` → TTL de 24 horas (dado quase estático)
- **Invalidação:** Ao término de uma carga do pipeline, invalidar as chaves do estado correspondente via `REDIS_KEY_PREFIX = f"cache:estado:{uf}:*"`

#### 1.5 Novos Endpoints de API

```
GET /api/estados                          → lista todos os estados com dados
GET /api/regioes?estado={uf}             → regiões de um estado
GET /api/municipios?estado={uf}&regiao={r} → municípios com paginação
GET /api/ocorrencias?estado={uf}&...     → dados com filtro de estado
GET /api/anos-disponiveis?estado={uf}    → substitui a lista hardcoded no front
GET /api/tipos-crime?categoria={c}       → popula o filtro de tipo de crime
```

---

### Fase 2 — Pipeline: Scraper Multi-Estado (Semanas 4–6)

> **Objetivo:** Tornar o ETL agnóstico à fonte de dados, permitindo adicionar um novo estado com uma nova classe e sem alterar o núcleo.

#### 2.1 Arquitetura de Adaptadores (Strategy Pattern)

Reorganizar o código do pipeline na seguinte estrutura:

```
pipeline/
├── core/
│   ├── base_scraper.py       # Classe abstrata com interface comum
│   ├── base_transformer.py   # Normalização canônica de dados
│   └── etl_runner.py         # Orquestrador: carrega adaptador → transforma → carrega
├── adapters/
│   ├── ssp_sp/
│   │   ├── scraper.py        # Playwright específico da SSP-SP (código atual refatorado)
│   │   └── transformer.py    # Mapeamento de colunas SP → schema canônico
│   ├── sds_mg/               # Futuro: Minas Gerais
│   │   ├── scraper.py
│   │   └── transformer.py
│   └── isp_rj/               # Futuro: Rio de Janeiro (API REST)
│       ├── scraper.py
│       └── transformer.py
├── loaders/
│   └── postgres_loader.py    # etl_loader.py atual, com suporte a estado_id
└── config/
    └── sources.yaml          # Registro declarativo de fontes ativas
```

#### 2.2 Interface Abstrata do Scraper

```python
# pipeline/core/base_scraper.py
from abc import ABC, abstractmethod
from typing import Iterator
import pandas as pd

class BaseScraper(ABC):
    """
    Interface que todo scraper de estado deve implementar.
    Fornece um gerador de DataFrames no schema canônico.
    """
    estado_sigla: str       # ex: 'SP'
    fonte_nome: str         # ex: 'SSP-SP'

    @abstractmethod
    def run(self) -> Iterator[pd.DataFrame]:
        """
        Gera lotes de dados como DataFrames no schema canônico:
        Colunas: estado, regiao, municipio, categoria_crime,
                 tipo_crime, ano, mes, ocorrencias
        """
        ...
    
    @abstractmethod
    def get_available_years(self) -> list[int]:
        """Retorna a lista de anos disponíveis na fonte."""
        ...
```

#### 2.3 Schema Canônico de Dados (Contrato ETL)

Definir o DataFrame canônico que todos os transformadores devem produzir:

| Coluna | Tipo | Descrição |
|---|---|---|
| `estado` | `str` | Sigla UF (ex: "SP") |
| `regiao` | `str` | Nome da região administrativa |
| `municipio` | `str` | Nome do município (normalizado em Title Case) |
| `categoria_crime` | `str` | Macro-categoria (ex: "Roubo", "Homicídio Doloso") |
| `tipo_crime` | `str` | Crime específico (ex: "Roubo de Veículo") |
| `ano` | `int` | Ano com 4 dígitos |
| `mes` | `int` | Mês (1–12) |
| `ocorrencias` | `int` | Total de ocorrências |

#### 2.4 Registro Declarativo de Fontes (`sources.yaml`)

```yaml
# pipeline/config/sources.yaml
sources:
  - estado: SP
    nome: SSP-SP
    adaptador: adapters.ssp_sp.scraper.SSPSpScraper
    tipo: playwright
    url: https://www.ssp.sp.gov.br/estatistica/dados-mensais
    ativo: true

  - estado: RJ
    nome: ISP-RJ
    adaptador: adapters.isp_rj.scraper.ISPRJScraper
    tipo: rest_api
    url: https://www.ispdados.rj.gov.br/api
    ativo: false   # Aguardando implementação
```

#### 2.5 Correção de Bugs no Pipeline Atual

- **[SCRAPER-02]** Substituir `f"20{ano_suffix}"` por parse explícito com validação de range.
- **[ETL-01]** Substituir `df.iterrows()` em loops de lookup por `df.merge()` + dicionário de IDs, que é vetorizado e até 100x mais rápido.
- **[ETL-02]** Considerar `INSERT ... ON CONFLICT DO UPDATE` (UPSERT) em vez de DELETE+INSERT para eliminar a janela de inconsistência.

---

### Fase 3 — Frontend: UX e Performance Nacional (Semanas 7–9)

> **Objetivo:** Tornar a interface utilizável com dados de todo o Brasil, com excelente feedback visual e filtros que escalam para 5.570 municípios.

#### 3.1 Variável de Ambiente para URL da API

```typescript
// src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
```

Criar `.env.local` e `.env.production` com `VITE_API_URL`.

#### 3.2 Substituir `<select>` Nativo por Combobox com Busca

O `<select>` HTML é inviável com 5.570 municípios. A solução é um componente `<Combobox>` com:
- Campo de texto com busca (debounce de 200ms)
- Lista virtualizada (apenas os itens visíveis são renderizados no DOM)
- Busca fuzzy no lado cliente para municípios já carregados
- Agrupamento por estado/região no dropdown

**Biblioteca recomendada:** `@radix-ui/react-combobox` ou implementação própria com `react-window` para virtualização.

#### 3.3 Filtro Hierárquico Multi-Estado

Adicionar o nível "Estado" acima de "Região" e implementar carregamento cascateado:
1. Usuário seleciona **Estado** → API carrega regiões daquele estado
2. Usuário seleciona **Região** → API carrega municípios daquela região
3. Usuário seleciona **Município** → dados filtrados são carregados

```typescript
// Hierarquia de filtros proposta
interface FilterState {
  estado: string | null;         // NOVO: nível UF
  regiao: string | null;
  municipio: string | null;
  categoria: string | null;
  tipoCrime: string | null;
  ano: number | null;            // Tipado como number, não string
  mes: number | null;            // Tipado como number, não string
}
```

#### 3.4 Skeleton Loaders Consistentes em Toda a App

Expandir o uso do componente `Skeleton.tsx` existente para cobrir todos os estados de carregamento:

```typescript
// src/components/StatCards/StatCards.tsx — exemplo de uso consistente
if (isLoading) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.card}>
          <Skeleton height="16px" width="60%" />
          <Skeleton height="40px" width="80%" />
        </div>
      ))}
    </div>
  );
}
```

#### 3.5 Estado de Erro com Retry

```typescript
// src/hooks/useOcorrencias.ts — hook customizado proposto
interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
}
```

Exibir um componente de erro com botão "Tentar novamente" quando `isError === true`, em vez de apenas `console.error`.

#### 3.6 Otimização de Re-renders

Problemas identificados em [`src/App.tsx`](file:///e:/PROJETOS/dashboard-criminalidade/src/App.tsx):

- **`chartData`** (linha 166) não está envolto em `useMemo`, é recalculado a cada render.
- **`MES_MAP_REVERSE`** (linha 60) é recriado a cada `fetchData`, deve ser uma constante de módulo.
- O `useEffect` de fetch tem `municipiosData` como dependência, causando um fetch extra logo após a montagem. Usar um `useRef` de inicialização para separar o "dados carregados" do "filtros alterados".

#### 3.7 Lista de Anos Dinâmica

Substituir a lista hardcoded pela chamada ao endpoint `/api/anos-disponiveis?estado={uf}`, garantindo que o filtro sempre reflita os dados reais no banco.

#### 3.8 Ativar o Filtro de Tipo de Crime

Adicionar `tipo_crime` ao response da rota `/api/ocorrencias` no backend e popular corretamente o `tiposCrimeList` no frontend, tornando o filtro funcional.

---

## 4. Esboço do Novo Schema de Banco de Dados (Multi-Estado)

### Diagrama Entidade-Relacionamento

```
┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    estados      │       │     regioes      │       │    municipios    │
│─────────────────│       │──────────────────│       │──────────────────│
│ id     SERIAL PK│──1:N──│ id     SERIAL PK │──1:N──│ id     SERIAL PK │
│ sigla  CHAR(2)  │       │ estado_id FK     │       │ regiao_id FK     │
│ nome   VARCHAR  │       │ nome   VARCHAR   │       │ nome   VARCHAR   │
│ regiao_br VARCHAR│       └──────────────────┘       │ codigo_ibge INT  │
└─────────────────┘                                   └──────────────────┘
         │                                                     │
         │ 1:N                                                 │ 1:N
         ▼                                                     ▼
┌─────────────────┐                               ┌──────────────────────┐
│  fontes_dados   │                               │     ocorrencias      │
│─────────────────│                               │──────────────────────│
│ id     SERIAL PK│                               │ id       SERIAL PK   │
│ estado_id FK    │                               │ municipio_id FK      │
│ nome   VARCHAR  │                               │ tipo_crime_id FK     │
│ url_base VARCHAR│                               │ ano      INT         │
│ tipo_acesso VARCHAR│                            │ mes      INT         │
│ ativo  BOOLEAN  │                               │ total_ocorrencias INT│
│ ultima_carga TSTZ│                              │ variacao_mensal FLOAT│
└─────────────────┘                               └──────────────────────┘
         │ 1:N                                              │ N:1
         ▼                                                  ▼
┌─────────────────┐                               ┌──────────────────────┐
│ pipeline_logs   │                               │    tipos_crime       │
│─────────────────│                               │──────────────────────│
│ id     SERIAL PK│                               │ id       SERIAL PK   │
│ fonte_id FK     │                               │ categoria_macro VARCHAR│
│ iniciado_em TSTZ│                               │ nome_crime VARCHAR   │
│ finalizado_em   │                               └──────────────────────┘
│ status VARCHAR  │
│ registros_ok INT│
│ registros_erro  │
└─────────────────┘
```

### SQL Completo do Schema Proposto

```sql
-- ============================================================
-- SCHEMA PROPOSTO: Dashboard Criminalidade — Multi-Estado v2
-- ============================================================

-- Extensão para busca fuzzy em texto (requer superuser)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Estados (UFs do Brasil)
CREATE TABLE estados (
    id         SERIAL PRIMARY KEY,
    sigla      CHAR(2) UNIQUE NOT NULL,
    nome       VARCHAR(100) NOT NULL,
    regiao_br  VARCHAR(20) NOT NULL
    -- ex: 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'
);

-- 2. Regiões administrativas (agora vinculadas a um estado)
CREATE TABLE regioes (
    id         SERIAL PRIMARY KEY,
    estado_id  INT NOT NULL REFERENCES estados(id) ON DELETE CASCADE,
    nome       VARCHAR(100) NOT NULL,
    UNIQUE (estado_id, nome)  -- Duas regiões podem ter o mesmo nome em estados diferentes
);

-- 3. Municípios (com código IBGE para joins com dados externos)
CREATE TABLE municipios (
    id           SERIAL PRIMARY KEY,
    regiao_id    INT NOT NULL REFERENCES regioes(id) ON DELETE CASCADE,
    nome         VARCHAR(150) NOT NULL,
    codigo_ibge  INT UNIQUE     -- Opcional mas recomendado para integrações futuras
);

-- 4. Tipos de crime (tabela de dimensão — sem mudanças estruturais)
CREATE TABLE tipos_crime (
    id              SERIAL PRIMARY KEY,
    categoria_macro VARCHAR(100) NOT NULL,
    nome_crime      VARCHAR(150) UNIQUE NOT NULL
);

-- 5. Ocorrências (tabela de fatos — sem mudanças estruturais)
CREATE TABLE ocorrencias (
    id                 SERIAL PRIMARY KEY,
    municipio_id       INT NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
    tipo_crime_id      INT NOT NULL REFERENCES tipos_crime(id) ON DELETE CASCADE,
    ano                INT NOT NULL,
    mes                INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    total_ocorrencias  INT NOT NULL DEFAULT 0,
    variacao_mensal    FLOAT NOT NULL DEFAULT 0.0,
    UNIQUE (municipio_id, tipo_crime_id, ano, mes)  -- Evita duplicatas
);

-- 6. Registro de fontes de dados
CREATE TABLE fontes_dados (
    id           SERIAL PRIMARY KEY,
    estado_id    INT NOT NULL REFERENCES estados(id) ON DELETE CASCADE,
    nome         VARCHAR(150) NOT NULL,
    url_base     VARCHAR(500),
    tipo_acesso  VARCHAR(50) NOT NULL CHECK (tipo_acesso IN ('playwright', 'rest_api', 'csv_download', 'sftp')),
    ativo        BOOLEAN NOT NULL DEFAULT TRUE,
    ultima_carga TIMESTAMPTZ
);

-- 7. Log de execuções do pipeline
CREATE TABLE pipeline_logs (
    id             SERIAL PRIMARY KEY,
    fonte_id       INT NOT NULL REFERENCES fontes_dados(id) ON DELETE CASCADE,
    iniciado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_em  TIMESTAMPTZ,
    status         VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
    registros_ok   INT NOT NULL DEFAULT 0,
    registros_erro INT NOT NULL DEFAULT 0,
    mensagem       TEXT
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

-- Query principal: filtro por (municipio, ano, mes)
CREATE INDEX idx_ocorrencias_municipio_ano_mes
    ON ocorrencias (municipio_id, ano, mes);

-- Análise por categoria de crime e período
CREATE INDEX idx_ocorrencias_crime_ano
    ON ocorrencias (tipo_crime_id, ano);

-- Join municipios → regioes
CREATE INDEX idx_municipios_regiao_id
    ON municipios (regiao_id);

-- Join regioes → estados
CREATE INDEX idx_regioes_estado_id
    ON regioes (estado_id);

-- Busca textual por nome de município
CREATE INDEX idx_municipios_nome_trgm
    ON municipios USING gin (nome gin_trgm_ops);

-- Lookup de fontes ativas por estado
CREATE INDEX idx_fontes_estado_ativo
    ON fontes_dados (estado_id, ativo);

-- ============================================================
-- DADOS INICIAIS (seed)
-- ============================================================

INSERT INTO estados (sigla, nome, regiao_br) VALUES
    ('AC', 'Acre', 'Norte'),
    ('AL', 'Alagoas', 'Nordeste'),
    ('AP', 'Amapá', 'Norte'),
    ('AM', 'Amazonas', 'Norte'),
    ('BA', 'Bahia', 'Nordeste'),
    ('CE', 'Ceará', 'Nordeste'),
    ('DF', 'Distrito Federal', 'Centro-Oeste'),
    ('ES', 'Espírito Santo', 'Sudeste'),
    ('GO', 'Goiás', 'Centro-Oeste'),
    ('MA', 'Maranhão', 'Nordeste'),
    ('MT', 'Mato Grosso', 'Centro-Oeste'),
    ('MS', 'Mato Grosso do Sul', 'Centro-Oeste'),
    ('MG', 'Minas Gerais', 'Sudeste'),
    ('PA', 'Pará', 'Norte'),
    ('PB', 'Paraíba', 'Nordeste'),
    ('PR', 'Paraná', 'Sul'),
    ('PE', 'Pernambuco', 'Nordeste'),
    ('PI', 'Piauí', 'Nordeste'),
    ('RJ', 'Rio de Janeiro', 'Sudeste'),
    ('RN', 'Rio Grande do Norte', 'Nordeste'),
    ('RS', 'Rio Grande do Sul', 'Sul'),
    ('RO', 'Rondônia', 'Norte'),
    ('RR', 'Roraima', 'Norte'),
    ('SC', 'Santa Catarina', 'Sul'),
    ('SP', 'São Paulo', 'Sudeste'),
    ('SE', 'Sergipe', 'Nordeste'),
    ('TO', 'Tocantins', 'Norte');
```

---

## 5. Prioridades de Execução (Resumo)

| Prioridade | Item | Esforço | Impacto | Status |
|---|---|---|---|
| ~~🔴 P0~~ | ~~Índices compostos no banco~~ | ~~Baixo (1h)~~ | ~~Altíssimo~~ | ✅ **Concluído** *(perf/sec-p0-fundacao)* |
| ~~🔴 P0~~ | ~~Variáveis de ambiente (remover credentials hardcoded)~~ | ~~Baixo (2h)~~ | ~~Alto (segurança)~~ | ✅ **Concluído** *(perf/sec-p0-fundacao)* |
| ~~🔴 P0~~ | ~~Adicionar `estado_id` em `regioes` + migration~~ | ~~Médio (4h)~~ | ~~Bloqueador da expansão~~ | ✅ **Concluído** *(feat/schema-multi-estado)* |
| ~~🟡 P1~~ | ~~Cache Redis nas rotas da API~~ | ~~Médio (8h)~~ | ~~Alto~~ | ✅ **Concluído** *(feat/api-redis-cache)* |
| ~~🟡 P1~~ | ~~Refatoração do scraper para `BaseScraper`~~ | ~~Alto (2 dias)~~ | ~~Alto~~ | ✅ **Concluído** *(refactor/pipeline-strategy-pattern)* |
| ~~🟡 P1~~ | ~~Lista de anos dinâmica no frontend~~ | ~~Baixo (2h)~~ | ~~Médio~~ | ✅ **Concluído** *(feat/frontend-p1-anos-erros)* |
| ~~🟡 P1~~ | ~~Estado de erro + retry no frontend~~ | ~~Médio (4h)~~ | ~~Médio~~ | ✅ **Concluído** *(feat/frontend-p1-anos-erros)* |
| ~~🟢 P2~~ | ~~Combobox com busca para municípios~~ | ~~Médio (1 dia)~~ | ~~Alto (UX)~~ | ✅ **Concluído** *(feat/frontend-p2-combobox)* |
| ~~🟢 P2~~ | ~~**[UX-04]** Ocultar filtro "Tipo de Crime" inoperante~~ | ~~Baixo (30min)~~ | ~~Médio~~ | ✅ **Concluído** *(feat/ux-quick-wins-filterbar)* |
| ~~🟢 P2~~ | ~~**[UX-05]** Microcopy no campo Município desabilitado~~ | ~~Baixo (30min)~~ | ~~Médio~~ | ✅ **Concluído** *(feat/ux-quick-wins-filterbar)* |
| ~~🟢 P2~~ | ~~**[UX-03]** Remover botão + definir modelo eager (Eager Filtering)~~ | ~~Baixo (1h)~~ | ~~Alto~~ | ✅ **Concluído** *(feat/ux-auto-apply-filters)* |
| ~~🟢 P2~~ | ~~**[UX-02]** Botão "Limpar Filtros" com contagem~~ | ~~Baixo (1h)~~ | ~~Alto~~ | ✅ **Concluído** *(feat/ux-quick-wins-filterbar)* |
| ~~🟢 P2~~ | ~~Ativar filtro de Tipo de Crime (end-to-end)~~ | ~~Médio (6h)~~ | ~~Médio~~ | ✅ **Concluído** *(feat/fullstack-p2-tipo-crime)* |
| ~~🟢 P2~~ | ~~Skeleton loaders consistentes em todos os componentes~~ | ~~Baixo (3h)~~ | ~~Médio (UX)~~ | ✅ **Concluído** *(perf/frontend-p2-skeletons-usememo)* |
| ~~🟢 P2~~ | ~~`chartData` em `useMemo` + constantes de módulo~~ | ~~Baixo (1h)~~ | ~~Baixo~~ | ✅ **Concluído** *(perf/frontend-p2-skeletons-usememo)* |
| ~~🟢 P2~~ | ~~**[UX-01]** Chips de filtros ativos com remoção individual~~ | ~~Médio (4h)~~ | ~~Alto~~ | ✅ **Concluído** *(feat/ux-semantic-grouping-chips)* |
| ~~🟢 P2~~ | ~~**[UX-07]** Agrupamento semântico na FilterBar~~ | ~~Baixo (2h)~~ | ~~Médio~~ | ✅ **Concluído** *(feat/ux-semantic-grouping-chips)* |
| ~~🟢 P2~~ | ~~**[UX-08]** Skeleton no dropdown de Mês durante loading~~ | ~~Baixo (30min)~~ | ~~Baixo~~ | ✅ **Concluído** *(perf/frontend-p2-skeletons-usememo)* |
| 🟢 P3 | **[UX-06]** Deep linking — filtros na query string da URL | Médio (1 dia) | Alto | ⏳ Pendente |
| 🟢 P3 | `sources.yaml` + ETL runner genérico | Alto (3 dias) | Estratégico | ⏳ Pendente |
| 🟢 P3 | Adicionar primeiro estado novo (ex: MG ou RJ) | Alto (1 semana) | Estratégico | ⏳ Pendente |

> 📌 **Auditoria UX completa:** [`docs/specs/05-ux_heuristicas_filtros.md`](file:///e:/PROJETOS/dashboard-criminalidade/docs/specs/05-ux_heuristicas_filtros.md) — análise detalhada de cada item [UX-0N] contra as Heurísticas de Nielsen, com raciocínio, evidências e wireframes.

---

## 6. Referências Técnicas

- **PostgreSQL Index Types:** https://www.postgresql.org/docs/current/indexes-types.html
- **pg_trgm Extension:** https://www.postgresql.org/docs/current/pgtrgm.html
- **FastAPI Caching com aiocache/Redis:** https://fastapi.tiangolo.com/advanced/middleware/
- **React Window (virtualização):** https://react-window.vercel.app/
- **Radix UI Combobox:** https://www.radix-ui.com/primitives/docs/components/combobox
- **python-dotenv:** https://github.com/theskumar/python-dotenv
- **Playwright Python Docs:** https://playwright.dev/python/docs/intro
- **IBGE Malha de Municípios (API):** https://servicodados.ibge.gov.br/api/docs/malhas

---

*Documento gerado em 16/06/2026. Revisar e atualizar a cada sprint ou quando houver mudanças significativas na arquitetura.*
