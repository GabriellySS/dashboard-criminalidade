from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
