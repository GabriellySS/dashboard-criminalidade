import os
import shutil
import random
import time
import numpy as np
import pandas as pd
import openpyxl
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
from etl_loader import carregar_dados_para_banco
from db_connection import engine
from sqlalchemy import text

# Define paths
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_data")
MAX_RETRIES = 3

def check_data_exists(municipio: str, ano: str) -> bool:
    """Checks the database to see if occurrences already exist for this municipality and year."""
    query = """
        SELECT COUNT(1)
        FROM ocorrencias o
        JOIN municipios m ON o.municipio_id = m.id
        WHERE UPPER(m.nome) = :municipio AND o.ano = :ano
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query), {"municipio": municipio.upper(), "ano": int(ano)})
            count = result.scalar()
            return count > 0
    except Exception as e:
        print(f"⚠️ Erro ao verificar checkpoints no banco: {e}")
        return False

def processar_e_carregar_lote(filepath: str):
    """Processes a single downloaded Excel file and saves it immediately to the database."""
    f = os.path.basename(filepath)
    parts = f.split("__")
    if len(parts) != 3:
        return
    region_name = parts[0].replace('_', ' ')
    city_name = parts[1].replace('_', ' ')
    year = parts[2].split('.')[0]
    
    wb = openpyxl.load_workbook(filepath)
    sheet = wb.active
    
    meses_col = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    month_indices = {
        'Jan': 1, 'Fev': 2, 'Mar': 3, 'Abr': 4, 'Mai': 5, 'Jun': 6,
        'Jul': 7, 'Ago': 8, 'Set': 9, 'Out': 10, 'Nov': 11, 'Dez': 12
    }
    
    rows_data = []
    for r in sheet.iter_rows(values_only=True):
        if r[0] is not None and str(r[0]).strip().upper() != 'NATUREZA':
            crime_name = str(r[0]).strip()
            row = [region_name.upper(), city_name.upper(), crime_name]
            
            def clean_val(val):
                if val is None:
                    return "0"
                return str(val).strip().replace('.', '')
                
            for mes in meses_col:
                idx = month_indices[mes]
                row.append(clean_val(r[idx]))
            rows_data.append((row, year))
            
    if not rows_data:
        return
        
    all_dfs = []
    for row, yr in rows_data:
        cols = ["regiao", "municipio", "tipo_crime"] + [f"{mes}/{yr[-2:]}" for mes in meses_col]
        df_single = pd.DataFrame([row], columns=cols)
        
        df_long_single = df_single.melt(
            id_vars=["regiao", "municipio", "tipo_crime"],
            value_vars=[f"{mes}/{yr[-2:]}" for mes in meses_col],
            var_name="mes_ano",
            value_name="ocorrencias"
        )
        all_dfs.append(df_long_single)
        
    df_long = pd.concat(all_dfs, ignore_index=True)
    df_long["ocorrencias"] = pd.to_numeric(df_long["ocorrencias"]).fillna(0).astype(int)
    
    mes_map = {
        "Jan": "Janeiro", "Fev": "Fevereiro", "Mar": "Março", "Abr": "Abril",
        "Mai": "Maio", "Jun": "Junho", "Jul": "Julho", "Ago": "Agosto",
        "Set": "Setembro", "Out": "Outubro", "Nov": "Novembro", "Dez": "Dezembro"
    }
    
    def parse_mes_ano(val):
        if '/' not in str(val):
            return pd.Series(["Janeiro", "2023"])
        parts = str(val).split('/')
        mes_abr = parts[0]
        ano_suffix = parts[1]
        
        mes_full = mes_map.get(mes_abr, mes_abr)
        ano_full = f"20{ano_suffix}"
        return pd.Series([mes_full, ano_full])
        
    df_long[["mes", "ano"]] = df_long["mes_ano"].apply(parse_mes_ano)
    
    def normalize_text(text):
        if not isinstance(text, str):
            return text
        text = text.strip()
        text_upper = text.upper()
        if text_upper in ["S. PAULO", "S.PAULO", "SAO PAULO", "SÃO PAULO"]:
            return "São Paulo (Capital)"
        return text.title()
        
    df_long["regiao"] = df_long["regiao"].apply(normalize_text)
    df_long["municipio"] = df_long["municipio"].apply(normalize_text)
    df_long["tipo_crime"] = df_long["tipo_crime"].apply(normalize_text)
    
    df_long["tipo_crime"] = df_long["tipo_crime"].str.replace(r"\s*\(\d+\)", "", regex=True).str.strip()
    df_long = df_long[~df_long["tipo_crime"].str.startswith(("Total ", "Total De "))]
    df_long = df_long[~df_long["tipo_crime"].str.startswith(("Nº De Vítimas", "N° De Vítimas"))]
    
    tipo_crime_mapping = {
        "Furto - Outros": "Furto (Geral)",
        "Roubo - Outros": "Roubo (Geral)",
        "Homicídio Culposo Outros": "Homicídio Culposo",
        "Lesão Corporal Culposa - Outras": "Lesão Corporal Culposa",
    }
    df_long["tipo_crime"] = df_long["tipo_crime"].replace(tipo_crime_mapping)
    df_long["tipo_crime"] = df_long["tipo_crime"].str.replace("Por Acidente De Trânsito", "(Trânsito)", regex=False)
    
    def get_macro_categoria(crime):
        if not isinstance(crime, str):
            return "Outros Crimes"
        c = crime.lower()
        if "homicídio doloso" in c or "homicio doloso" in c:
            return "Homicídio Doloso"
        elif "homicídio culposo" in c or "homicio culposo" in c:
            return "Homicídio Culposo"
        elif "lesão corporal" in c or "lesao corporal" in c:
            return "Lesão Corporal"
        elif "roubo" in c:
            return "Roubo"
        elif "furto" in c:
            return "Furto"
        elif "estupro" in c:
            return "Estupro"
        else:
            return "Outros Crimes"
            
    df_long["categoria_crime"] = df_long["tipo_crime"].apply(get_macro_categoria)
    
    mes_ordem = {
        "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
        "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
    }
    df_long["mes_idx"] = df_long["mes"].map(mes_ordem)
    df_long["ano_int"] = df_long["ano"].astype(int)
    
    df_long = df_long.sort_values(by=["regiao", "municipio", "tipo_crime", "ano_int", "mes_idx"]).reset_index(drop=True)
    
    df_long["variacao_mensal"] = df_long.groupby(["municipio", "tipo_crime"])["ocorrencias"].pct_change() * 100
    df_long["variacao_mensal"] = df_long["variacao_mensal"].replace([np.inf, -np.inf], 0.0)
    df_long["variacao_mensal"] = df_long["variacao_mensal"].fillna(0.0).round(2)
    
    df_long["id"] = df_long.apply(
        lambda row: f"{row['municipio'].replace(' ', '_')}_{row['tipo_crime'].replace(' ', '_')}_{row['ano']}_{row['mes']}", 
        axis=1
    )
    
    df_long = df_long.drop(columns=["mes_ano", "mes_idx", "ano_int"])
    output_cols = ["id", "regiao", "municipio", "categoria_crime", "tipo_crime", "ano", "mes", "ocorrencias", "variacao_mensal"]
    df_output = df_long[output_cols]
    
    carregar_dados_para_banco(df_output)

def scrape_with_playwright(download_dir):
    """Navigates to the SSP-SP stats page using Playwright and downloads Excel files in headless mode with random sleeps and checkpoints."""
    url = "https://www.ssp.sp.gov.br/estatistica/dados-mensais"
    
    print(f"🤖 Iniciando automação Playwright em modo HEADLESS para: {url}")
    with sync_playwright() as p:
        # Modo Headless ativado
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        try:
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            page.wait_for_selector("select.form-select", timeout=15000)
            
            # Gather all years dynamically
            selects = page.locator("select.form-select")
            year_select = selects.nth(0)
            year_opts = year_select.locator("option")
            years = [year_opts.nth(i).text_content().strip() for i in range(1, year_opts.count())]
            
            # Gather all regions dynamically
            reg_select = selects.nth(1)
            reg_opts = reg_select.locator("option")
            regions = [reg_opts.nth(i).text_content().strip() for i in range(1, reg_opts.count())]
            
            years_to_scrape = years
            regions_to_scrape = regions
            
            for year in years_to_scrape:
                for r_idx, r in enumerate(regions_to_scrape):
                    # Select region to load its municipalities
                    selects = page.locator("select.form-select")
                    selects.nth(1).select_option(label=r)
                    page.wait_for_timeout(1000)
                    
                    # Gather municipalities for this region
                    muni_select = page.locator("select.form-select").nth(2)
                    muni_opts = muni_select.locator("option")
                    munis = [muni_opts.nth(i).text_content().strip() for i in range(1, muni_opts.count())]
                    
                    munis_to_scrape = munis
                            
                    for m_idx, m in enumerate(munis_to_scrape):
                        # check manual correction for Capital to check checkpoint correctly
                        normalized_m = "São Paulo (Capital)" if m.upper() in ["S. PAULO", "S.PAULO", "SAO PAULO", "SÃO PAULO"] else m
                        
                        # Checkpoint: verify if data already exists in database
                        if check_data_exists(normalized_m, year):
                            print(f"⏭️ [PROGRESSO] Dados de '{normalized_m}' para o ano {year} já existem no banco. Pulando...")
                            continue
                        
                        print(f"🔎 [FILA] Iniciando extração: {m} ({r}) - {year}...")
                        
                        success = False
                        for attempt in range(1, MAX_RETRIES + 1):
                            try:
                                # Pausa humanizada antes de interagir (anti-bloqueio)
                                sleep_time = random.uniform(2.0, 6.0)
                                time.sleep(sleep_time)
                                
                                selects = page.locator("select.form-select")
                                
                                # 1. Select Year
                                selects.nth(0).select_option(label=year)
                                page.wait_for_timeout(300)
                                
                                # 2. Select Region
                                selects.nth(1).select_option(label=r)
                                page.wait_for_timeout(500)
                                
                                # 3. Select Municipality
                                selects = page.locator("select.form-select")
                                muni_select = selects.nth(2)
                                muni_select.select_option(label=m)
                                page.wait_for_timeout(300)
                                
                                r_clean = r.replace(" ", "_")
                                m_clean = m.replace(" ", "_")
                                filename = f"{r_clean}__{m_clean}__{year}.xlsx"
                                filepath = os.path.join(download_dir, filename)
                                
                                # 4. Intercept and download Excel file
                                with page.expect_download(timeout=20000) as download_info:
                                    export_button = page.locator("text=Exportar Dados")
                                    export_button.click()
                                    
                                download = download_info.value
                                download.save_as(filepath)
                                
                                # Process immediately (saving in batch and free memory)
                                processar_e_carregar_lote(filepath)
                                print(f"✅ [SUCESSO] Dados de '{normalized_m}' - {year} salvos no banco!")
                                
                                # Delete file immediately to save space
                                if os.path.exists(filepath):
                                    os.remove(filepath)
                                
                                success = True
                                break
                            except Exception as e:
                                print(f"⚠️ [AVISO] Falha na tentativa {attempt}/{MAX_RETRIES} para '{normalized_m}' ({year}): {e}")
                                # Clean up file if it exists
                                r_clean = r.replace(" ", "_")
                                m_clean = m.replace(" ", "_")
                                filename = f"{r_clean}__{m_clean}__{year}.xlsx"
                                filepath = os.path.join(download_dir, filename)
                                if os.path.exists(filepath):
                                    try:
                                        os.remove(filepath)
                                    except Exception:
                                        pass
                                
                                if attempt < MAX_RETRIES:
                                    print("Aguardando 5 segundos e recarregando a página...")
                                    time.sleep(5)
                                    try:
                                        page.reload()
                                        page.wait_for_load_state("networkidle")
                                    except Exception as reload_err:
                                        print(f"⚠️ Erro ao recarregar a página: {reload_err}")
                                else:
                                    print(f"❌ [ERRO CRÍTICO] Esgotadas as {MAX_RETRIES} tentativas para '{normalized_m}' - {year}. Falha graciosa ativada. Pulando para a próxima cidade/ano.")
                        
                        if not success:
                            continue
                            
        except Exception as e:
            raise RuntimeError(f"Erro na automação Playwright: {e}")
        finally:
            browser.close()

def main():
    os.makedirs(TEMP_DIR, exist_ok=True)
    try:
        scrape_with_playwright(TEMP_DIR)
    finally:
        # Clean up temporary directory
        if os.path.exists(TEMP_DIR):
            shutil.rmtree(TEMP_DIR)

if __name__ == "__main__":
    main()
