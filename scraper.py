import os
import shutil
import json
import unicodedata
import numpy as np
import pandas as pd
import openpyxl
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright

# Define paths
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_data")
TARGET_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "data", "mockData.json")

def scrape_with_playwright(download_dir):
    """Navigates to the SSP-SP stats page using Playwright and downloads Excel files for target regions, municipalities, and years."""
    url = "https://www.ssp.sp.gov.br/estatistica/dados-mensais"
    
    # Target configurations to scrape
    targets = [
        ('Capital', 'São Paulo'),
        ('Grande São Paulo (exclui a Capital)', 'Cotia')
    ]
    years = ['2019', '2020', '2021', '2022', '2023']
    
    print(f"Starting Playwright automation targeting: {url}")
    with sync_playwright() as p:
        # Launch browser with headless=False to allow visual auditing/debugging
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        try:
            print(f"Navigating to {url}...")
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            
            # Explicitly wait for the primary filter dropdowns to be loaded in the DOM
            page.wait_for_selector("select.form-select", timeout=15000)
            
            for regiao, municipio in targets:
                for year in years:
                    print(f"Scraping data for {municipio} ({regiao}) - Year {year}...")
                    
                    # Re-locate select elements in each iteration to avoid element detached errors
                    selects = page.locator("select.form-select")
                    
                    # 1. Select Year (First select)
                    selects.nth(0).select_option(label=year)
                    page.wait_for_timeout(500)
                    
                    # 2. Select Region (Second select)
                    selects.nth(1).select_option(label=regiao)
                    # Wait for the municipality dropdown (Third select) to update options
                    page.wait_for_timeout(1000)
                    
                    # 3. Select Municipality (Third select)
                    selects = page.locator("select.form-select")
                    muni_select = selects.nth(2)
                    
                    try:
                        muni_select.select_option(label=municipio)
                    except Exception:
                        # Try uppercase fallback if needed
                        muni_select.select_option(label=municipio.upper())
                    page.wait_for_timeout(500)
                    
                    # Save path for this specific spreadsheet
                    filename = f"{municipio}_{year}.xlsx".replace(" ", "_")
                    filepath = os.path.join(download_dir, filename)
                    
                    # 4. Intercept and download Excel file
                    with page.expect_download(timeout=20000) as download_info:
                        export_button = page.locator("text=Exportar Dados")
                        export_button.click()
                        
                    download = download_info.value
                    download.save_as(filepath)
                    print(f"Successfully downloaded and saved: {filename} ({os.path.getsize(filepath)} bytes)")
                    
        except Exception as e:
            # Raise a real error instead of falling back to fake/simulated data
            raise RuntimeError(f"Playwright automation failed or timed out: {e}")
        finally:
            browser.close()

def main():
    # Ensure temporary directory exists
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    try:
        # 1. Run robot automation (Playwright) to download real spreadsheets
        scrape_with_playwright(TEMP_DIR)
        
        # 2. Compile downloaded spreadsheets into the expected format
        print("Compiling downloaded real spreadsheets...")
        anos = ['2019', '2020', '2021', '2022', '2023']
        meses_col = ['Jan', 'Abr', 'Jul', 'Out']
        
        month_indices = {
            'Jan': 1,
            'Abr': 4,
            'Jul': 7,
            'Out': 10
        }
        
        cities_map = {
            'S. PAULO': 'São Paulo',
            'COTIA': 'Cotia'
        }
        
        crimes_targets = [
            ('HOMICÍDIO DOLOSO (2)', 'HOMICÍDIO DOLOSO (2)'),
            ('ROUBO DE VEÍCULO', 'ROUBO DE VEÍCULO'),
            ('FURTO DE VEÍCULO', 'FURTO DE VEÍCULO')
        ]
        
        rows = []
        
        # Reconstruct Header 1 (Merged year headers)
        h1 = ["Município / Tipo Crime", ""]
        for ano in anos:
            h1.extend([f"ANO {ano}"] + [""] * (len(meses_col) - 1))
        rows.append(h1)
        
        # Reconstruct Header 2 (Sub-headers for months)
        h2 = ["Cidade", "Crime"]
        for ano in anos:
            for mes in meses_col:
                h2.append(f"{mes}/{ano[-2:]}")
        rows.append(h2)
        
        def clean_val(val):
            if val is None:
                return "0"
            # Remove dots used as thousand separators (e.g. '1.213' -> '1213')
            return str(val).strip().replace('.', '')
            
        for city_key, city_file_prefix in cities_map.items():
            for crime_label, crime_search in crimes_targets:
                row = [city_key, crime_label]
                for ano in anos:
                    filename = f"{city_file_prefix}_{ano}.xlsx".replace(" ", "_")
                    filepath = os.path.join(TEMP_DIR, filename)
                    
                    if not os.path.exists(filepath):
                        raise FileNotFoundError(f"Legitimate scraped file not found: {filepath}")
                        
                    wb = openpyxl.load_workbook(filepath)
                    sheet = wb.active
                    
                    found = False
                    for r in sheet.iter_rows(values_only=True):
                        if r[0] is not None:
                            # Normalize text for comparisons
                            t1 = "".join(c for c in unicodedata.normalize('NFD', str(r[0]).strip().upper()) if unicodedata.category(c) != 'Mn')
                            t2 = "".join(c for c in unicodedata.normalize('NFD', crime_search.upper()) if unicodedata.category(c) != 'Mn')
                            if t1 == t2:
                                for mes in meses_col:
                                    idx = month_indices[mes]
                                    row.append(clean_val(r[idx]))
                                found = True
                                break
                    if not found:
                        raise ValueError(f"Crime nature '{crime_search}' not found in {filepath}")
                rows.append(row)
                
        # 3. Pandas ETL Sanitization & Transformation
        if len(rows) < 2:
            raise ValueError("Spreadsheet does not have enough rows (header + subheader + data).")
            
        header_cols = ["municipio", "tipo_crime"]
        col_names = rows[1][2:]
        columns = header_cols + col_names
        
        data_rows = rows[2:]
        df_raw = pd.DataFrame(data_rows, columns=columns)
        
        # Clean null values and empty rows
        df_raw = df_raw.replace(["None", "---", "", "nan"], np.nan)
        df_raw = df_raw.dropna(subset=["municipio", "tipo_crime"])
        
        # Remove total rows
        df_raw = df_raw[~df_raw["municipio"].str.contains("TOTAL", case=False, na=False)]
        
        # Melt data from wide to long format
        df_long = df_raw.melt(
            id_vars=["municipio", "tipo_crime"],
            value_vars=col_names,
            var_name="mes_ano",
            value_name="ocorrencias"
        )
        
        # Convert occurrences to integers safely
        df_long["ocorrencias"] = pd.to_numeric(df_long["ocorrencias"]).fillna(0).astype(int)
        
        # Extract month and year from column headers (e.g., "Jan/19")
        mes_map = {
            "Jan": "Janeiro",
            "Abr": "Abril",
            "Jul": "Julho",
            "Out": "Outubro"
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
            text = text.strip().upper()
            
            # Cities mapping
            if text in ["S. PAULO", "S.PAULO", "SAO PAULO", "SÃO PAULO"]:
                return "São Paulo (Capital)"
            if text == "COTIA":
                return "Cotia"
                
            # Crime mapping
            norm_crime = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
            if "ROUBO" in norm_crime and "VEICULO" in norm_crime:
                return "Roubo de Veículos"
            if "FURTO" in norm_crime:
                return "Furtos"
            if "HOMICIDIO" in norm_crime:
                return "Homicídios Dolosos"
            return text.title()
        
        df_long["municipio"] = df_long["municipio"].apply(normalize_text)
        df_long["tipo_crime"] = df_long["tipo_crime"].apply(normalize_text)
        
        # Chronological sorting for monthly variations
        mes_ordem = {
            "Janeiro": 1,
            "Abril": 4,
            "Julho": 7,
            "Outubro": 10
        }
        df_long["mes_idx"] = df_long["mes"].map(mes_ordem)
        df_long["ano_int"] = df_long["ano"].astype(int)
        
        df_long = df_long.sort_values(by=["municipio", "tipo_crime", "ano_int", "mes_idx"]).reset_index(drop=True)
        
        # Calculate monthly variations
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
        output_cols = ["id", "municipio", "tipo_crime", "ano", "mes", "ocorrencias", "variacao_mensal"]
        df_output = df_long[output_cols]
        
        # Export output to json
        result_json = df_output.to_dict(orient="records")
        with open(TARGET_JSON, "w", encoding="utf-8") as f:
            json.dump(result_json, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully generated and saved {len(df_output)} real/sanitized records to {TARGET_JSON}")
        
    finally:
        # 4. Clean up temporary files to keep the repository clean
        if os.path.exists(TEMP_DIR):
            print(f"Cleaning up temporary directory: {TEMP_DIR}")
            shutil.rmtree(TEMP_DIR)
            print("Temporary files successfully removed.")

if __name__ == "__main__":
    main()
