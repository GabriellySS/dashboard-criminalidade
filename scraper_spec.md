# Especificação: Automação e Pipeline de Dados SSP-SP (Playwright + Pandas)

## 1. Visão Geral
O objetivo deste script em Python é operar como um robô de extração 100% automatizado (RPA/Web Scraping). Ele deve abrir um browser invisível, navegar no portal da Secretaria de Segurança Pública de São Paulo (SSP-SP), interagir com os formulários para descarregar os dados brutos e, em seguida, utilizar um pipeline ETL para converter esses dados no formato JSON exigido pelo frontend em React.

## 2. Stack Tecnológico e Ambiente
* **Linguagem:** Python 3.x
* **Ambiente Virtual:** Utilização obrigatória da diretoria `.venv`.
* **Automação Web:** `playwright` (para navegação headless e interceção de downloads).
* **Processamento de Dados:** `pandas`, `openpyxl`.
* **Gestão de Dependências:** `requirements.txt`.

## 3. Estrutura de Dados Esperada (O Alvo)
O output final em `src/data/mockData.json` deve manter estritamente esta tipagem:
```json
[
  {
    "id": "string",
    "municipio": "string",
    "tipo_crime": "string",
    "ano": "string",
    "mes": "string",
    "ocorrencias": number,
    "variacao_mensal": number
  }
]
```

## 4. Fluxo de Automação Real (Escala Estadual)
1. **Seleção de Filtros (Playwright):** No portal da SSP-SP, o robô deve interagir com o dropdown de Municípios e selecionar a opção que traga o consolidado de "Todos" ou baixar a planilha geral do Estado de SP (evitando fazer o loop manual por 645 cidades, o que causaria estouro de timeout).
2. **Normalização em Massa (Pandas):** - A função de limpeza do Pandas não deve mais usar mapeamentos manuais rígidos (if/else) para nomes de cidades, exceto para correções explícitas de siglas conhecidas (ex: "S. PAULO" ou "SÃO PAULO" -> "São Paulo (Capital)").
   - Para todas as outras cidades, aplicar a capitalização padrão (`.str.title()`) e remover espaços extras para garantir a padronização.
3. **Gerenciamento de Volume de Dados:** O formato do JSON final em `src/data/mockData.json` deve permanecer idêntico, mas agora conterá os registros de todos os municípios processados cronologicamente.

## 5. Instruções para o Agente
1. Leia a atualização de escala estadual no @scraper_spec.md.
2. Refatore o `scraper.py` para remover a trava que limitava a extração apenas a São Paulo e Cotia.
3. Atualize a função de normalização de texto para tratar dinamicamente o nome de qualquer município do estado que apareça na planilha baixada.
4. Mantenha o cálculo de `variacao_mensal` agrupado por `["municipio", "tipo_crime"]` para que a variação percentual seja calculada corretamente e isolada dentro de cada cidade.