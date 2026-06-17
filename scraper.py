"""
scraper.py — Entrypoint do pipeline de dados (runner).
───────────────────────────────────────────────────────
Este arquivo é o ponto de entrada para execução manual e agendada
do pipeline ETL. Ele não contém lógica de scraping; sua única
responsabilidade é instanciar o adaptador correto e disparar o `.run()`.

Uso:
    python scraper.py

Para adicionar um novo estado no futuro, basta:
    1. Criar `pipeline/adapters/<uf>/scraper.py` com a classe concreta.
    2. Importá-la aqui e instanciá-la (ou usar um `sources.yaml` — P3).
"""
from pipeline.adapters.ssp_sp import SSPSpScraper


def main() -> None:
    scraper = SSPSpScraper()
    scraper.run()


if __name__ == "__main__":
    main()
