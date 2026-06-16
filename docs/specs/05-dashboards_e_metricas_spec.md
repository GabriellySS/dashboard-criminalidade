# Especificação: Gráficos, Dashboards e Métricas

## 1. Visão Geral de Default Filtering
O React carrega, por padrão, os dados agregados da série histórica completa de "São Paulo (Capital)". O dashboard é focado estritamente na visualização gráfica macro e evolução temporal.

## 2. Gráficos
### 2.1. CrimeDistributionChart (Rosca / Donut Chart)
* Exibe os Top 4 tipos de crimes baseados no volume.
* Os restantes são agrupados sob a fatia "Outros", fechando os 100%.
* Layout vertical.
* **Legendas Customizadas:** Bloco superior com a cor, número absoluto, porcentagem, e barra de progresso horizontal equivalente ao peso no total.
* **Rosca Físico:** Totalizador numérico no centro do gráfico.

### 2.2. Ocultação de Detalhamento Granular
A tabela de "Detalhamento de Ocorrências" foi removida para simplificar a interface e focar nos insights visuais.
