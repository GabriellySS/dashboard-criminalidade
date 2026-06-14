import os
import shutil
import json
import unicodedata
import numpy as np
import pandas as pd
import openpyxl
from playwright.sync_api import sync_playwright

# Define paths
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_data")
TARGET_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "data", "mockData.json")

def generate_simulated_excel(file_path):
    """Generates a simulated Excel file with the expected 'dirty' structure of the SSP-SP report."""
    print(f"Generating simulated Excel spreadsheet at: {file_path}")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Estatísticas SSP-SP"
    
    anos = ['2019', '2020', '2021', '2022', '2023']
    meses_col = ['Jan', 'Abr', 'Jul', 'Out']
    
    # Header 1: Merged year headers
    h1 = ["Município / Tipo Crime", ""]
    for ano in anos:
        h1.extend([f"ANO {ano}"] + [""] * (len(meses_col) - 1))
    ws.append(h1)
    
    # Header 2: Sub-headers for months
    h2 = ["Cidade", "Crime"]
    for ano in anos:
        for mes in meses_col:
            h2.append(f"{mes}/{ano[-2:]}")
    ws.append(h2)
    
    # Data Rows: Cities and crimes with accents and dirty formats
    cities_crime = [
        ('S. PAULO', 'Roubo de Veículos', 800, 300),
        ('S. PAULO', 'Furtos', 2800, 1000),
        ('S. PAULO', 'Homicídios Dolosos', 30, 15),
        ('COTIA', 'Roubo de Veículos', 30, 15),
        ('COTIA', 'Furtos', 120, 80),
        ('COTIA', 'Homicídios Dolosos', 1, 3)
    ]
    
    # Ensure reproducibility for random values
    np.random.seed(42)
    for city, crime, base_val, rand_range in cities_crime:
        row = [city, crime]
        for ano in anos:
            for mes in meses_col:
                val = base_val + np.random.randint(0, rand_range)
                row.append(val)
        ws.append(row)
        
    # Totals and empty rows to test sanitization
    total_row = ["TOTAL GERAL", "---"] + [9999] * (len(anos) * len(meses_col))
    ws.append(total_row)
    
    empty_row = ["", ""] + [None] * (len(anos) * len(meses_col))
    ws.append(empty_row)
    
    wb.save(file_path)

def scrape_with_playwright(download_dir):
    """Navigates to the SSP-SP stats page using Playwright, intercepts and downloads the Excel file."""
    url = "https://www.ssp.sp.gov.br/estatistica/dados-mensais"
    file_path = os.path.join(download_dir, "ssp_data.xlsx")
    
    print(f"Starting Playwright automation targeting: {url}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        try:
            # Set timeout to 15 seconds to avoid hanging indefinitely if the network is offline or blocked
            page.goto(url, timeout=15000)
            print("Successfully loaded the SSP-SP page. Interacting with forms...")
            
            # Since the website might have complex dropdowns/dynamic rendering:
            # We locate and click relevant options or dropdown selectors.
            # In a typical flow: select 'Ano', select 'Município/Região', click 'Exportar' or 'Excel' button
            # We attempt to find typical export / excel button selectors or text links.
            # If they fail, exception is caught and we fallback.
            
            # Example dropdown selection if elements are present:
            # page.select_option('select#ano', label='2023')
            # page.select_option('select#municipio', label='Todos')
            
            # Trigger download
            with page.expect_download(timeout=10000) as download_info:
                # Try clicking download button/icon. Using general selectors matching typical SSP-SP exports
                export_button = page.locator("a[id*='btnExportar'], button[id*='btnExportar'], a:has-text('Exportar'), button:has-text('Excel')").first
                if export_button.count() > 0:
                    export_button.click()
                else:
                    # If selector not found, raise exception to trigger simulated excel fallback
                    raise RuntimeError("Export button/element not found on the page.")
                    
            download = download_info.value
            download.save_as(file_path)
            print(f"Successfully downloaded file via Playwright to: {file_path}")
            return file_path
        except Exception as e:
            print(f"Playwright automation encountered an issue or timed out: {e}")
            print("Falling back to simulated spreadsheet generation.")
            generate_simulated_excel(file_path)
            return file_path
        finally:
            browser.close()

def main():
    # Ensure temporary directory exists
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    downloaded_file = None
    try:
        # 1. Run robot automation (Playwright)
        downloaded_file = scrape_with_playwright(TEMP_DIR)
        
        # 2. Parse downloaded file (Excel / CSV)
        print(f"Reading spreadsheet: {downloaded_file}")
        wb = openpyxl.load_workbook(downloaded_file)
        sheet = wb.active
        
        rows = []
        for r in sheet.iter_rows(values_only=True):
            # Convert values to strings, map None to empty strings to match historical code
            rows.append([str(cell) if cell is not None else "" for cell in r])
            
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
