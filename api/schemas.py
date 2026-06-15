from pydantic import BaseModel

class MunicipioResponse(BaseModel):
    id: int
    regiao_id: int
    nome: str

    class Config:
        from_attributes = True

class OcorrenciaResponse(BaseModel):
    id: int
    municipio_id: int
    tipo_crime_id: int
    nome_crime: str
    categoria_macro: str
    ano: int
    mes: int
    total_ocorrencias: int
    variacao_mensal: float

    class Config:
        from_attributes = True
