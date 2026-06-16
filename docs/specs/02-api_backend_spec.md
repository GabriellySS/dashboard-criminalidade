# Especificação: API Backend e Banco de Dados (FastAPI + PostgreSQL)

## 1. Visão Geral e Arquitetura
A camada intermediária serve como ponte entre o banco de dados PostgreSQL e o frontend React.
* **Framework:** `FastAPI` (Python) com servidor ASGI `uvicorn`.
* **Segurança:** `CORSMiddleware` com política de origens explícita carregada do ambiente.
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
