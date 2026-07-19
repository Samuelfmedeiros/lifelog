# Plano: Limpeza de Redundâncias no LifeLog

**Data:** 2026-07-19
**Status:** ⚡ Em execução

## Ordem de execução

### 1. 🔴 Remover `src/content/config.ts` (arquivo morto)
- `content.config.ts` é o novo (Astro 5+), `content/config.ts` é velho (Astro 4)
- Remover `content/config.ts` — o schema novo é o ativo

### 2. 🗑️ Remover lixo
- `src/content/posts/en/.hermes-tmp.*`

### 3. 🔴 Unificar paletas — 3 fontes → 1
- `src/lib/palettes.ts` é a fonte da verdade
- **BaseLayout.astro** inline (53-60): substituir para importar de palettes.ts. Mas como é inline `<script is:inline>`, não pode importar módulos. Vou manter o inline mas com comentário avisando.
- **PalettePicker.astro** inline JS (222-229): já importa de `palettes.ts` na parte Astro, mas no JS inline tem outra cópia. Vou fazer o JS inline usar a importação em vez de duplicar.

### 4. 🟡 Unificar PROJECT_ACCENTS
- FilterBar.astro (96-106): importar de `src/lib/projects.ts` em vez de ter inline

### 5. ⚪ Testes órfãos
- Remover `src/lib/i18n.test.js`, `src/lib/palettes.test.ts`, `src/lib/projects.test.ts`

### 6. ⚪ Páginas 404 — usar i18n
- 404.astro e en/404.astro — criar componente compartilhado ou usar i18n

### 7. 🟡 Post layout — compartilhar componente (baixa prioridade)
- `post/[slug].astro` e `en/post/[slug].astro` ~150 linhas duplicadas
