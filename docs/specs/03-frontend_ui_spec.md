# Especificação: Frontend e UI (Flat Design System)

## 1. Visão Geral
Single Page Application (SPA) para exibição de estatísticas de segurança com Design System Flat (Flat 2.0).
* **Framework:** React com TypeScript (Vite).
* **Estilização:** CSS Modules e Variáveis Globais de CSS.
* **Ícones e Gráficos:** Lucide React e Recharts.

## 2. Design System Flat
### 2.1. Variáveis CSS (`src/styles/variables.css`)
Suporte nativo a temas Light e Dark com troca reativa.
* **Light Theme:** Fundo `#F8FAFC`, Superfície `#FFFFFF`, Borda `#E2E8F0`, Texto Slate 900 (`#0F172A`) / Slate 500 (`#64748B`) e Destaque Blue 500 (`#3B82F6`).
* **Dark Theme:** Fundo `#0F172A`, Superfície `#1E293B`, Borda `#334155`, Texto Slate 50 (`#F8FAFC`) / Slate 400 (`#94A3B8`) e Destaque Blue 400 (`#60A5FA`).
* **Estrutura:** Bordas com arredondamento sutil (`border-radius: 6px` a `12px`) e sombras sutis (`--shadow-subtle`).

## 3. Cartões de Resumo (Summary Cards)
* **Layout:** Horizontal (`row`, `gap: 1rem`) com ícone à esquerda e blocos de texto à direita.
* **Ícones:** Total (`BarChart` ou similares), Frequente (`AlertCircle`), Média (`Calendar`).
* **Badge de Porcentagem:** Dinâmica, comparando com período anterior. Apenas visível se existirem dados comparativos.

---

## 4. Política de Tratamento de Erros (P1 — implementado em `feat/frontend-p1-anos-erros`)

### 4.1 Princípio

Nenhum erro de API deve ser silencioso. Toda falha de rede ou resposta HTTP não-2xx
deve resultar em **feedback visual claro e acionável** para o usuário, substituindo os
`console.error` anteriores.

### 4.2 Arquitetura de Estados de Erro

Cada hook de data fetching expõe obrigatoriamente três campos:

```typescript
interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;  // mensagem técnica para exibição discreta
  refetch: () => void;          // dispara nova busca sem alterar filtros
}
```

#### Hooks implementados:
| Hook | Arquivo | Endpoint consumido |
|---|---|---|
| `useOcorrencias` | `src/hooks/useOcorrencias.ts` | `GET /api/ocorrencias` |
| `useAnosDisponiveis` | `src/hooks/useAnosDisponiveis.ts` | `GET /api/anos-disponiveis` |

### 4.3 Componente `<ErrorState />`

**Localização:** `src/components/ErrorState/`

Exibido quando `isError === true`. Alinhado ao Design System Flat:
- Anel de ícone `AlertTriangle` com `--color-danger` e `--color-danger-bg`
- Título e descrição amigáveis ao usuário (sem jargão técnico)
- Detalhe técnico discreto (mensagem HTTP, exibida como badge monoespaciada)
- Botão **"Tentar Novamente"** com ícone `RefreshCw` que dispara `refetch()`
  - Hover: ícone rotaciona 360° com animação CSS `spin`
  - Acessibilidade: `role="alert"`, `aria-live="assertive"`, `id="error-retry-btn"`

### 4.4 Cenários de erro cobertos

| Cenário | Onde exibido | Ação de retry |
|---|---|---|
| Falha ao carregar `/api/municipios` | Substitui toda a área de conteúdo | Rebusca municípios via `municipiosRetryKey` |
| Falha ao carregar `/api/ocorrencias` | Substitui a área de gráficos e charts | Chama `refetch()` do `useOcorrencias` |
| Falha ao carregar `/api/anos-disponiveis` | Silencioso — dropdown exibe só "Todos os Anos" | `isAnosError` disponível para exibição futura |

### 4.5 Regra de classificação de erros

```typescript
// Toda resposta HTTP não-2xx lança Error com código e statusText
if (!res.ok) {
  throw new Error(`Erro ${res.status}: ${res.statusText}`);
}
// Erros de rede (offline) são capturados pelo catch e propagados como errorMessage
```

---

## 5. Lista de Anos Dinâmica (P1 — implementado em `feat/frontend-p1-anos-erros`)

### 5.1 Problema anterior

O array `['2024', '2023', '2022', '2021']` estava hardcoded em `App.tsx` (linha 111).
Isso causaria divergência automática com o banco de dados a cada novo ano de dados ingerido.

### 5.2 Solução implementada

#### Backend — novo endpoint
```
GET /api/anos-disponiveis
```
- Retorna `DISTINCT o.ano` da tabela `ocorrencias`, ordenado `DESC`
- Cache TTL: 24 horas (mesmo TTL que `/api/municipios`, dado quase estático)
- Response: `[2024, 2023, 2022, 2021]` (array de inteiros)

#### Frontend — hook `useAnosDisponiveis`

```typescript
// src/hooks/useAnosDisponiveis.ts
const { anos, isLoading, isError, refetch } = useAnosDisponiveis();
```

- Chama o endpoint na montagem do componente
- Converte os inteiros para `string[]`
- Garante ordem decrescente via `.sort((a, b) => b - a)`
- Suporta tanto `number[]` direto quanto `{ anos: number[] }` como response
- Em caso de erro no endpoint, `anos` é `[]` e o filtro exibe apenas "Todos os Anos"

#### Integração no `App.tsx`

```typescript
const anosList = useMemo(() => {
  return isAnosError ? [] : anosDisponiveis; // nunca hardcoded
}, [anosDisponiveis, isAnosError]);
```

### 5.3 Comportamento do dropdown de Ano

| Situação | Opções exibidas |
|---|---|
| Endpoint respondeu com sucesso | "Todos os Anos" + anos em ordem decrescente |
| Endpoint em erro / lista vazia | "Todos os Anos" (único item) |
| Endpoint carregando | "Todos os Anos" (até os dados chegarem) |

---

## 6. Performance e UX: Loading States (P2 — implementado em `perf/frontend-p2-skeletons-usememo`)

### 6.1 Skeleton Loaders para CLS Zero
Todos os componentes visuais que dependem de dados remotos devem apresentar um estado visual de carregamento que simule as dimensões e o layout do conteúdo real. Isso zera o _Cumulative Layout Shift_ (CLS), garantindo que a página não "pule" quando os dados chegarem.

* **Diretriz:** Utilizar o componente base `<Skeleton />` (com `width`, `height` e `borderRadius` configuráveis) dentro das estruturas do layout do componente.
* Em componentes complexos como gráficos (`CrimeDistributionChart`), deve-se espelhar a estrutura de dados (por exemplo, um esqueleto para a lista de legendas e um esqueleto circular para o pie chart).
* **Dropdowns/Filtros:** Quando uma lista de filtros estiver sendo processada, exibir um pequeno `Skeleton` na respectiva área (Ex: Item UX-08 no campo "Mês").

### 6.2 Otimização de Performance (useMemo)
Todo processamento de dados pesado derivado da API deve ser estabilizado e minimizado:
* **Arrays Estáticos e Constantes:** Dicionários de formatação e arrays fixos devem sempre ser declarados em escopo de módulo (fora do componente) para não recriar a referência em cada render.
* **Agregação e Filtragem:** As rotinas de formatação e consolidação de dados (ex: `chartData` em gráficos complexos) devem ser sempre envelopadas rigorosamente com `useMemo`, especificando apenas as dependências mínimas necessárias. Isso evita que re-renders do React (como digitação em outro campo) provoquem recálculo de centenas/milhares de linhas de dados na memória.

### 6.3 Prevenção de Layout Shifts (Microcopy)
* **Diretriz:** Textos de dica, erro ou validação (microcopy) injetados dinamicamente abaixo de inputs devem utilizar posicionamento absoluto ou alinhamento flex-start no container pai para não causar desalinhamento dos campos adjacentes.
