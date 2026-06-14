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

## 4. Fluxo de Automação (O Robô)
1. **Navegação (Playwright):** Iniciar um browser Chromium em modo headless. Aceder ao URL de estatísticas da SSP-SP.
2. **Interação:** Localizar e selecionar os dropdowns relevantes (ex: Ano, Município/Região) e clicar no botão de exportação (Excel/CSV).
3. **Interceção:** Aguardar o evento de download do ficheiro e guardá-lo temporariamente numa pasta local (ex: /`temp_data`).
4. **ETL (Pandas):** Ler o ficheiro descarregado. Aplicar as regras já desenvolvidas anteriormente: limpar cabeçalhos fundidos/duplos, padronizar nomes (sem acentos) e calcular a `variacao_mensal` matematicamente.
5. **Limpeza:** Eliminar o ficheiro temporário e exportar o JSON final para o caminho do React.

## 5. Instruções para o Agente
1. Leia o spec atualizado para a fase de automação total.
2. Atualize o `requirements.txt` incluindo `playwright`. (Lembre-se que o Playwright requer a execução de `playwright install` após a instalação do pacote).
3. Refatore o `scraper.py` integrando a API síncrona ou assíncrona do Playwright.
4. Como o layout exato da SSP-SP pode ser complexo, estruture o código do Playwright com blocos `try/except` robustos e utilize seletores genéricos ou simule o fluxo documentado na secção 4.
5. Mantenha intacta a função de limpeza e sanitização de dados (Pandas) que já foi validada no commit anterior, apenas conectando-a ao novo ficheiro descarregado pelo robô.