# Auditoria UX — FilterBar e Filtros em Cascata

> **Classificação:** Documento de UX Engineering
> **Autoria:** Análise Heurística — Staff Frontend Engineer
> **Data:** Junho de 2026
> **Referência:** [Heurísticas de Nielsen (NN/g)](https://www.nngroup.com/articles/ten-usability-heuristics/)
> **Tela analisada:** `FilterBar` — `src/components/FilterBar/FilterBar.tsx`

---

## 1. Contexto

A `FilterBar` é o componente de maior frequência de interação do dashboard. É o ponto
de entrada para qualquer análise — o usuário a usa antes de ler qualquer número.
Uma experiência ruim nela bloqueia o valor de todo o restante da interface.

Esta auditoria mapeia os problemas identificados contra as 10 Heurísticas de Nielsen
e propõe um backlog priorizado de melhorias com esforço e impacto estimados.

---

## 2. Estado Atual da Interface

```
┌──────────────────────────────────────────────────────────────────────┐
│  Região       Município        Categoria   Tipo de Crime  Ano    Mês  │
│  [Capital ▼]  [São Paulo(Cap…] [Todas ▼]   [Todos os ▼]  [▼]   [▼]  │
│                                                                       │
│  [🔽 Aplicar Filtros]                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Diagnóstico Heurístico

### 🔴 H1 — Visibilidade do Status do Sistema

> *O sistema deve sempre manter os usuários informados sobre o que está acontecendo.*

**Problema:** Não existe indicação consolidada de **quais filtros estão ativos e
diferentes do padrão**. Após selecionar Região + Município + Ano, a única evidência
são os textos truncados dentro de cada dropdown. O usuário tem que "lembrar" da
sua própria seleção — carga cognitiva desnecessária.

**Evidência:** O campo "Município" exibe "São Paulo (Cap…" — truncado — sem que o
usuário consiga ler o valor completo sem abrir o dropdown novamente.

**Solução proposta:** [UX-01] Chips de filtros ativos.

---

### 🔴 H3 — Controle e Liberdade do Usuário

> *Usuários escolhem funções do sistema por engano. Precisa de uma "saída de emergência" clara.*

**Problema:** Não existe botão de **"Limpar Filtros"**. Para resetar, o usuário precisa
alterar cada dropdown individualmente — 5 interações para voltar ao estado inicial.
Em análises exploratórias, isso é feito dezenas de vezes por sessão.

**Solução proposta:** [UX-02] Botão "Limpar Filtros" com contagem de filtros ativos.

---

### 🔴 H4 — Consistência e Padrões (dois sub-problemas)

> *Os usuários não deveriam ter que se perguntar se palavras, situações ou ações diferentes
> significam a mesma coisa.*

**Problema A — Posição do botão de ação primária:**
O botão "Aplicar Filtros" está no **canto esquerdo** do grid. O padrão ocidental de
leitura é esquerda → direita. O usuário percorre todos os dropdowns da esquerda para
a direita e precisaria retornar ao início para clicar na ação. Toda interface analítica
de referência (Looker, Metabase, Google Data Studio) posiciona a ação no **final do fluxo** (direita).

**Problema B — Comportamento ambíguo da busca:**
Os dados são rebuscados automaticamente via `useEffect` sempre que um filtro muda
(comportamento *eager*). O botão "Aplicar Filtros" sugere que a busca é *lazy*
(só ocorre ao clicar). Os dois modelos coexistem em conflito, violando a expectativa
criada pelo próprio label do botão.

**Decisão necessária:** escolher **um** dos dois modelos:
- **Eager (recomendado para dashboards):** remove o botão e mostra um spinner inline
  enquanto recarrega. Mais responsivo, feedback imediato.
- **Lazy (recomendado para consultas pesadas):** mantém o botão, mas para o
  `useEffect` de disparar automaticamente. Evita fetches desnecessários ao digitar.

**Solução proposta:** [UX-03] Definir modelo e aplicar consistentemente.

---

### 🔴 H10 — Ajuda a Reconhecer, Diagnosticar e Corrigir Erros

> *Mensagens de erro devem expressar o problema claramente.*

**Problema:** O filtro **"Tipo de Crime"** está permanentemente exibindo "Todos os
Crimes" e nunca muda — o backend não expõe `tipo_crime` na rota de ocorrências. O
usuário tenta interagir, não vê nenhuma mudança, e não recebe explicação alguma. É
uma funcionalidade quebrada silenciosamente visível.

**Solução proposta:** [UX-04] Ocultar ou desabilitar com tooltip explicativo
enquanto o backend não suportar o campo.

---

### 🟡 H5 — Prevenção de Erros

> *Mais cuidadoso que boas mensagens de erro é um design cuidadoso que previne que o
> problema ocorra em primeiro lugar.*

**Problema:** O Combobox de Município fica desabilitado quando "Todas as Regiões"
está selecionado, mas **não há explicação do porquê**. O usuário vê o campo acinzentado
e não entende a dependência hierárquica. Pode tentar interagir repetidamente.

**Solução proposta:** [UX-05] Microcopy condicional: `"Selecione uma Região primeiro"`.

---

### 🟡 H7 — Flexibilidade e Eficiência de Uso

> *Atalhos — não percebidos pelo usuário iniciante — podem acelerar a interação para
> o usuário especialista.*

**Problema:** Usuários recorrentes (analistas que usam o dashboard diariamente)
refazem as mesmas combinações de filtros repetidamente sem atalho. Além disso, o
estado atual dos filtros não é refletido na URL — o link `localhost:5173` não pode
ser compartilhado com um colega preservando o contexto da análise.

**Solução proposta:** [UX-06] Deep linking — serializar filtros ativos na query string
da URL (`?regiao=Capital&municipio=São+Paulo&ano=2024`).

---

### 🟡 H8 — Design Estético e Minimalista

> *As interfaces não devem conter informações irrelevantes ou raramente necessárias.*

**Problema:** Com 6 dropdowns + 1 botão no mesmo grid sem separação semântica, a
FilterBar é visualmente densa. Os filtros de natureza diferente (geográficos vs.
tipológicos vs. temporais) têm o mesmo peso visual.

**Solução proposta:** [UX-07] Agrupamento semântico com separadores visuais sutis.

```
[ Região ] [ Município ]  │  [ Categoria ] [ Tipo ]  │  [ Ano ] [ Mês ]
      GEOGRAFIA                  TIPOLOGIA                 PERÍODO
```

---

### 🟢 H6 — Reconhecer ao invés de Lembrar

**Problema menor:** O dropdown de Mês fica populado com apenas "Todos os Meses"
durante o carregamento dos dados (as opções de mês são derivadas dos registros
retornados). Não há indicação de que o estado é temporário.

**Solução proposta:** [UX-08] Skeleton/spinner no dropdown de Mês durante `isLoading`.

---

## 4. Backlog Priorizado de Melhorias

| ID | Heurística | Problema | Esforço | Impacto | Status |
|---|---|---|---|---|---|
| UX-01 | H1 | Chips de filtros ativos com remoção individual (`×`) | Médio (4h) | Alto | ⏳ Pendente |
| UX-02 | H3 | Botão "Limpar Filtros" com contagem `(N)` | Baixo (1h) | Alto | ⏳ Pendente |
| UX-03 | H4 | Definir modelo eager vs. lazy + mover botão para direita | Baixo (1h) | Alto | ⏳ Pendente |
| UX-04 | H10 | Ocultar "Tipo de Crime" até backend suportar | Baixo (30min) | Médio | ⏳ Pendente |
| UX-05 | H5 | Microcopy no Município desabilitado | Baixo (30min) | Médio | ⏳ Pendente |
| UX-06 | H7 | Deep linking — filtros na query string da URL | Médio (1 dia) | Alto | ⏳ Pendente |
| UX-07 | H8 | Agrupamento semântico com separadores visuais | Baixo (2h) | Médio | ⏳ Pendente |
| UX-08 | H6 | Skeleton no dropdown de Mês durante loading | Baixo (30min) | Baixo | ⏳ Pendente |

---

## 5. Proposta de Redesign Visual (Wireframe Textual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ── GEOGRAFIA ──────────────────  ── TIPOLOGIA ─────  ── PERÍODO ─────────  │
│  [ Região ▼ ]  [ Município 🔍 ]   [ Categoria ▼ ]     [ Ano ▼ ]  [ Mês ▼ ] │
│                                                                              │
│  Filtros ativos: [× Capital] [× São Paulo] [× 2024]    [Limpar (3)]  [▶ →] │
└─────────────────────────────────────────────────────────────────────────────┘
                                                               ↑ botão no fim
```

**Mudanças em relação ao estado atual:**
1. Separadores semânticos com label de grupo (H8)
2. Chips de filtros ativos abaixo dos dropdowns (H1)
3. "Limpar (3)" no final da linha de chips (H3)
4. Botão de ação no canto direito (H4-A)
5. "Tipo de Crime" removido da visão padrão (H10)

---

## 6. Quick Wins (implementar primeiro)

Os itens UX-02, UX-03, UX-04 e UX-05 somados representam **~3 horas de trabalho**
e eliminam os 4 problemas de maior fricção visível do usuário.

Recomendação de ordem de execução:
1. **UX-04** — remover "Tipo de Crime" *(30 min, impacto imediato)*
2. **UX-05** — microcopy no Município disabled *(30 min)*
3. **UX-03** — mover botão para direita e definir modelo eager *(1h)*
4. **UX-02** — adicionar "Limpar Filtros" *(1h)*
5. **UX-01** — chips de filtros ativos *(4h — maior impacto percebido)*
6. **UX-07** — agrupamento semântico *(2h)*
7. **UX-06** — deep linking via URL *(1 dia — maior valor para usuários avançados)*
