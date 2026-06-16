# Especificação: API Backend e Banco de Dados (FastAPI + PostgreSQL)

## 1. Visão Geral e Arquitetura
A camada intermediária serve como ponte entre o banco de dados PostgreSQL e o frontend React.
* **Framework:** `FastAPI` (Python) com servidor ASGI `uvicorn`.
* **Segurança:** `CORSMiddleware` com política de origens explícita carregada do ambiente.
* **Cache:** `fastapi-cache2[redis]` com backend Redis para TTL configurável por rota.
* **Localização:** Contida na pasta raiz `/api`.

---

## 2. Variáveis de Ambiente e Segurança (atualizado em perf/sec-p0-fundacao)

A API não utiliza mais nenhuma credencial ou configuração de segurança hardcoded no código-fonte.
Toda a configuração sensível é lida via `python-dotenv` / `os.getenv()`.

### Variáveis Requeridas

| Variável | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `DATABASE_URL` | `string` | String de conexão completa do PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `CORS_ORIGINS` | `string` | Lista de origens permitidas, separadas por vírgula | `https://dashboard.dominio.com.br` |
| `REDIS_URL` | `string` | URL de conexão com o Redis | `redis://localhost:6379/0` |
| `CACHE_TTL_OCORRENCIAS` | `int` | TTL em segundos para `/api/ocorrencias` | `1800` (default: 30min) |
| `CACHE_TTL_MUNICIPIOS` | `int` | TTL em segundos para `/api/municipios` | `86400` (default: 24h) |
| `CACHE_TTL_ESTADOS` | `int` | TTL em segundos para `/api/estados` | `86400` (default: 24h) |

### Comportamento em Ausência de Variável

- **`DATABASE_URL` ausente:** A aplicação levanta `EnvironmentError` na inicialização e recusa-se a subir. Isso evita conexões silenciosas com configurações erradas.
- **`CORS_ORIGINS` ausente:** Faz fallback seguro para `http://localhost:5173,http://localhost:3000` (ambiente de desenvolvimento local apenas).

### Configuração Local

1. Copie `.env.example` para `.env` na raiz do projeto.
2. Preencha `DATABASE_URL` com suas credenciais locais.
3. O arquivo `.env` está listado no `.gitignore` e **nunca deve ser commitado**.

### Política de CORS

Em **desenvolvimento:** As origens padrão `http://localhost:5173` e `http://localhost:3000` são permitidas automaticamente.

Em **produção:** A variável `CORS_ORIGINS` **deve** ser definida explicitamente no ambiente do servidor com os domínios confiáveis da aplicação. O wildcard `*` não é mais aceito.

```python
# api/main.py — implementação atual
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
CORS_ORIGINS: list[str] = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,   # Lista explícita — nunca ["*"] em produção
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
```

---

## 3. Topologia do Banco de Dados — Schema v2 (Multi-Estado)

*Atualizado em `feat/schema-multi-estado`. Versão anterior tinha 4 tabelas; v2 adiciona `estados` como entidade de primeira classe.*

### Diagrama de Tabelas

```
estados (NOVO)
  id       SERIAL PK
  sigla    CHAR(2) UNIQUE   ← 'SP', 'RJ', 'MG', ...
  nome     VARCHAR(100)
  regiao_br VARCHAR(20)     ← 'Sudeste', 'Nordeste', ...
       │
       │ 1:N
       ▼
regioes (ALTERADO)
  id        SERIAL PK
  estado_id INT FK → estados.id   ← NOVO
  nome      VARCHAR(100)
  UNIQUE (estado_id, nome)         ← substituiu UNIQUE(nome)
       │
       │ 1:N
       ▼
municipios
  id        SERIAL PK
  regiao_id INT FK → regioes.id
  nome      VARCHAR(150)
       │
       │ 1:N
       ▼
ocorrencias (tabela de fatos — sem alterações)
  id                SERIAL PK
  municipio_id      INT FK → municipios.id
  tipo_crime_id     INT FK → tipos_crime.id
  ano, mes          INT
  total_ocorrencias INT
  variacao_mensal   FLOAT
```

### Regras de Negócio da Migração

- A constraint `UNIQUE(nome)` em `regioes` foi removida e substituída por `UNIQUE(estado_id, nome)`. Isso permite que dois estados tenham regiões de mesmo nome (ex: "Capital" em SP e RJ) sem conflito.
- Dados legados (regiões já inseridas sem `estado_id`) são vinculados automaticamente ao estado `SP` via script de migração (`database/migration_v1_to_v2.sql`).
- O pipeline ETL (`etl_loader.py`) agora resolve o `estado_id` de `SP` uma vez por transação via `_get_estado_id()` e o injeta no `INSERT INTO regioes`.

### Índices de Performance (6 índices — v2)

| Índice | Tabela | Colunas | Query coberta |
|---|---|---|---|
| `idx_ocorrencias_municipio_ano_mes` | `ocorrencias` | `(municipio_id, ano, mes)` | `WHERE municipio_id = ? AND ano = ?` |
| `idx_ocorrencias_crime_ano` | `ocorrencias` | `(tipo_crime_id, ano)` | `WHERE tipo_crime_id = ? AND ano = ?` |
| `idx_municipios_regiao_id` | `municipios` | `(regiao_id)` | `JOIN regioes r ON m.regiao_id = r.id` |
| `idx_municipios_nome` | `municipios` | `(nome)` | `WHERE m.nome = :municipio` |
| `idx_regioes_nome` | `regioes` | `(nome)` | `WHERE r.nome = :regiao` |
| `idx_regioes_estado_id` *(NOVO)* | `regioes` | `(estado_id)` | `JOIN estados e ON r.estado_id = e.id` |

> **Nota:** Em bancos em produção com dados ao vivo, execute os índices com `CREATE INDEX CONCURRENTLY` para não bloquear leituras durante a criação.

---

## 4. Endpoints Disponíveis

| Método | Rota | Descrição | Status |
|---|---|---|---|
| `GET` | `/api/status` | Health check da API | Ativo |
| `GET` | `/api/estados` | Lista todos os 27 estados (com contagem de regiões) | **NOVO** |
| `GET` | `/api/municipios` | Lista todos os municípios com nome da região | Ativo |
| `GET` | `/api/ocorrencias` | Ocorrências com filtros: `municipio`, `regiao`, `ano` | Ativo |

### Filtros Planejados (P1 — próxima fase)

```
GET /api/ocorrencias?estado={uf}&municipio={m}&regiao={r}&ano={a}
GET /api/municipios?estado={uf}&regiao={r}
GET /api/anos-disponiveis?estado={uf}
GET /api/tipos-crime?categoria={c}
```

## 5. Server-Side Aggregation

A API não retorna mais dados brutos (`SELECT *`).
A rota principal `/api/ocorrencias` aceita parâmetros de query opcionais para filtragem:
- `municipio` (str, opcional)
- `regiao` (str, opcional)
- `ano` (int, opcional)

A agregação (GROUP BY) é feita no próprio PostgreSQL (via SQLAlchemy), retornando as propriedades:
- `categoria_crime`
- `mes`
- `ano`
- `total_ocorrencias`
- `municipio`

> **Retrocompatibilidade v2:** As queries existentes nas rotas `/api/municipios` e `/api/ocorrencias`
> não foram alteradas. O JOIN `municipios → regioes` não depende de `estado_id` — apenas da FK
> `regiao_id` que já existia. O filtro por estado será adicionado nas rotas P1 sem breaking change.

---

## 6. Cache Layer — Redis (adicionado em feat/api-redis-cache)

### Visão Geral

A camada de cache Redis foi implementada usando `fastapi-cache2[redis]` com o padrão de decorator
`@cache(expire=TTL)` diretamente nas funções de rota. A inicialização é gerenciada pelo
**lifespan** do FastAPI (padrão moderno substituto de `@app.on_event`).

```
Request → FastAPI → [Cache HIT?] ──YES──→ Redis → Response (sub-ms)
                          │
                         NO
                          │
                          ▼
                     PostgreSQL → [Calcula resultado] → Redis (SET) → Response
                                                             ↑
                                              TTL expira aqui (automático)
```

### Biblioteca e Dependência

```
fastapi-cache2[redis]>=0.2.1   # extra [redis] instala aioredis automaticamente
```

### Inicialização (Lifespan)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_client = aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis_client), prefix="ssp_dashboard")
    yield
    await redis_client.aclose()  # Graceful shutdown

app = FastAPI(lifespan=lifespan)
```

### TTLs Configurados por Rota

| Rota | TTL | Variável de Controle | Justificativa |
|---|---|---|---|
| `GET /api/ocorrencias` | **30 min** (1800s) | `CACHE_TTL_OCORRENCIAS` | Dado muda apenas após ingestão do ETL |
| `GET /api/municipios` | **24 h** (86400s) | `CACHE_TTL_MUNICIPIOS` | Dado quase estático |
| `GET /api/estados` | **24 h** (86400s) | `CACHE_TTL_ESTADOS` | Dado quase estático |

Os TTLs podem ser sobrescritos via variáveis de ambiente (ver §2) sem alterar o código.

### Estratégia de Chaves de Cache (Cache Key)

O `fastapi-cache2` gera automaticamente a chave de cache a partir da **URL completa da requisição,
incluindo todos os query parameters**, garantindo isolamento total entre combinações de filtros.

**Formato:** `{CACHE_KEY_PREFIX}:{path}:{query_string_sorted}`

**Exemplos práticos:**

```
ssp_dashboard:/api/estados
→ Lista de todos os estados (sem parâmetros)

ssp_dashboard:/api/municipios
→ Lista completa de municípios

ssp_dashboard:/api/ocorrencias
→ Estado inteiro (sem filtros)

ssp_dashboard:/api/ocorrencias?ano=2024
→ Estado inteiro, ano 2024

ssp_dashboard:/api/ocorrencias?municipio=S%C3%A3o+Paulo+%28Capital%29&ano=2024
→ Capital, ano 2024

ssp_dashboard:/api/ocorrencias?regiao=Capital&ano=2023
→ Região Capital, ano 2023
```

> **Garantia crítica:** Requisições com parâmetros diferentes **nunca compartilham** a mesma
> entrada de cache — cada combinação de `municipio`, `regiao` e `ano` gera uma chave única.

### Comportamento em Falha do Redis

Se o Redis estiver indisponível:
- A rota **degrada graciosamente**: a requisição é servida diretamente pelo PostgreSQL.
- Nenhum erro 500 é retornado ao cliente.
- O `GET /api/status` reporta `"cache": "unavailable (motivo)"` para monitoramento.

### Invalidação Manual de Cache

Quando necessário (ex: após ingestão de novos dados), as entradas podem ser invalidadas via CLI:

```bash
# Invalida todas as chaves da aplicação
docker exec ssp_dashboard_redis redis-cli KEYS "ssp_dashboard:*" | xargs redis-cli DEL

# Invalida apenas ocorrências
docker exec ssp_dashboard_redis redis-cli KEYS "ssp_dashboard:/api/ocorrencias*" | xargs redis-cli DEL
```

> **Roadmap (futuro):** O ETL loader (`etl_loader.py`) deve chamar a invalidação automaticamente
> ao término de uma carga bem-sucedida, usando `aioredis` para apagar as chaves `ssp_dashboard:/api/ocorrencias*`.
