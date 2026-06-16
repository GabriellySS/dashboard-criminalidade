import logging
import pandas as pd
# pyrefly: ignore [missing-import]
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

# Sigla do estado que o scraper atual raspa.
# Quando o pipeline for expandido para outros estados, este valor deve ser
# passado como argumento para carregar_dados_para_banco() em vez de ser fixo.
ESTADO_SIGLA_ATUAL = "SP"


def _get_estado_id(conn, sigla: str) -> int:
    """
    Busca o id do estado pela sigla (UF). Levanta ValueError se não encontrado.
    Isso garante que o pipeline falhe explicitamente caso o seed de estados
    não tenha sido executado corretamente no banco.
    """
    result = conn.execute(
        text("SELECT id FROM estados WHERE sigla = :sigla"),
        {"sigla": sigla}
    ).scalar()

    if result is None:
        raise ValueError(
            f"Estado '{sigla}' não encontrado na tabela 'estados'. "
            "Certifique-se de que o schema v2 foi aplicado (database/schema.sql ou "
            "database/migration_v1_to_v2.sql) antes de executar o pipeline."
        )
    return result


def carregar_dados_para_banco(df: pd.DataFrame):
    """
    Realiza o pipeline ETL inserindo os dados tratados do Pandas nas tabelas
    relacionais do PostgreSQL.

    Suporte Multi-Estado (v2): ao inserir regiões novas, o estado_id é resolvido
    dinamicamente via _get_estado_id(). Atualmente fixado em 'SP' (SSP-SP),
    mas pronto para receber o estado como parâmetro quando outros scrapers forem
    adicionados.
    """
    logger.info("Iniciando o carregamento dos dados no banco relacional PostgreSQL...")

    # Valida se o DataFrame está vazio
    if df.empty:
        logger.warning("O DataFrame está vazio. Nenhuma ação será realizada.")
        return

    # Inicia a transação
    with engine.begin() as conn:

        # 0. Resolve o estado_id uma única vez para toda a transação
        # (evita N consultas ao banco para cada região processada)
        logger.info(f"Resolvendo estado_id para '{ESTADO_SIGLA_ATUAL}'...")
        estado_id = _get_estado_id(conn, ESTADO_SIGLA_ATUAL)
        logger.info(f"Estado '{ESTADO_SIGLA_ATUAL}' encontrado com id={estado_id}.")

        # 1. Regiões
        # A query agora filtra pelo estado_id para não colidir com regiões
        # homônimas de outros estados futuros.
        logger.info("Processando regiões...")
        existing_regioes = conn.execute(
            text("SELECT id, nome FROM regioes WHERE estado_id = :estado_id"),
            {"estado_id": estado_id}
        ).fetchall()
        regioes_map = {r[1].upper(): r[0] for r in existing_regioes}

        novas_regioes = df['regiao'].unique()
        for reg in novas_regioes:
            reg_upper = reg.upper()
            if reg_upper not in regioes_map:
                res = conn.execute(
                    text("""
                        INSERT INTO regioes (estado_id, nome)
                        VALUES (:estado_id, :nome)
                        ON CONFLICT (estado_id, nome)
                        DO UPDATE SET nome = EXCLUDED.nome
                        RETURNING id
                    """),
                    {"estado_id": estado_id, "nome": reg}
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
                    text("""
                        INSERT INTO tipos_crime (categoria_macro, nome_crime)
                        VALUES (:categoria_macro, :nome_crime)
                        ON CONFLICT (nome_crime)
                        DO UPDATE SET categoria_macro = EXCLUDED.categoria_macro
                        RETURNING id
                    """),
                    {"categoria_macro": c_macro, "nome_crime": c_nome}
                )
                crimes_map[c_nome_upper] = res.scalar()

        # 4. Limpar Ocorrências Existentes do lote correspondente antes de inserir
        logger.info("Limpando dados de ocorrências anteriores do mesmo lote...")

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

        # Limpar apenas as chaves (municipio_id, ano) que estão sendo reinseridas neste lote
        for muni_id in df_ocorrencias['municipio_id'].unique():
            for ano_val in df_ocorrencias['ano_int'].unique():
                conn.execute(
                    text("DELETE FROM ocorrencias WHERE municipio_id = :municipio_id AND ano = :ano"),
                    {"municipio_id": int(muni_id), "ano": int(ano_val)}
                )

        # 5. Ocorrências
        logger.info("Preparando e inserindo ocorrências...")

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
