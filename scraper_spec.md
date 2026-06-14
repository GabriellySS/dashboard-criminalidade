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

## 4. Fluxo de Automação Real (Loop Estadual)
1. **Extração de Todos os Municípios (Playwright):** O robô não deve baixar o consolidado do estado. Em vez disso, ele deve:
   - Aguardar o carregamento do `<select>` de municípios.
   - Extrair uma lista com o texto de todas as tags `<option>` disponíveis nesse select (ignorando a opção "Todos" ou "Selecione").
   - Fazer um laço de repetição (`for` loop): para cada município da lista, selecionar a opção no dropdown, clicar no botão de exportação, interceptar o download e salvar o arquivo no `TEMP_DIR`.
2. **Transformação em Lote (Pandas):** O script Python deve ler todos os dezenas/centenas de arquivos baixados na pasta `TEMP_DIR`, concatená-los usando `pd.concat()` em um único DataFrame gigante e, em seguida, aplicar as regras de limpeza, cálculo de variação mensal (agrupado por cidade) e exportação.

## 5. Instruções para o Agente
1. Leia a atualização de escala estadual no @scraper_spec.md.
2. Refatore o `scraper.py` para remover a trava que limitava a extração apenas a São Paulo e Cotia.
3. Atualize a função de normalização de texto para tratar dinamicamente o nome de qualquer município do estado que apareça na planilha baixada.
4. Mantenha o cálculo de `variacao_mensal` agrupado por `["municipio", "tipo_crime"]` para que a variação percentual seja calculada corretamente e isolada dentro de cada cidade.