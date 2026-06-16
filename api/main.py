import sys
import os
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

# Adiciona o diretório pai no PATH para conseguir importar db_connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db_connection import engine
from api.schemas import MunicipioResponse, OcorrenciaResponse

# Configuração da Sessão do SQLAlchemy
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(
    title="Dashboard Criminalidade API",
    description=(
        "API REST para consulta de dados de criminalidade. "
        "Atualmente serve dados do Estado de São Paulo (SSP-SP). "
        "Schema v2: suporte multi-estado ativo — endpoint /api/estados disponível."
    ),
    version="2.0.0"
)

# Origens permitidas: lidas da variável CORS_ORIGINS (lista separada por vírgula).
# Em desenvolvimento, o padrão é o servidor Vite local.
# Em produção, defina CORS_ORIGINS com os domínios confiáveis da aplicação.
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
CORS_ORIGINS: list[str] = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/api/status")
async def get_status():
    """Rota de teste simples para verificar a integridade da API."""
    return {"status": "Servidor FastAPI rodando e conectado!"}

@app.get("/api/estados")
def list_estados(db: Session = Depends(get_db)):
    """
    Retorna todos os estados cadastrados no banco de dados.
    Atualmente apenas 'SP' possui dados ingeridos; os demais estados
    estão registrados no seed e prontos para receber dados futuros.
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
def list_municipios(db: Session = Depends(get_db)):
    """Retorna todos os municípios cadastrados no banco de dados, incluindo o nome da região."""
    result = db.execute(text("""
        SELECT m.id, m.regiao_id, m.nome, r.nome AS regiao_nome 
        FROM municipios m 
        JOIN regioes r ON m.regiao_id = r.id 
        ORDER BY m.nome
    """))
    return [{"id": r[0], "regiao_id": r[1], "nome": r[2], "regiao_nome": r[3]} for r in result]

@app.get("/api/ocorrencias", response_model=List[OcorrenciaResponse])
def list_ocorrencias(
    municipio: Optional[str] = None,
    regiao: Optional[str] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna a lista de ocorrências com filtros opcionais de município, região e ano.

    Retrocompatibilidade v2: as queries não foram alteradas pois o JOIN
    municipios → regioes não depende da coluna estado_id. Quando o filtro
    por estado for implementado (P1), adicionar AND r.estado_id = :estado_id.
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
