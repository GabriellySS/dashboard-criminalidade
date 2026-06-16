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

## 3. Estrutura de Dados (PostgreSQL)

Os dados consolidados no banco relacional contêm:
- `id` (UUID ou Serial, Chave Primária)
- `regiao` (VARCHAR)
- `municipio` (VARCHAR)
- `categoria_crime` (VARCHAR)
- `tipo_crime` (VARCHAR)
- `ano` (INTEGER)
- `mes` (VARCHAR)
- `ocorrencias` (INTEGER)
- `variacao_mensal` (NUMERIC)

### Índices de Performance (adicionados em perf/sec-p0-fundacao)

O schema em `database/schema.sql` agora inclui 5 índices compostos críticos que eliminam `SEQUENTIAL SCAN` nas queries de filtragem e JOIN:

| Índice | Tabela | Colunas | Query coberta |
|---|---|---|---|
| `idx_ocorrencias_municipio_ano_mes` | `ocorrencias` | `(municipio_id, ano, mes)` | `WHERE municipio_id = ? AND ano = ?` |
| `idx_ocorrencias_crime_ano` | `ocorrencias` | `(tipo_crime_id, ano)` | `WHERE tipo_crime_id = ? AND ano = ?` |
| `idx_municipios_regiao_id` | `municipios` | `(regiao_id)` | `JOIN regioes r ON m.regiao_id = r.id` |
| `idx_municipios_nome` | `municipios` | `(nome)` | `WHERE m.nome = :municipio` |
| `idx_regioes_nome` | `regioes` | `(nome)` | `WHERE r.nome = :regiao` |

**Impacto esperado:** Redução de latência de O(N) para O(log N) na query principal de `/api/ocorrencias`.

> **Nota:** Em bancos em produção com dados ao vivo, execute os índices com `CREATE INDEX CONCURRENTLY` para não bloquear leituras durante a criação.

---

## 4. Server-Side Aggregation

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
