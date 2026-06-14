import os
import json
import pandas as pd
import numpy as np

# Define lists for generation
anos = ['2019', '2020', '2021', '2022', '2023']
meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
municipios = ['São Paulo (Capital)', 'Cotia']
tipos_crime = ['Roubo de Veículos', 'Furtos', 'Homicídios Dolosos']

# Generate combinations
records = []
for ano in anos:
    for mes in meses:
        for municipio in municipios:
            for tipo_crime in tipos_crime:
                # Generate realistic base occurrences
                if municipio == 'São Paulo (Capital)':
                    if tipo_crime == 'Furtos':
                        ocorrencias = int(2500 + np.random.randint(0, 1500))
                    elif tipo_crime == 'Roubo de Veículos':
                        ocorrencias = int(700 + np.random.randint(0, 500))
                    else:  # Homicídios Dolosos
                        ocorrencias = int(40 + np.random.randint(0, 25))
                else:  # Cotia
                    if tipo_crime == 'Furtos':
                        ocorrencias = int(100 + np.random.randint(0, 100))
                    elif tipo_crime == 'Roubo de Veículos':
                        ocorrencias = int(25 + np.random.randint(0, 30))
                    else:  # Homicídios Dolosos
                        ocorrencias = int(1 + np.random.randint(0, 5))
                
                records.append({
                    'municipio': municipio,
                    'tipo_crime': tipo_crime,
                    'ano': ano,
                    'mes': mes,
                    'ocorrencias': ocorrencias
                })

# Create DataFrame
df = pd.DataFrame(records)

# Define month chronological order mapping for sorting
mes_ordem = {mes: i for i, mes in enumerate(meses)}
df['mes_idx'] = df['mes'].map(mes_ordem)
df['ano_int'] = df['ano'].astype(int)

# Sort chronologically to calculate monthly variation correctly
df = df.sort_values(by=['municipio', 'tipo_crime', 'ano_int', 'mes_idx']).reset_index(drop=True)

# Calculate monthly variation (pct_change) per group (municipio & crime)
df['variacao_mensal'] = df.groupby(['municipio', 'tipo_crime'])['ocorrencias'].pct_change() * 100
df['variacao_mensal'] = df['variacao_mensal'].fillna(0.0).round(2)

# Generate unique string IDs
df['id'] = df.apply(lambda row: f"{row['municipio'].replace(' ', '_')}_{row['tipo_crime'].replace(' ', '_')}_{row['ano']}_{row['mes']}", axis=1)

# Drop helper columns
df = df.drop(columns=['mes_idx', 'ano_int'])

# Reorder columns to match expected output
output_cols = ['id', 'municipio', 'tipo_crime', 'ano', 'mes', 'ocorrencias', 'variacao_mensal']
df = df[output_cols]

# Export to target JSON path
target_path = os.path.join('src', 'data', 'mockData.json')
os.makedirs(os.path.dirname(target_path), exist_ok=True)

# Save as formatted JSON list of objects
result_json = df.to_dict(orient='records')
with open(target_path, 'w', encoding='utf-8') as f:
    json.dump(result_json, f, ensure_ascii=False, indent=2)

print(f"Successfully generated and saved {len(df)} records to {target_path}")
