import os
import logging
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, text
# pyrefly: ignore [missing-import]
from sqlalchemy.exc import SQLAlchemyError

# Carrega as variáveis do arquivo .env (se existir) para os.environ
# Em produção, as variáveis devem ser injetadas diretamente no ambiente do sistema.
load_dotenv()

# Configuração de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Lê a string de conexão do ambiente. Sem fallback hardcoded — falha explicitamente
# se a variável não estiver definida, evitando conexões silenciosas com credenciais erradas.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise EnvironmentError(
        "A variável de ambiente DATABASE_URL não está definida. "
        "Copie o arquivo .env.example para .env e preencha com suas credenciais."
    )

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
