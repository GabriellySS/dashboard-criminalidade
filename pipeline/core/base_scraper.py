"""
pipeline/core/base_scraper.py
─────────────────────────────
Interface abstrata (Strategy Pattern) que define o contrato mínimo
obrigatório para qualquer robô de extração de dados estadual.

Para adicionar suporte a um novo estado, crie uma classe concreta em
`pipeline/adapters/<sigla_uf>/scraper.py` que herde de `BaseScraper`
e implemente os três métodos abstratos abaixo.

Exemplo mínimo:
    from pipeline.core import BaseScraper

    class SSPRJScraper(BaseScraper):
        estado_sigla = "RJ"
        fonte_nome   = "ISP-RJ"

        def get_available_years(self) -> list[int]:
            ...          # consulta o portal do ISP

        def run(self) -> None:
            ...          # executa o scraping completo
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """
    Contrato abstrato (Strategy) para todos os scrapers de estados.

    Atributos de classe obrigatórios
    ---------------------------------
    estado_sigla : str
        Sigla da UF em caixa-alta (ex: 'SP', 'RJ', 'MG').
        Usada pelo ETL loader para resolver o `estado_id` no banco.
    fonte_nome : str
        Nome legível da fonte de dados (ex: 'SSP-SP', 'ISP-RJ').
        Aparece nos logs e na tabela `fontes_dados`.

    Métodos abstratos
    -----------------
    get_available_years() -> list[int]
        Retorna a lista de anos com dados disponíveis na fonte,
        ordenados de forma decrescente.
    run() -> None
        Executa o pipeline completo de extração, transformação e
        carga (ETL) para o estado correspondente.
    """

    # ── Atributos de classe — DEVEM ser sobrescritos nas subclasses ──────────
    estado_sigla: str = NotImplemented  # type: ignore[assignment]
    fonte_nome: str = NotImplemented  # type: ignore[assignment]

    # ── Validação na instanciação ────────────────────────────────────────────

    def __init_subclass__(cls, **kwargs: object) -> None:
        """
        Valida, em tempo de definição da subclasse, que os atributos
        obrigatórios foram declarados.  Falhar rápido (fail-fast) é
        preferível a erros obscuros em runtime.
        """
        super().__init_subclass__(**kwargs)
        # Ignora classes intermediárias abstratas (aquelas que ainda
        # possuem métodos abstratos não implementados).
        if not getattr(cls, "__abstractmethods__", None):
            if cls.estado_sigla is NotImplemented:
                raise TypeError(
                    f"{cls.__name__} deve declarar o atributo de classe `estado_sigla` "
                    "(ex: estado_sigla = 'SP')."
                )
            if cls.fonte_nome is NotImplemented:
                raise TypeError(
                    f"{cls.__name__} deve declarar o atributo de classe `fonte_nome` "
                    "(ex: fonte_nome = 'SSP-SP')."
                )

    # ── Interface pública obrigatória ────────────────────────────────────────

    @abstractmethod
    def get_available_years(self) -> list[int]:
        """
        Retorna a lista de anos com dados disponíveis na fonte externa.

        A implementação pode:
          - Consultar o banco local (anos já carregados).
          - Inspecionar os seletores `<select>` da página alvo.
          - Chamar uma API REST de metadados.

        Returns
        -------
        list[int]
            Anos disponíveis em ordem decrescente (ex: [2024, 2023, 2022]).
        """
        ...

    @abstractmethod
    def run(self) -> None:
        """
        Executa o ciclo completo de ETL para o estado correspondente:

        1. Carrega checkpoints de progresso (O(1), via cache em memória).
        2. Navega/acessa a fonte de dados (Playwright, REST, CSV, etc.).
        3. Para cada (ano × região × município) ainda não processado:
           a. Extrai os dados brutos.
           b. Transforma para o schema canônico (DataFrame Pandas).
           c. Carrega no banco via `etl_loader.carregar_dados_para_banco()`.
           d. Registra o checkpoint no cache e no banco.
        4. Libera recursos (fecha browser, conexão, etc.).

        Deve implementar:
          - Retry Pattern (máximo de tentativas configurável).
          - Falha graciosa (pular item com erro sem derrubar execução global).
          - Logs estruturados com emojis de status para rastreabilidade.
        """
        ...

    # ── Método utilitário (não abstrato — disponível a todas as subclasses) ──

    def log_inicio(self) -> None:
        """Emite log padronizado de início de execução."""
        logger.info(
            "🚀 [%s] Iniciando scraper '%s' para o estado '%s'.",
            self.__class__.__name__,
            self.fonte_nome,
            self.estado_sigla,
        )

    def log_fim(self) -> None:
        """Emite log padronizado de conclusão de execução."""
        logger.info(
            "✅ [%s] Scraper '%s' finalizado com sucesso.",
            self.__class__.__name__,
            self.fonte_nome,
        )
