import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Configuração de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# String de conexão do banco de dados
DATABASE_URL = 'postgresql://admin:admin@localhost:5432/ssp_dashboard'

# Criação do engine SQLAlchemy
engine = create_engine(DATABASE_URL)

def testar_conexao():
    """Tenta abrir uma conexão com o banco de dados PostgreSQL e exibe o resultado."""
    logger.info("Tentando conectar ao banco de dados PostgreSQL...")
    try:
        # Tenta se conectar e executar uma consulta simples
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            value = result.scalar()
            if value == 1:
                logger.info("Conexão estabelecida com sucesso!")
                print("Sucesso: Conexão estabelecida com sucesso!")
            else:
                logger.warning(f"Resposta inesperada do banco de dados: {value}")
    except SQLAlchemyError as e:
        logger.error(f"Erro ao tentar conectar ao banco de dados: {e}")
        print(f"Erro: Falha na conexão. Detalhes: {e}")

if __name__ == "__main__":
    testar_conexao()
