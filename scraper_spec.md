# Especificação: Pipeline de Dados SSP-SP (Extrator e Limpador)

## 1. Visão Geral
O objetivo deste script em Python (ETL) é extrair automaticamente os dados reais de criminalidade do portal da Secretaria de Segurança Pública de São Paulo (SSP-SP), limpar a formatação governamental e converter os dados para o formato JSON consumido pelo nosso frontend em React.

## 2. Stack Tecnológico e Ambiente
* **Linguagem:** Python 3.x
* **Ambiente Virtual:** O projeto obrigatoriamente utiliza um ambiente virtual local na diretoria `.venv`.
* **Bibliotecas Principais:** `requests`, `beautifulsoup4`, `pandas`, `openpyxl`.
* **Gestão de Dependências:** `requirements.txt`.

## 3. Estrutura de Dados Esperada (O Alvo)
O ficheiro final `src/data/mockData.json` deve conter a seguinte estrutura estrita:
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

## 4. Fluxo de Extração e Transformação (Scraping)
1. **Extração Bruta:** O script deve aceder aos dados da SSP-SP. (Para fins deste desenvolvimento, o script deve procurar tabelas HTML com os dados de ocorrências por município, ou fazer o download de uma folha de cálculo pública).
2. **Limpeza de Dados (Sanitização):**
   - Remover cabeçalhos duplos, linhas de totais em branco ou células fundidas (típico em folhas de cálculo do governo).
   - Eliminar acentos e padronizar os nomes dos municípios e dos crimes.
3. **Cálculo Matemático:** Calcular a ```variacao_mensal``` (crescimento ou decréscimo percentual em relação ao mês anterior para a mesma cidade e crime).
4. **Exportação:** Salvar o resultado limpo no caminho ```src/data/mockData.json```.

## 5. Instruções para o Agente
1. Leia esta especificação atualizada.
2. Atualize o ficheiro ```requirements.txt``` para incluir ```requests```, ```beautifulsoup4``` e ```openpyxl```.
3. Refatore o ficheiro ```scraper.py``` para substituir os dados fictícios por uma lógica real de web scraping utilizando ```requests``` e ```pandas```.
4. Devido à complexidade do site da SSP-SP (que pode usar Postbacks ASP.NET), caso a extração direta da página seja demasiado complexa para um script simples, crie a lógica para o script ler os dados a partir de um ficheiro CSV/Excel local (simulando o download manual) e fazer todo o tratamento ETL.