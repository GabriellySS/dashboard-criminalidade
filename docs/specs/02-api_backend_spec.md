# Especificação: API Backend e Banco de Dados (FastAPI + PostgreSQL)

## 1. Visão Geral e Arquitetura
A camada intermediária serve como ponte entre o banco de dados PostgreSQL e o frontend React.
* **Framework:** `FastAPI` (Python) com servidor ASGI `uvicorn`.
* **Segurança:** `CORSMiddleware` para permitir requisições seguras da UI.
* **Localização:** Contida na pasta raiz `/api`.

## 2. Estrutura de Dados (PostgreSQL)
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

## 3. Server-Side Aggregation
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
