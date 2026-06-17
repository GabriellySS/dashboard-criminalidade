# Especificação: Lógica de Filtros e Cascata no Frontend

## 1. Filtragem Cruzada
A SPA utiliza regras complexas de filtragem cruzada e cascatas de dependências.

## 2. Cascata Geográfica (Região > Município)
* **Estado Inicial:** `regiaoSelecionada` ('Capital'), `municipioSelecionado` ('São Paulo (Capital)').
* O Combobox de Município é dependente do de Região.
* Fica desabilitado se a Região for "Todas".
* Quando uma Região é selecionada, o município assume o padrão "Todas as cidades", permitindo visualização agregada macro.

## 3. Cascata de Tipologia (Categoria > Tipo Específico)
* **Estado Inicial:** `categoriaSelecionada` ('Todas').
* O dropdown de Categoria precede o de Tipo de Crime.
* Selecionar Categoria altera as opções de Tipo para listar apenas crimes daquela macro-categoria.

## 4. Filtro de Ano e Mês
* Ano é listado em ordem decrescente.
* Mês padrão inicial: 'Todos'. O componente extrai dinamicamente a lista de meses únicos dos dados retornados.
* Quando o ano é nulo ou vazio, exibe a série histórica completa (todos os anos).

---

## 5. Combobox Virtualizado para Municípios (P2 — implementado em `feat/frontend-p2-combobox`)

### 5.1 Motivação

O filtro de Município usava um `<select>` HTML nativo. Com dados de todo o Brasil
(5.570 municípios), o `<select>` nativo tornaria o DOM inutilizável — o browser
renderiza todos os `<option>` simultaneamente, causando jank de UI e potencialmente
travando a thread principal por centenas de milissegundos.

### 5.2 Componente `<MunicipioCombobox>`

**Localização:** `src/components/Combobox/MunicipioCombobox.tsx`

#### Stack de bibliotecas

| Função | Biblioteca | Versão |
|---|---|---|
| Virtualização de lista | `@tanstack/react-virtual` | ^3.x |
| Lógica de debounce | `src/hooks/useDebounce.ts` | interno |
| Headless UI / estrutura | React puro (sem primitivos externos) | — |

**Por que `@tanstack/react-virtual` em vez de `react-window`?**
TanStack Virtual é tree-shakeable, não requer dimensões fixas no container pai
(usa `position: absolute` por item), suporta React 19 e tem API de hooks mais
ergonômica. `react-window` requer altura explícita no wrapper e é mais verboso.

#### Estratégia de virtualização

```
┌──────────────── dropdown (overflow: hidden) ─────────────────┐
│  [search input]                                               │
├───────────────────────────────────────────────────────────────┤
│  scroll container   max-height: 288px (~8 itens visíveis)     │
│ ┌─────────────── height total virtual (N × 36px) ──────────┐  │
│ │                                                           │  │
│ │  [renderizados no DOM: apenas itens visíveis + overscan=5]│  │
│ │                                                           │  │
│ └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

- Cada item tem `height: 36px` fixo e `position: absolute; top: vItem.start`.
- O container scroll tem `height = virtualizer.getTotalSize()` (altura "fantasma").
- O browser gerencia o scroll nativo; o virtualizer apenas calcula quais índices
  são visíveis e atualiza a lista renderizada na `requestAnimationFrame`.
- **DOM nodes ativos em qualquer momento:** `overscan (5) × 2 + viewport (~8) ≈ 18`
  — independentemente de quantos municípios existam na lista.

#### Busca fuzzy com debounce

```typescript
// Hook useDebounce — src/hooks/useDebounce.ts
const debouncedQuery = useDebounce(query, 200); // 200ms de espera

// Filtragem multi-token (todos os tokens devem estar presentes)
const filtered = useMemo(() => {
  const tokens = debouncedQuery.toLowerCase().split(/\s+/);
  return [TODAS_AS_CIDADES, ...options].filter((name) =>
    tokens.every((tok) => name.toLowerCase().includes(tok))
  );
}, [options, debouncedQuery]);
```

**Exemplos:**
- `"são jo"` → encontra "São José dos Campos", "São João da Boa Vista"
- `"camp sp"` → sem match (busca dentro do nome; não em UF — P3 futuro)

#### Navegação por teclado

| Tecla | Comportamento |
|---|---|
| `ArrowDown` | Move foco para o próximo item; virtualizer scrolla se necessário |
| `ArrowUp` | Move foco para o item anterior |
| `Enter` | Seleciona o item em foco |
| `Escape` | Fecha o dropdown sem alterar seleção |
| `Enter` / `ArrowDown` (campo fechado) | Abre o dropdown |

#### Acessibilidade (ARIA)

```html
<button role="combobox" aria-expanded="true" aria-controls="listId" aria-haspopup="listbox">
  São Paulo (Capital)
</button>
<div role="listbox">
  <div role="option" aria-selected="true">São Paulo (Capital)</div>
  ...
</div>
```

### 5.3 Regra de cascata preservada

O `<MunicipioCombobox>` recebe `disabled={regiaoSelecionada === 'Todas'}`:
- **Desabilitado:** cursor `not-allowed`, opacidade 45%, campo não interativo.
- **Habilitado:** abre o dropdown com a lista filtrada para a região selecionada.

A prop `disabled` também seta `aria-disabled="true"` e `disabled` no `<button>`
trigger, garantindo que leitores de tela anunciem o estado corretamente.

### 5.4 Integração no `FilterBar.tsx`

O `<select id="municipio-select">` foi substituído por:

```tsx
<MunicipioCombobox
  id="municipio-combobox"
  ariaLabel="Filtrar por Município"
  options={municipiosList}
  value={municipioSelecionado}
  onChange={setMunicipioSelecionado}
  disabled={isMunicipioDisabled}
/>
```

A interface (`FilterBarProps`) não foi alterada — os mesmos `municipiosList`,
`municipioSelecionado` e `setMunicipioSelecionado` são passados, garantindo
retrocompatibilidade total com o `App.tsx`.
