# Theme Transition — LifeLog Craft Rule

## Circular Reveal via View Transition API

### Implementation (source of truth)
See `src/components/PalettePicker.astro` → `toggleTheme()`.

### CSS (global.css)
```css
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;  /* desliga crossfade padrão */
}
::view-transition-old(root) { z-index: 1; }
::view-transition-new(root) { z-index: 9999; }
```

### Key parameters
- Duration: 800ms
- Easing: `cubic-bezier(.2,.8,.2,1)` — começa devagar, acelera, termina suave
- Origin: click coordinates → touch coordinates → viewport center
- Clip-path: circle expanding from origin to full radius
- `animation: none` em AMBOS old/new — sem crossfade padrão competindo

### ⚠️ CRÍTICO — Stutter no clip-path

**A crossfade padrão do VT (opacity 0→1, ~250ms) RODA EM PARALELO com o WAAPI clip-path (800ms).** Ela termina muito antes, e o resto da animação clip-path fica sem mudança visual — parece que "travou no meio".

**CORREÇÃO:** `animation: none` em `::view-transition-new(root)` também. Baseado em Rjk-Jami/theme_changing_template (produção, Next.js + View Transitions + circular reveal).

### Pitfalls
- ❌ Manter crossfade padrão + clip-path juntos = trava no meio
- ❌ Usar `||` em vez de `??` (clientX=0 é válido)
- ✅ `animation: none` em old E new — depois WAAPI animate() roda sozinha

### Language switch
- Direct navigation ONLY (`window.location.href = newPath`)
- NO View Transition, NO fade overlay (causes navbar layout shift)
- SessionStorage preserves scrollY + path across navigation
