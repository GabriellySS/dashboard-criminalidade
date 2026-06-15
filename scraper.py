import os
import shutil
import json
import unicodedata
import numpy as np
import pandas as pd
import openpyxl
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
from etl_loader import carregar_dados_para_banco


# Define paths
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_data")
TARGET_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "data", "mockData.json")

def scrape_with_playwright(download_dir):
    """Navigates to the SSP-SP stats page using Playwright and downloads Excel files by looping through years, regions, and municipalities."""
    url = "https://www.ssp.sp.gov.br/estatistica/dados-mensais"
    
    print(f"Starting Playwright automation targeting: {url}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        try:
            print(f"Navigating to {url}...")
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            
            # Explicitly wait for the primary filter dropdowns to be loaded in the DOM
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
            
            print(f"Total years gathered: {len(years)} {years[:3]}...")
            print(f"Total regions gathered: {len(regions)} {regions[:3]}...")
            
            # =========================================================================
            # CONFIGURAÇÃO DE ESCOPO:
            # - 1 Ano inteiro completo (o último ano disponível, ex: 2026)
            # - Todas as regiões disponíveis
            # - Cidades prioritárias: São Paulo, Osasco, Cotia, Barueri (e pelo menos 1 de cada região para diversidade)
            # =========================================================================
            years_to_scrape = years[:1]
            regions_to_scrape = regions
            print(f"Scraping years: {years_to_scrape}")
            print(f"Scraping regions: {regions_to_scrape}")
            
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
                    
                    # Filtragem para garantir cidades de teste de UI + representação estadual
                    munis_to_scrape = []
                    for idx, m_name in enumerate(munis):
                        m_upper = m_name.upper()
                        is_target = any(tc in m_upper for tc in ["SÃO PAULO", "SAO PAULO", "S. PAULO", "S.PAULO", "COTIA", "OSASCO", "BARUERI"])
                        if is_target:
                            munis_to_scrape.append(m_name)
                        elif idx < 1:  # Mantém pelo menos a primeira cidade de cada região
                            munis_to_scrape.append(m_name)
                            
                    print(f"\n[Região {r_idx + 1}/{len(regions_to_scrape)}] Processando: {r}")
                    print(f"  Cidades a extrair nesta região: {munis_to_scrape}")
                    
                    for m_idx, m in enumerate(munis_to_scrape):
                        print(f"    -> [{m_idx + 1}/{len(munis_to_scrape)}] Extraindo {m} ({r}) - Ano {year}...")
                        
                        # Re-locate select elements in each iteration to avoid element detached errors
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
                        
                        # Save path for this specific spreadsheet
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
                        print(f"      [OK] Salvo: {filename} ({os.path.getsize(filepath)} bytes)")
                    
        except Exception as e:
            raise RuntimeError(f"Playwright automation failed or timed out: {e}")
        finally:
            browser.close()
 
def main():
    # Ensure temporary directory exists
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    try:
        # 1. Run robot automation (Playwright) to download real spreadsheets
        scrape_with_playwright(TEMP_DIR)
        
        # 2. Compile downloaded spreadsheets dynamically in batch (includes ALL crimes)
        print("\nCompilando planilhas extraídas dinamicamente...")
        meses_col = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        
        month_indices = {
            'Jan': 1,
            'Fev': 2,
            'Mar': 3,
            'Abr': 4,
            'Mai': 5,
            'Jun': 6,
            'Jul': 7,
            'Ago': 8,
            'Set': 9,
            'Out': 10,
            'Nov': 11,
            'Dez': 12
        }
        
        # Scan TEMP_DIR for all downloaded files
        files = [f for f in os.listdir(TEMP_DIR) if f.endswith('.xlsx')]
        
        all_dfs = []
        
        for f in files:
            # Filename is formatted as: "RegionName__MunicipalityName__Year.xlsx"
            parts = f.split("__")
            if len(parts) != 3:
                continue
            region_name = parts[0].replace('_', ' ')
            city_name = parts[1].replace('_', ' ')
            year = parts[2].split('.')[0]
            
            filepath = os.path.join(TEMP_DIR, f)
            wb = openpyxl.load_workbook(filepath)
            sheet = wb.active
            
            rows_data = []
            for r in sheet.iter_rows(values_only=True):
                # Skip empty rows and the header label row containing 'NATUREZA'
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
                            
            # Convert rows to DataFrames and melt them to long format
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
                
        if not all_dfs:
            raise ValueError("No data files were processed successfully.")
            
        # 3. Concatenate all DataFrames into a single long-format DataFrame
        df_long = pd.concat(all_dfs, ignore_index=True)
        
        # Convert occurrences to integers safely
        df_long["ocorrencias"] = pd.to_numeric(df_long["ocorrencias"]).fillna(0).astype(int)
        
        # Extract month and year from column headers (e.g., "Jan/19")
        mes_map = {
            "Jan": "Janeiro",
            "Fev": "Fevereiro",
            "Mar": "Março",
            "Abr": "Abril",
            "Mai": "Maio",
            "Jun": "Junho",
            "Jul": "Julho",
            "Ago": "Agosto",
            "Set": "Setembro",
            "Out": "Outubro",
            "Nov": "Novembro",
            "Dez": "Dezembro"
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
        
        # Normalization of Names and Crimes
        def normalize_text(text):
            if not isinstance(text, str):
                return text
            text = text.strip()
            
            # Special manual correction for Capital
            text_upper = text.upper()
            if text_upper in ["S. PAULO", "S.PAULO", "SAO PAULO", "SÃO PAULO"]:
                return "São Paulo (Capital)"
            
            # Generic Title Case normalization for all other cities/crimes
            return text.title()
        
        df_long["regiao"] = df_long["regiao"].apply(normalize_text)
        df_long["municipio"] = df_long["municipio"].apply(normalize_text)
        df_long["tipo_crime"] = df_long["tipo_crime"].apply(normalize_text)
        
        # 1. REMOÇÃO DE NOTAS DE RODAPÉ
        df_long["tipo_crime"] = df_long["tipo_crime"].str.replace(r"\s*\(\d+\)", "", regex=True).str.strip()
        
        # 2. FILTRAGEM DE LINHAS INVÁLIDAS
        df_long = df_long[~df_long["tipo_crime"].str.startswith(("Total ", "Total De "))]
        df_long = df_long[~df_long["tipo_crime"].str.startswith(("Nº De Vítimas", "N° De Vítimas"))]
        
        # 3. DICIONÁRIO DE PADRONIZAÇÃO (UX)
        tipo_crime_mapping = {
            "Furto - Outros": "Furto (Geral)",
            "Roubo - Outros": "Roubo (Geral)",
            "Homicídio Culposo Outros": "Homicídio Culposo",
            "Lesão Corporal Culposa - Outras": "Lesão Corporal Culposa",
        }
        df_long["tipo_crime"] = df_long["tipo_crime"].replace(tipo_crime_mapping)
        df_long["tipo_crime"] = df_long["tipo_crime"].str.replace("Por Acidente De Trânsito", "(Trânsito)", regex=False)
        
        # 4. CRIAÇÃO DE MACRO-CATEGORIAS
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
        
        # Chronological sorting for monthly variations
        mes_ordem = {
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
        df_long["mes_idx"] = df_long["mes"].map(mes_ordem)
        df_long["ano_int"] = df_long["ano"].astype(int)
        
        df_long = df_long.sort_values(by=["regiao", "municipio", "tipo_crime", "ano_int", "mes_idx"]).reset_index(drop=True)
        
        # Calculate monthly variations grouped correctly by municipio and crime
        df_long["variacao_mensal"] = df_long.groupby(["municipio", "tipo_crime"])["ocorrencias"].pct_change() * 100
        df_long["variacao_mensal"] = df_long["variacao_mensal"].replace([np.inf, -np.inf], 0.0)
        df_long["variacao_mensal"] = df_long["variacao_mensal"].fillna(0.0).round(2)
        
        # Generate unique string IDs
        df_long["id"] = df_long.apply(
            lambda row: f"{row['municipio'].replace(' ', '_')}_{row['tipo_crime'].replace(' ', '_')}_{row['ano']}_{row['mes']}", 
            axis=1
        )
        
        # Clean up helper columns
        df_long = df_long.drop(columns=["mes_ano", "mes_idx", "ano_int"])
        
        # Reorder columns
        output_cols = ["id", "regiao", "municipio", "categoria_crime", "tipo_crime", "ano", "mes", "ocorrencias", "variacao_mensal"]
        df_output = df_long[output_cols]
        
        # Load output to PostgreSQL database
        carregar_dados_para_banco(df_output)
        
    finally:
        # 4. Clean up temporary files to keep the repository clean
        if os.path.exists(TEMP_DIR):
            print(f"Cleaning up temporary directory: {TEMP_DIR}")
            shutil.rmtree(TEMP_DIR)
            print("Temporary files successfully removed.")

if __name__ == "__main__":
    main()
