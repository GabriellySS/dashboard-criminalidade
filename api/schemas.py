from pydantic import BaseModel

class MunicipioResponse(BaseModel):
    id: int
    regiao_id: int
    nome: str
    regiao_nome: str

    class Config:
        from_attributes = True

class OcorrenciaResponse(BaseModel):
    categoria_crime: str
    mes: int
    total_ocorrencias: int

    class Config:
        from_attributes = True
