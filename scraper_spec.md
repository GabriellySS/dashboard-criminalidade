# Especificação: Pipeline de Dados SSP-SP (Extrator e Limpador)

## 1. Visão Geral
O objetivo deste script em Python é atuar como um pipeline de dados (ETL - Extract, Transform, Load). Ele deve processar dados brutos de criminalidade do estado de São Paulo e convertê-los no formato exato (JSON) que a aplicação frontend em React espera.

## 2. Stack Tecnológico
* **Linguagem:** Python 3.x
* **Bibliotecas Principais:** `pandas` (para manipulação de dados), `json` (para exportação).
* **Gerenciamento de Dependências:** `requirements.txt` ou `pip`.

## 3. Estrutura de Dados Esperada (O Alvo)
O script Python deve gerar um arquivo JSON final que siga *exatamente* esta estrutura de interface TypeScript consumida pelo React:
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

## 4. Regras de Transformação (Pandas)
1. **Normalização de Nomes:** Padronizar os nomes dos municípios (ex: "S. PAULO" para "São Paulo (Capital)") e dos crimes para bater com os filtros do frontend.
2. **Cálculo de Variação:** O script deve calcular matematicamente a `variacao_mensal` (porcentagem de aumento ou queda) comparando o mês atual da linha com o mês anterior do mesmo município e crime.
3. **Exportação:** O arquivo resultante deve salvar/sobrescrever os dados no caminho: `src/data/mockData.json` (ou um novo `realData.json` que conectaremos depois).

## 5. Instruções para o Agente
1. Leia esta especificação para entender o formato de saída desejado.
2. Crie um ambiente virtual Python (opcional, dependendo do setup) ou apenas o script ```scraper.py``` na raiz ou em uma pasta ```/scripts```.
3. Escreva o código Pandas que cria um DataFrame fictício (neste primeiro momento) com a complexidade real (dezenas de cidades, vários anos, variações reais calculadas) para testarmos a capacidade do script de gerar o JSON perfeito.
4. Após validar a geração do JSON, evoluiremos o script para fazer o download das planilhas reais via web scraping.