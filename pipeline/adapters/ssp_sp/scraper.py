"""
pipeline/adapters/ssp_sp/scraper.py
────────────────────────────────────
Adaptador concreto da Secretaria de Segurança Pública de São Paulo (SSP-SP).

Implementa `BaseScraper` encapsulando toda a lógica de extração do portal
https://www.ssp.sp.gov.br/estatistica/dados-mensais em uma classe coesa e
testável, preservando os seguintes mecanismos já validados em produção:

  • Cache de checkpoints em memória O(1)  — evita consultas N+1 ao banco.
  • Retry Pattern (MAX_RETRIES tentativas com reload de página).
  • Falha graciosa                         — pula cidade/ano sem derrubar o run.
  • Processamento por lote imediato        — libera memória após cada xlsx.
  • Parse e normalização canônica          — Title Case, macro-categorias, etc.
"""
from __future__ import annotations

import logging
import os
import random
import shutil
import time

import numpy as np
import openpyxl
import pandas as pd

# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
from sqlalchemy import text

from db_connection import engine
from etl_loader import carregar_dados_para_banco
from pipeline.core import BaseScraper

logger = logging.getLogger(__name__)


# ── Constantes do adaptador SSP-SP ──────────────────────────────────────────

_URL_SSP_SP = "https://www.ssp.sp.gov.br/estatistica/dados-mensais"
_MAX_RETRIES = 3
_TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "temp_data")

# Mapeamento mês-abreviado → inteiro (usado no parse_mes_ano)
_MES_MAP: dict[str, str] = {
    "Jan": "Janeiro", "Fev": "Fevereiro", "Mar": "Março",   "Abr": "Abril",
    "Mai": "Maio",    "Jun": "Junho",      "Jul": "Julho",   "Ago": "Agosto",
    "Set": "Setembro","Out": "Outubro",    "Nov": "Novembro","Dez": "Dezembro",
}
_MES_ORDEM: dict[str, int] = {
    "Janeiro": 1, "Fevereiro": 2, "Março": 3,    "Abril": 4,
    "Maio": 5,    "Junho": 6,     "Julho": 7,    "Agosto": 8,
    "Setembro": 9,"Outubro": 10,  "Novembro": 11,"Dezembro": 12,
}
_MESES_COL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
               "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

# Substituições exatas de nomes de crimes (dicionário de padronização)
_TIPO_CRIME_MAPPING: dict[str, str] = {
    "Furto - Outros":                    "Furto (Geral)",
    "Roubo - Outros":                    "Roubo (Geral)",
    "Homicídio Culposo Outros":          "Homicídio Culposo",
    "Lesão Corporal Culposa - Outras":   "Lesão Corporal Culposa",
}


# ── Funções de transformação puras (independentes de estado) ─────────────────

def _normalize_text(text_val: object) -> object:
    """Title Case com tratamento especial para São Paulo (Capital)."""
    if not isinstance(text_val, str):
        return text_val
    s = text_val.strip()
    if s.upper() in {"S. PAULO", "S.PAULO", "SAO PAULO", "SÃO PAULO"}:
        return "São Paulo (Capital)"
    return s.title()


def _get_macro_categoria(crime: object) -> str:
    """Infere a macro-categoria a partir do nome do tipo de crime."""
    if not isinstance(crime, str):
        return "Outros Crimes"
    c = crime.lower()
    if "homicídio doloso" in c or "homicio doloso" in c:
        return "Homicídio Doloso"
    if "homicídio culposo" in c or "homicio culposo" in c:
        return "Homicídio Culposo"
    if "lesão corporal" in c or "lesao corporal" in c:
        return "Lesão Corporal"
    if "roubo" in c:
        return "Roubo"
    if "furto" in c:
        return "Furto"
    if "estupro" in c:
        return "Estupro"
    return "Outros Crimes"


def _parse_mes_ano(val: object) -> pd.Series:
    """
    Converte 'Jan/24' → pd.Series(['Janeiro', '2024']).

    Correção do bug [SCRAPER-02]: o ano é derivado do sufixo do arquivo
    (parâmetro `year` repassado ao DataFrame), portanto o campo `ano_suffix`
    aqui é sempre 2 dígitos do tipo '24'. A conversão usa int() explícito
    + validação de range para evitar ambiguidades futuras.
    """
    if "/" not in str(val):
        return pd.Series(["Janeiro", "2023"])
    parts = str(val).split("/")
    mes_abr = parts[0]
    ano_suffix = parts[1]

    mes_full = _MES_MAP.get(mes_abr, mes_abr)
    # Conversão explícita com validação de range (corrige [SCRAPER-02])
    ano_num = int(ano_suffix)
    if ano_num < 0 or ano_num > 99:
        raise ValueError(f"Sufixo de ano inválido: '{ano_suffix}'")
    # Heurística: sufixos ≥ 00 pertencem ao século XXI (2000–2099)
    ano_full = str(2000 + ano_num)
    return pd.Series([mes_full, ano_full])


# ── Classe concreta ──────────────────────────────────────────────────────────

class SSPSpScraper(BaseScraper):
    """
    Adaptador concreto para o portal da SSP-SP.

    Herda de BaseScraper e implementa os dois métodos abstratos:
      • get_available_years() — lê os <option> do select de ano do portal.
      • run()                 — executa o ETL completo (Playwright + Pandas).

    Instância sem argumentos; o diretório temporário e o número máximo de
    retentativas podem ser personalizados via parâmetros do construtor.
    """

    estado_sigla: str = "SP"
    fonte_nome: str   = "SSP-SP"

    def __init__(
        self,
        temp_dir: str = _TEMP_DIR,
        max_retries: int = _MAX_RETRIES,
    ) -> None:
        self._temp_dir = os.path.abspath(temp_dir)
        self._max_retries = max_retries
        # Cache em memória O(1): set de strings "MUNICIPIO_ANO"
        self._progresso_cache: set[str] = set()

    # ── Interface BaseScraper ────────────────────────────────────────────────

    def get_available_years(self) -> list[int]:
        """
        Retorna os anos disponíveis no portal da SSP-SP.

        Realiza uma navegação headless mínima para ler os <option> do
        primeiro <select> da página e retorna os valores como lista de
        inteiros em ordem decrescente.

        Se a página estiver indisponível, retorna lista vazia e loga o erro.
        """
        years: list[int] = []
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(_URL_SSP_SP, timeout=30_000)
                page.wait_for_selector("select.form-select", timeout=15_000)
                year_select = page.locator("select.form-select").nth(0)
                opts = year_select.locator("option")
                for i in range(1, opts.count()):
                    txt = opts.nth(i).text_content()
                    if txt:
                        try:
                            years.append(int(txt.strip()))
                        except ValueError:
                            pass
                browser.close()
        except Exception as exc:
            logger.warning(
                "⚠️ [SSPSpScraper] Falha ao obter anos disponíveis: %s", exc
            )
        return sorted(years, reverse=True)

    def run(self) -> None:
        """
        Executa o pipeline ETL completo da SSP-SP.

        Fluxo:
          1. Cria diretório temporário para xlsx.
          2. Carrega checkpoints em memória (O(1)).
          3. Navega no portal com Playwright e baixa os xlsx por lote.
          4. Processa e carrega cada lote imediatamente (libera memória).
          5. Remove o diretório temporário ao final (cleanup garantido).
        """
        self.log_inicio()
        os.makedirs(self._temp_dir, exist_ok=True)
        self._carregar_progresso_banco()
        try:
            self._scrape_with_playwright()
        finally:
            if os.path.exists(self._temp_dir):
                shutil.rmtree(self._temp_dir)
        self.log_fim()

    # ── Métodos privados ─────────────────────────────────────────────────────

    def _carregar_progresso_banco(self) -> None:
        """
        Carrega todos os pares (município_upper, ano) já persistidos no banco
        para o set em memória `self._progresso_cache`.

        Complexidade de lookup: O(1) — evita consultas N+1 durante o scraping.
        """
        query = """
            SELECT DISTINCT UPPER(m.nome) AS nome, o.ano
            FROM ocorrencias o
            JOIN municipios m ON o.municipio_id = m.id
        """
        try:
            with engine.connect() as conn:
                result = conn.execute(text(query))
                for row in result:
                    if row[0] is not None:
                        self._progresso_cache.add(f"{row[0].upper()}_{row[1]}")
            logger.info(
                "📦 [CACHE] %d checkpoints carregados na memória com sucesso!",
                len(self._progresso_cache),
            )
        except Exception as exc:
            logger.warning("⚠️ Erro ao carregar checkpoints em memória: %s", exc)

    def _processar_e_carregar_lote(self, filepath: str) -> None:
        """
        Processa um único arquivo xlsx baixado e persiste os dados no banco.

        Nomeclatura esperada do arquivo: `<regiao>__<municipio>__<ano>.xlsx`
        """
        fname = os.path.basename(filepath)
        parts = fname.split("__")
        if len(parts) != 3:
            logger.warning("⚠️ Nome de arquivo inválido, ignorado: %s", fname)
            return

        region_name = parts[0].replace("_", " ")
        city_name   = parts[1].replace("_", " ")
        year        = parts[2].split(".")[0]

        wb = openpyxl.load_workbook(filepath)
        sheet = wb.active

        month_indices = {
            "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5,  "Jun": 6,
            "Jul": 7, "Ago": 8, "Set": 9, "Out": 10,"Nov": 11, "Dez": 12,
        }

        rows_data = []
        for r in sheet.iter_rows(values_only=True):
            if r[0] is not None and str(r[0]).strip().upper() != "NATUREZA":
                crime_name = str(r[0]).strip()
                row: list[object] = [region_name.upper(), city_name.upper(), crime_name]

                def clean_val(val: object) -> str:
                    if val is None:
                        return "0"
                    return str(val).strip().replace(".", "")

                for mes in _MESES_COL:
                    idx = month_indices[mes]
                    row.append(clean_val(r[idx]))
                rows_data.append((row, year))

        if not rows_data:
            return

        all_dfs = []
        for row, yr in rows_data:
            cols = ["regiao", "municipio", "tipo_crime"] + [
                f"{mes}/{yr[-2:]}" for mes in _MESES_COL
            ]
            df_single = pd.DataFrame([row], columns=cols)
            df_long_single = df_single.melt(
                id_vars=["regiao", "municipio", "tipo_crime"],
                value_vars=[f"{mes}/{yr[-2:]}" for mes in _MESES_COL],
                var_name="mes_ano",
                value_name="ocorrencias",
            )
            all_dfs.append(df_long_single)

        df_long = pd.concat(all_dfs, ignore_index=True)
        df_long["ocorrencias"] = (
            pd.to_numeric(df_long["ocorrencias"]).fillna(0).astype(int)
        )

        # Parse mes/ano
        df_long[["mes", "ano"]] = df_long["mes_ano"].apply(_parse_mes_ano)

        # Normalização de texto
        df_long["regiao"]     = df_long["regiao"].apply(_normalize_text)
        df_long["municipio"]  = df_long["municipio"].apply(_normalize_text)
        df_long["tipo_crime"] = df_long["tipo_crime"].apply(_normalize_text)

        # Higienização de tipos de crime
        df_long["tipo_crime"] = (
            df_long["tipo_crime"]
            .str.replace(r"\s*\(\d+\)", "", regex=True)
            .str.strip()
        )
        df_long = df_long[
            ~df_long["tipo_crime"].str.startswith(("Total ", "Total De "))
        ]
        df_long = df_long[
            ~df_long["tipo_crime"].str.startswith(("Nº De Vítimas", "N° De Vítimas"))
        ]

        # Dicionário de padronização e normalização de sufixos
        df_long["tipo_crime"] = df_long["tipo_crime"].replace(_TIPO_CRIME_MAPPING)
        df_long["tipo_crime"] = df_long["tipo_crime"].str.replace(
            "Por Acidente De Trânsito", "(Trânsito)", regex=False
        )

        # Macro-categorias
        df_long["categoria_crime"] = df_long["tipo_crime"].apply(_get_macro_categoria)

        # Ordenação e cálculo de variação mensal
        df_long["mes_idx"] = df_long["mes"].map(_MES_ORDEM)
        df_long["ano_int"] = df_long["ano"].astype(int)
        df_long = df_long.sort_values(
            by=["regiao", "municipio", "tipo_crime", "ano_int", "mes_idx"]
        ).reset_index(drop=True)

        df_long["variacao_mensal"] = (
            df_long.groupby(["municipio", "tipo_crime"])["ocorrencias"]
            .pct_change() * 100
        )
        df_long["variacao_mensal"] = (
            df_long["variacao_mensal"]
            .replace([np.inf, -np.inf], 0.0)
            .fillna(0.0)
            .round(2)
        )

        # ID composto (para rastreabilidade)
        df_long["id"] = df_long.apply(
            lambda row: (
                f"{row['municipio'].replace(' ', '_')}"
                f"_{row['tipo_crime'].replace(' ', '_')}"
                f"_{row['ano']}_{row['mes']}"
            ),
            axis=1,
        )

        df_long = df_long.drop(columns=["mes_ano", "mes_idx", "ano_int"])
        output_cols = [
            "id", "regiao", "municipio", "categoria_crime",
            "tipo_crime", "ano", "mes", "ocorrencias", "variacao_mensal",
        ]
        carregar_dados_para_banco(df_long[output_cols])

    def _scrape_with_playwright(self) -> None:
        """
        Navega no portal da SSP-SP com Playwright em modo headless e
        realiza o download iterativo de xlsx por (ano × região × município).

        Mecanismos de resiliência:
          • Checkpoint O(1) via `self._progresso_cache` — pula combinações já processadas.
          • Retry Pattern — até `self._max_retries` tentativas por combinação.
          • Falha graciosa — esgotadas as tentativas, loga e segue para o próximo.
          • Sleeps humanizados — intervalo aleatório 2–6s para evitar bloqueio.
        """
        logger.info(
            "🤖 [SSPSpScraper] Iniciando automação Playwright em modo HEADLESS: %s",
            _URL_SSP_SP,
        )

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(accept_downloads=True)
            page = context.new_page()

            try:
                page.goto(_URL_SSP_SP, timeout=30_000)
                page.wait_for_load_state("networkidle")
                page.wait_for_selector("select.form-select", timeout=15_000)

                # Coleta anos e regiões disponíveis dinamicamente
                selects = page.locator("select.form-select")
                year_opts = selects.nth(0).locator("option")
                years = [
                    year_opts.nth(i).text_content().strip()
                    for i in range(1, year_opts.count())
                ]

                reg_opts = selects.nth(1).locator("option")
                regions = [
                    reg_opts.nth(i).text_content().strip()
                    for i in range(1, reg_opts.count())
                ]

                for year in years:
                    for r in regions:
                        # Seleciona região para carregar municípios do dropdown
                        page.locator("select.form-select").nth(1).select_option(label=r)
                        page.wait_for_timeout(1_000)

                        muni_select = page.locator("select.form-select").nth(2)
                        muni_opts = muni_select.locator("option")
                        munis = [
                            muni_opts.nth(i).text_content().strip()
                            for i in range(1, muni_opts.count())
                        ]

                        for m in munis:
                            # Normalização para verificação de checkpoint
                            normalized_m = (
                                "São Paulo (Capital)"
                                if m.upper() in {"S. PAULO", "S.PAULO", "SAO PAULO", "SÃO PAULO"}
                                else m
                            )

                            check_key = f"{normalized_m.upper()}_{year}"
                            if check_key in self._progresso_cache:
                                logger.info(
                                    "⏭️  [PROGRESSO] '%s' / %s já existe no banco. Pulando...",
                                    normalized_m, year,
                                )
                                continue

                            logger.info(
                                "🔎 [FILA] Extraindo: %s (%s) - %s...", m, r, year
                            )

                            success = False
                            for attempt in range(1, self._max_retries + 1):
                                try:
                                    # Pausa humanizada (anti-bloqueio)
                                    time.sleep(random.uniform(2.0, 6.0))

                                    selects = page.locator("select.form-select")
                                    selects.nth(0).select_option(label=year)
                                    page.wait_for_timeout(300)
                                    selects.nth(1).select_option(label=r)
                                    page.wait_for_timeout(500)
                                    selects = page.locator("select.form-select")
                                    selects.nth(2).select_option(label=m)
                                    page.wait_for_timeout(300)

                                    r_clean = r.replace(" ", "_")
                                    m_clean = m.replace(" ", "_")
                                    filename = f"{r_clean}__{m_clean}__{year}.xlsx"
                                    filepath = os.path.join(self._temp_dir, filename)

                                    with page.expect_download(timeout=20_000) as dl_info:
                                        page.locator("text=Exportar Dados").click()

                                    dl_info.value.save_as(filepath)

                                    # Processa e libera memória imediatamente
                                    self._processar_e_carregar_lote(filepath)
                                    self._progresso_cache.add(check_key)

                                    logger.info(
                                        "✅ [SUCESSO] '%s' - %s salvo no banco!",
                                        normalized_m, year,
                                    )

                                    if os.path.exists(filepath):
                                        os.remove(filepath)

                                    success = True
                                    break

                                except Exception as exc:
                                    logger.warning(
                                        "⚠️  [AVISO] Tentativa %d/%d falhou para '%s' (%s): %s",
                                        attempt, self._max_retries, normalized_m, year, exc,
                                    )
                                    # Cleanup do arquivo parcial
                                    r_clean = r.replace(" ", "_")
                                    m_clean = m.replace(" ", "_")
                                    fp = os.path.join(
                                        self._temp_dir, f"{r_clean}__{m_clean}__{year}.xlsx"
                                    )
                                    if os.path.exists(fp):
                                        try:
                                            os.remove(fp)
                                        except Exception:
                                            pass

                                    if attempt < self._max_retries:
                                        logger.info(
                                            "Aguardando 5s e recarregando a página..."
                                        )
                                        time.sleep(5)
                                        try:
                                            page.reload()
                                            page.wait_for_load_state("networkidle")
                                        except Exception as reload_err:
                                            logger.warning(
                                                "⚠️ Erro ao recarregar página: %s",
                                                reload_err,
                                            )
                                    else:
                                        logger.error(
                                            "❌ [ERRO] Esgotadas %d tentativas para '%s' - %s. "
                                            "Falha graciosa ativada. Pulando...",
                                            self._max_retries, normalized_m, year,
                                        )

                            if not success:
                                continue

            except Exception as exc:
                raise RuntimeError(
                    f"[SSPSpScraper] Erro crítico na automação Playwright: {exc}"
                ) from exc
            finally:
                browser.close()
