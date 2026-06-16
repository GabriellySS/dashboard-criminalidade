import sys
import os
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
    title="SSP Dashboard API",
    description="API REST para consulta de dados de criminalidade do Estado de São Paulo",
    version="1.0.0"
)

# Configurando middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
async def get_status():
    """Rota de teste simples para verificar a integridade da API."""
    return {"status": "Servidor FastAPI rodando e conectado!"}

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
    Retorna a lista de ocorrências com filtros opcionais de município, região e ano,
    realizando JOIN com tipos_crime, municipios e regioes para permitir
    a agregação dinâmica.
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
