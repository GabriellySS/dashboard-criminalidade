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

## 4. Fluxo de Automação Real (Playwright)
1. **Navegação Inicial:** O robô deve inicializar o Chromium via Playwright (configurado temporariamente com `headless=False` para permitir auditoria visual durante o desenvolvimento).
2. **Acesso e Espera:** Acessar o URL `https://www.ssp.sp.gov.br/estatistica/dados-mensais`. Aguardar até que os seletores principais de filtros (dropdowns de ano e região/município) estejam totalmente carregados no DOM (`page.wait_for_selector`).
3. **Interação Condicional:** O robô deve interagir sequencialmente com os elementos seletores do formulário para garantir que o estado da página (ViewState/Session) seja atualizado antes de disparar o download.
4. **Interceptação de Download:** Utilizar o gerenciador de contexto `with page.expect_download() as download_info:` associado ao clique no elemento de exportação para Excel.
5. **Tratamento de Falhas (Sem Fallback Fake):** Remover a geração de planilhas simuladas por sementes aleatórias. Se o download falhar, o script deve lançar uma exceção clara detalhando qual elemento ou timeout causou a falha, garantindo previsibilidade.

## 5. Instruções para o Agente
1. Leia a nova estratégia de automação detalhada na seção 4 do @scraper_spec.md.
2. Modifique o arquivo `scraper.py` para mudar o parâmetro de inicialização do browser para `headless=False` para podermos auditar visualmente se ele está alcançando a página correta.
3. Remova completamente a função `generate_simulated_excel` e o seu bloco de execução dentro do `except`. Queremos que o script falhe explicitamente se não conseguir baixar os dados oficiais, eliminando o mascaramento de falsos positivos.
4. Refatore a função `scrape_with_playwright` para aprimorar os seletores de clique com base na estrutura real da página, adicionando tempos de espera explícitos (`page.wait_for_timeout` ou `wait_for_load_state`) entre as interações.