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
3. **Cálculo Matemático:** Calcular a `variacao_mensal` (crescimento ou decréscimo percentual em relação ao mês anterior para a mesma cidade e crime).
4. **Exportação:** Salvar o resultado limpo no caminho `src/data/mockData.json`.

## 5. Instruções para o Agente
1. Leia esta especificação atualizada.
2. Certifique-se imediatamente de que a pasta `.venv/` está incluída no ficheiro `.gitignore` na raiz do projeto, para não poluir o repositório.
3. Atualize o ficheiro `requirements.txt` com as novas bibliotecas necessárias (`requests`, `beautifulsoup4`, `openpyxl`).
4. Refatore o ficheiro `scraper.py`. Implemente uma lógica real utilizando `requests` e `pandas` para procurar as tabelas de criminalidade.
5. Escreva uma função robusta de limpeza no Pandas para tratar cabeçalhos sujos, preencher valores nulos e calcular a variação percentual mensal.
6. O output final deve continuar a sobrescrever perfeitamente o ficheiro `src/data/mockData.json`.