# Theme Transition — LifeLog Craft Rule

## Circular Reveal via View Transition API

### Implementation (source of truth)
See `src/components/PalettePicker.astro` → `toggleTheme()`.

### Key parameters
- Duration: 600ms
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring)
- Origin: click coordinates → touch coordinates → viewport center
- Clip-path: circle expanding from origin to full radius

### DO NOT
- ❌ Add `animation: none !important` on VT pseudo-elements (causes stutter)
- ❌ Suppress crossfade (the default crossfade + clip-path together = smooth)
- ❌ Use `||` instead of `??` (clientX=0 is valid, `??` preserves it)

### Language switch
- Direct navigation ONLY (`window.location.href = newPath`)
- NO View Transition, NO fade overlay (causes navbar layout shift)
- SessionStorage preserves scrollY + path across navigation
