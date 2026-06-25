import sys
import os
# pyrefly: ignore [missing-import]
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Carrega variáveis do .env antes de qualquer outra importação que as utilize
load_dotenv()

from typing import Optional, List
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy import text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker, Session

# Cache Layer — fastapi-cache2 com backend Redis
# pyrefly: ignore [missing-import]
from fastapi_cache import FastAPICache
# pyrefly: ignore [missing-import]
from fastapi_cache.backends.redis import RedisBackend
# pyrefly: ignore [missing-import]
from fastapi_cache.decorator import cache
# pyrefly: ignore [missing-import]
from redis import asyncio as aioredis

# Adiciona o diretório pai no PATH para conseguir importar db_connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db_connection import engine
from api.schemas import MunicipioResponse, OcorrenciaResponse

# =============================================================================
# CONFIGURAÇÃO DE TTLs (legível de variáveis de ambiente com defaults seguros)
# =============================================================================
# TTL para dados de ocorrências: 30 minutos (dado muda somente após ingestão do ETL)
CACHE_TTL_OCORRENCIAS: int = int(os.getenv("CACHE_TTL_OCORRENCIAS", 1800))
# TTL para listas de municípios e estados: 24 horas (dado quase estático)
CACHE_TTL_MUNICIPIOS: int = int(os.getenv("CACHE_TTL_MUNICIPIOS", 86400))
CACHE_TTL_ESTADOS: int = int(os.getenv("CACHE_TTL_ESTADOS", 86400))

# URL do Redis lida do ambiente. Fallback para localhost em desenvolvimento.
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Prefixo global para todas as chaves de cache desta aplicação.
# Útil para invalidação seletiva e para namespacing em instâncias Redis compartilhadas.
CACHE_KEY_PREFIX = "ssp_dashboard"

# =============================================================================
# CICLO DE VIDA DA APLICAÇÃO (Lifespan)
# =============================================================================
# A inicialização do cache Redis é feita no lifespan para garantir que a conexão
# seja aberta antes do primeiro request e fechada graciosamente ao desligar.
# Isso substitui o padrão legado @app.on_event("startup").
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação: inicializa e fecha o pool Redis."""
    redis_client = aioredis.from_url(
        REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )
    FastAPICache.init(
        RedisBackend(redis_client),
        prefix=CACHE_KEY_PREFIX,
        expire=CACHE_TTL_OCORRENCIAS  # TTL padrão global (overrideável por rota)
    )
    print(f"✅ [Cache] Redis inicializado em '{REDIS_URL}' com prefixo '{CACHE_KEY_PREFIX}'")
    yield
    # Cleanup: fecha a conexão Redis ao encerrar
    await redis_client.aclose()
    print("🔴 [Cache] Conexão Redis encerrada.")


# =============================================================================
# CONFIGURAÇÃO DA SESSÃO DO SQLAlchemy
# =============================================================================

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# INSTÂNCIA DA APLICAÇÃO
# =============================================================================

app = FastAPI(
    title="Dashboard Criminalidade API",
    description=(
        "API REST para consulta de dados de criminalidade. "
        "Atualmente serve dados do Estado de São Paulo (SSP-SP). "
        "Schema v2: suporte multi-estado ativo — endpoint /api/estados disponível. "
        "Cache Layer: Redis ativo com TTL configurável por rota."
    ),
    version="3.0.0",
    lifespan=lifespan
)

# =============================================================================
# CORS
# =============================================================================

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
CORS_ORIGINS: list[str] = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# =============================================================================
# ROTAS
# =============================================================================

@app.get("/api/status")
async def get_status():
    """Health check: verifica se a API e o cache estão operacionais."""
    try:
        # Testa conectividade com o Redis
        backend = FastAPICache.get_backend()
        await backend.get("__health_check__")
        redis_status = "connected"
    except Exception as e:
        redis_status = f"unavailable ({e})"

    return {
        "status": "ok",
        "api": "Servidor FastAPI rodando e conectado!",
        "cache": redis_status,
        "cache_prefix": CACHE_KEY_PREFIX,
        "ttl_ocorrencias_s": CACHE_TTL_OCORRENCIAS,
        "ttl_municipios_s": CACHE_TTL_MUNICIPIOS,
        "ttl_estados_s": CACHE_TTL_ESTADOS,
    }


@app.get("/api/estados")
@cache(expire=CACHE_TTL_ESTADOS)
async def list_estados(db: Session = Depends(get_db)):
    """
    Retorna todos os estados cadastrados no banco de dados.
    Cache: TTL de 24 horas (dado quase estático — muda somente quando novos
    estados são ingeridos pelo pipeline ETL).
    Chave de cache: determinística (sem parâmetros) → 'ssp_dashboard:/api/estados'.
    """
    result = db.execute(text("""
        SELECT e.id, e.sigla, e.nome, e.regiao_br,
               COUNT(DISTINCT r.id) AS num_regioes
        FROM estados e
        LEFT JOIN regioes r ON r.estado_id = e.id
        GROUP BY e.id, e.sigla, e.nome, e.regiao_br
        ORDER BY e.sigla
    """))
    return [
        {
            "id": row[0],
            "sigla": row[1],
            "nome": row[2],
            "regiao_br": row[3],
            "num_regioes": row[4]
        }
        for row in result
    ]


@app.get("/api/municipios", response_model=List[MunicipioResponse])
@cache(expire=CACHE_TTL_MUNICIPIOS)
async def list_municipios(db: Session = Depends(get_db)):
    """
    Retorna todos os municípios cadastrados no banco de dados, incluindo o nome da região.
    Cache: TTL de 24 horas.
    Chave de cache: determinística → 'ssp_dashboard:/api/municipios'.
    """
    result = db.execute(text("""
        SELECT m.id, m.regiao_id, m.nome, r.nome AS regiao_nome
        FROM municipios m
        JOIN regioes r ON m.regiao_id = r.id
        ORDER BY m.nome
    """))
    return [{"id": r[0], "regiao_id": r[1], "nome": r[2], "regiao_nome": r[3]} for r in result]


@app.get("/api/ocorrencias", response_model=List[OcorrenciaResponse])
@cache(expire=CACHE_TTL_OCORRENCIAS)
async def list_ocorrencias(
    municipio: Optional[str] = None,
    regiao: Optional[str] = None,
    ano: Optional[int] = None,
    tipo_crime: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna a lista de ocorrências com filtros opcionais de município, região e ano.

    Cache: TTL de 30 minutos. A chave de cache é gerada automaticamente pelo
    fastapi-cache2 a partir da URL completa incluindo a query string, garantindo
    que cada combinação de filtros (municipio, regiao, ano) possua sua própria
    entrada de cache. Exemplos de chaves geradas:
      - ssp_dashboard:/api/ocorrencias                         → estado inteiro
      - ssp_dashboard:/api/ocorrencias?ano=2024               → estado + ano
      - ssp_dashboard:/api/ocorrencias?municipio=São+Paulo&ano=2024
      - ssp_dashboard:/api/ocorrencias?regiao=Capital&ano=2023

    Retrocompatibilidade v2: as queries não foram alteradas pois o JOIN
    municipios → regioes não depende da coluna estado_id. Quando o filtro
    por estado for implementado (P1+), adicionar AND r.estado_id = :estado_id.
    """
    is_municipio = municipio and municipio != "Todos" and municipio != "Todas as cidades"
    is_regiao = regiao and regiao != "Todas"

    if is_municipio:
        geo_select = "m.nome as municipio"
        geo_group = "m.nome"
    elif is_regiao:
        geo_select = "r.nome || ' (Região)' as municipio"
        geo_group = "r.nome"
    else:
        geo_select = "'Estado de São Paulo' as municipio"
        geo_group = "'Estado de São Paulo'"

    query = f"""
        SELECT
            tc.categoria_macro as categoria_crime,
            o.mes,
            o.ano,
            SUM(o.total_ocorrencias) as total_ocorrencias,
            {geo_select}
        FROM ocorrencias o
        JOIN tipos_crime tc ON o.tipo_crime_id = tc.id
        JOIN municipios m ON o.municipio_id = m.id
        JOIN regioes r ON m.regiao_id = r.id
        WHERE 1=1
    """
    params = {}

    if ano is not None:
        query += " AND o.ano = :ano"
        params["ano"] = ano

    if is_municipio:
        query += " AND m.nome = :municipio"
        params["municipio"] = municipio
    elif is_regiao:
        query += " AND r.nome = :regiao"
        params["regiao"] = regiao

    if tipo_crime and tipo_crime != "Todos":
        query += " AND tc.nome_crime = :tipo_crime"
        params["tipo_crime"] = tipo_crime

    query += f"""
        GROUP BY tc.categoria_macro, o.mes, o.ano, {geo_group}
        ORDER BY o.mes DESC, tc.categoria_macro ASC
    """

    result = db.execute(text(query), params)

    return [
        {
            "categoria_crime": r[0],
            "mes": r[1],
            "ano": r[2],
            "total_ocorrencias": r[3] or 0,
            "municipio": r[4]
        }
        for r in result
    ]


@app.get("/api/anos-disponiveis")
@cache(expire=CACHE_TTL_MUNICIPIOS)
async def list_anos_disponiveis(db: Session = Depends(get_db)):
    """
    Retorna a lista de anos únicos com dados de ocorrências no banco,
    ordenados em ordem decrescente (mais recente primeiro).

    Substitui a lista hardcoded no frontend (FRONTEND-01), garantindo que
    o filtro de ano sempre reflita os dados reais no banco de dados.

    Cache: TTL de 24 horas (dado muda somente após ingestão do ETL).
    Chave de cache determinística: 'ssp_dashboard:/api/anos-disponiveis'.

    Response: lista de inteiros — ex: [2024, 2023, 2022, 2021]
    """
    result = db.execute(text("""
        SELECT DISTINCT o.ano
        FROM ocorrencias o
        ORDER BY o.ano DESC
    """))
    return [row[0] for row in result]


@app.get("/api/tipos-crime")
@cache(expire=CACHE_TTL_ESTADOS)
async def list_tipos_crime(categoria: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Retorna a lista de tipos de crime únicos cadastrados no banco.
    Se 'categoria' for providenciado, filtra os tipos de crime pela categoria macro.
    
    Cache: TTL de 24 horas (dado quase estático).
    """
    query = "SELECT DISTINCT nome_crime FROM tipos_crime"
    params = {}
    
    if categoria and categoria != "Todas":
        query += " WHERE categoria_macro = :categoria"
        params["categoria"] = categoria
        
    query += " ORDER BY nome_crime"
    
    result = db.execute(text(query), params)
    return [row[0] for row in result]
