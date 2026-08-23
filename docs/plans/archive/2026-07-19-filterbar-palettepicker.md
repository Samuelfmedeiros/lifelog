# Plano: FilterBar + PalettePicker — Melhorias

**Data:** 2026-07-19
**Projeto:** Lifelog
**Hash:** b279f2f (trabalho local)

## Problemas

1. **PalettePicker:** Dropdown do seletor de cor "fica de fundo" — `color-mix()` sem fallback sólido em browsers que não suportam
2. **FilterBar:** Fuse.js importado mas nunca usado (dead code). Search faz só `string.includes`. Sem URL state, sem tags clicáveis, sem result count, sem animação

## Implementado

### PalettePicker.astro
- Adicionado `background: var(--color-bg)` como fallback sólido ANTES do `background: color-mix(...)` — browsers sem suporte a `color-mix()` caem pro sólido
- `color-mix` opacity ajustada de 95% → 92% pro dropdown ficar levemente mais visível
- `box-shadow: 0 0 8px color-mix(...)` no `.rail-palette-indicator` pra dar glow sutil no dot ativo

### FilterBar.astro
- **Fuse.js conectado** — `fuzzySearch()` agora cria Fuse instance fresca cada vez (sem cache que causava dados stale) e é chamada com debounce 150ms no input
- **Combined filters** — `fuzzySearch()` primeiro filtra por project+year, depois aplica Fuse.js no subset. Correto semanticamente, ao contrário do código anterior que só buscava em posts já visíveis
- **`filterPosts()` simplificado** — agora só filtra por project+year (search vai pro `fuzzySearch`). Usa `classList.toggle('filter-hidden')` pra preparar animação futura
- **`updateGroupVisibility()`** — extraído do `filterPosts()`, reutilizado por `fuzzySearch()` e `filterPosts()`
- **Result count** — `updateResultCount()` mostra "X de Y" quando qualquer filtro ativo, fade in via classe `.visible`
- **Clear button** — × no search-wrap, aparece só quando tem texto, limpa tudo e foca no input
- **URL sync** — `syncURL()` + `readURLParams()`: params `?q=`, `?project=`, `?year=` no URL. `readURLParams()` no init restaura estado. `syncURL()` no Escape, clear, e pill clicks
- **Tag click delegation** — `document.addEventListener('click', ...)` detecta `.post-card .tag`, seta search input + dispara `fuzzySearch`. Zero mudança no PostCard.astro
- **MutationObserver corrigido** — preserva busca ativa quando DOM muda (se `activeSearch >= 2`, chama `fuzzySearch` em vez de `filterPosts`)
- **Dead code removido** — `fusePromise` + `getFuse()` removidos (substituídos por import direto + new Fuse dentro de `fuzzySearch`)
- **CSS novos:** `.result-count`, `.search-clear`, `.post-card.filter-hidden` (preparado pra animação futura)

## Build
- ✅ 75 páginas, 4.5s
- ✅ 29/29 testes Vitest

## Resultado
- Search agora usa Fuse.js fuzzy matching de verdade (threshold 0.4, distância 100)
- Tags clicáveis disparam busca sem precisar modificar PostCard
- Estado persiste em URL params — refresh não perde filtro
- Seletor de cor com fallback sólido pra mobile/browsers antigos
