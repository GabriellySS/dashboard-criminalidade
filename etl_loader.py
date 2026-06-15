import logging
import pandas as pd
from sqlalchemy import text
from db_connection import engine

# Configuração de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Mapeamento de meses (String -> Integer)
MES_MAP = {
    "Janeiro": 1,
    "Fevereiro": 2,
    "Março": 3,
    "Abril": 4,
    "Maio": 5,
    "Junho": 6,
    "Julho": 7,
    "Agosto": 8,
    "Setembro": 9,
    "Outubro": 10,
    "Novembro": 11,
    "Dezembro": 12
}

def carregar_dados_para_banco(df: pd.DataFrame):
    """
    Realiza o pipeline ETL inserindo os dados tratados do Pandas nas tabelas relacionais do PostgreSQL.
    """
    logger.info("Iniciando o carregamento dos dados no banco relacional PostgreSQL...")
    
    # Valida se o DataFrame está vazio
    if df.empty:
        logger.warning("O DataFrame está vazio. Nenhuma ação será realizada.")
        return

    # Inicia a transação
    with engine.begin() as conn:
        # 1. Regiões
        logger.info("Processando regiões...")
        existing_regioes = conn.execute(text("SELECT id, nome FROM regioes")).fetchall()
        regioes_map = {r[1].upper(): r[0] for r in existing_regioes}
        
        novas_regioes = df['regiao'].unique()
        for reg in novas_regioes:
            reg_upper = reg.upper()
            if reg_upper not in regioes_map:
                res = conn.execute(
                    text("INSERT INTO regioes (nome) VALUES (:nome) RETURNING id"),
                    {"nome": reg}
                )
                regioes_map[reg_upper] = res.scalar()
                
        # 2. Municípios
        logger.info("Processando municípios...")
        existing_munis = conn.execute(text("SELECT id, regiao_id, nome FROM municipios")).fetchall()
        munis_map = {(m[1], m[2].upper()): m[0] for m in existing_munis}
        
        # Agrupar por regiao e municipio para relacionar corretamente
        df_munis = df[['regiao', 'municipio']].drop_duplicates()
        for _, row in df_munis.iterrows():
            r_id = regioes_map[row['regiao'].upper()]
            m_nome = row['municipio']
            m_nome_upper = m_nome.upper()
            
            if (r_id, m_nome_upper) not in munis_map:
                res = conn.execute(
                    text("INSERT INTO municipios (regiao_id, nome) VALUES (:regiao_id, :nome) RETURNING id"),
                    {"regiao_id": r_id, "nome": m_nome}
                )
                munis_map[(r_id, m_nome_upper)] = res.scalar()
                
        # 3. Tipos de Crime
        logger.info("Processando tipos de crime...")
        existing_crimes = conn.execute(text("SELECT id, nome_crime FROM tipos_crime")).fetchall()
        crimes_map = {c[1].upper(): c[0] for c in existing_crimes}
        
        df_crimes = df[['categoria_crime', 'tipo_crime']].drop_duplicates()
        for _, row in df_crimes.iterrows():
            c_nome = row['tipo_crime']
            c_nome_upper = c_nome.upper()
            c_macro = row['categoria_crime']
            
            if c_nome_upper not in crimes_map:
                res = conn.execute(
                    text("INSERT INTO tipos_crime (categoria_macro, nome_crime) VALUES (:categoria_macro, :nome_crime) RETURNING id"),
                    {"categoria_macro": c_macro, "nome_crime": c_nome}
                )
                crimes_map[c_nome_upper] = res.scalar()

        # 4. Limpar Ocorrências Existentes antes da carga para evitar duplicação
        logger.info("Limpando dados de ocorrências anteriores...")
        conn.execute(text("TRUNCATE TABLE ocorrencias RESTART IDENTITY CASCADE"))

        # 5. Ocorrências
        logger.info("Preparando e inserindo ocorrências...")
        
        # Mapeando os IDs do DataFrame usando as estruturas auxiliares construídas acima
        df_ocorrencias = df.copy()
        
        # Obter regiao_id para cada linha
        df_ocorrencias['regiao_id'] = df_ocorrencias['regiao'].apply(lambda x: regioes_map[x.upper()])
        
        # Obter municipio_id correspondente
        df_ocorrencias['municipio_id'] = df_ocorrencias.apply(
            lambda r: munis_map[(r['regiao_id'], r['municipio'].upper())], axis=1
        )
        
        # Obter tipo_crime_id
        df_ocorrencias['tipo_crime_id'] = df_ocorrencias['tipo_crime'].apply(lambda x: crimes_map[x.upper()])
        
        # Mapear mês de string para int
        df_ocorrencias['mes_int'] = df_ocorrencias['mes'].apply(lambda x: MES_MAP.get(x, 1))
        
        # Converter anos para int
        df_ocorrencias['ano_int'] = df_ocorrencias['ano'].astype(int)
        
        # Inserção em lote (bulk insert) das ocorrências
        records_to_insert = []
        for _, row in df_ocorrencias.iterrows():
            records_to_insert.append({
                "municipio_id": int(row['municipio_id']),
                "tipo_crime_id": int(row['tipo_crime_id']),
                "ano": int(row['ano_int']),
                "mes": int(row['mes_int']),
                "total_ocorrencias": int(row['ocorrencias']),
                "variacao_mensal": float(row['variacao_mensal'])
            })
            
        if records_to_insert:
            conn.execute(
                text("""
                    INSERT INTO ocorrencias (municipio_id, tipo_crime_id, ano, mes, total_ocorrencias, variacao_mensal)
                    VALUES (:municipio_id, :tipo_crime_id, :ano, :mes, :total_ocorrencias, :variacao_mensal)
                """),
                records_to_insert
            )
            logger.info(f"Carga finalizada com sucesso! {len(records_to_insert)} registros inseridos.")
        else:
            logger.warning("Nenhum registro de ocorrência encontrado para inserção.")
