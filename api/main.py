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
    municipio_id: Optional[int] = None,
    ano: Optional[int] = None,
    mes: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna a lista de ocorrências com filtros opcionais de município_id, ano e mes,
    realizando JOIN com tipos_crime para incluir os nomes reais do crime.
    """
    query = """
        SELECT 
            o.id, 
            o.municipio_id, 
            o.tipo_crime_id, 
            tc.nome_crime, 
            tc.categoria_macro, 
            o.ano, 
            o.mes, 
            o.total_ocorrencias, 
            o.variacao_mensal
        FROM ocorrencias o
        JOIN tipos_crime tc ON o.tipo_crime_id = tc.id
        WHERE 1=1
    """
    params = {}
    
    if municipio_id is not None:
        query += " AND o.municipio_id = :municipio_id"
        params["municipio_id"] = municipio_id
        
    if ano is not None:
        query += " AND o.ano = :ano"
        params["ano"] = ano
        
    if mes is not None:
        query += " AND o.mes = :mes"
        params["mes"] = mes
        
    query += " ORDER BY o.ano DESC, o.mes DESC, tc.nome_crime ASC"
    
    result = db.execute(text(query), params)
    
    return [
        {
            "id": r[0],
            "municipio_id": r[1],
            "tipo_crime_id": r[2],
            "nome_crime": r[3],
            "categoria_macro": r[4],
            "ano": r[5],
            "mes": r[6],
            "total_ocorrencias": r[7],
            "variacao_mensal": r[8]
        }
        for r in result
    ]
