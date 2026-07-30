# LifeLog

> Category: Blog / Personal
> A cosmic devlog — dark immersive with auroras, light minimal with solar glow. Personal blog documenting the engineering journey of Samuel Medeiros across multiple projects.

## Visual Theme & Atmosphere

**Dark mode (default):** "Cosmic terminal" — deep indigo-charcoal background (`#0a0a0f`) with color-shifting auroral glow per project. Background gradients evoke deep space with subtle SVG patterns per project theme. Particles float like distant stars.

**Light mode:** "Warm minimal" — off-white cream (`#f5f2eb`) with warm paper texture, solar radial glow in the upper right corner, and subtle grain via SVG feTurbulence. Cards are white with soft shadows.

Each project on the blog gets its own visual identity through CSS custom properties — accent color, background gradient, SVG pattern, and card animation.

## Color Palette & Roles

### Core tokens (dark / light)

| Token | Dark | Light |
|-------|------|-------|
| `--color-bg` | `#0a0a0f` | `#f5f2eb` |
| `--color-bg-card` | `#13131a` | `#ffffff` |
| `--color-text` | `#e1e4e8` | `#1a1a2e` |
| `--color-text-muted` | `#8b949e` | `#5a5a60` |
| `--color-border` | `#21262d` | `#e5e4df` |
| `--color-accent` | `#00d4ff` (cyan default) | `#7c3aed` (purple default) |
| `--color-glow` | `0 0 30px rgba(0,212,255,0.1)` | `0 4px 24px rgba(124,58,237,0.1)` |
| `--card-border` | `1px solid #21262d` | `1px solid #efeee9` |
| `--card-radius` | `16px` | `14px` |
| `--hover-scale` | `1.00` | `1.015` |

Never pure black (`#000`), never pure white (`#fff`) for backgrounds.

### 6 Dynamic Palettes (accent colors swapped at runtime)

Every palette has a dark variant (brighter/lighter) and a light variant (deeper/saturated):

| Palette | ID | Dark Accent | Light Accent | Particle (dark) |
|---------|----|-------------|--------------|-----------------|
| Purple | `purple` | `#a78bfa` | `#7c3aed` | `rgba(200,180,255,0.6)` |
| Cyan | `cyan` | `#22d3ee` | `#0891b2` | `rgba(150,230,255,0.6)` |
| Emerald | `emerald` | `#34d399` | `#059669` | `rgba(150,240,200,0.6)` |
| Amber | `amber` | `#fbbf24` | `#d97706` | `rgba(255,220,150,0.6)` |
| Rose | `rose` | `#fb7185` | `#e11d48` | `rgba(255,180,200,0.6)` |
| Blue | `blue` | `#60a5fa` | `#2563eb` | `rgba(160,200,255,0.6)` |

Aura gradients (radial) position dynamically per palette. Dark: nebula (`rgba(accent, 0.06)`). Light: sun glow (`rgba(accent, 0.04)`).

### Project-specific themes (data-project attribute)

Each project activates a distinct accent color, background gradient, SVG pattern, and card animation:

| Project | Accent | Pattern | Bg Gradient (dark) |
|---------|--------|---------|-------------------|
| Arachne | `#7c3aed` purple | `webs.svg` (spiderweb) | `linear-gradient(135deg, #0f0a1a → #1a0f2e)` |
| Dogwalk | `#22c55e` green | `paws.svg` | `linear-gradient(135deg, #0a1408 → #0f1f0d)` |
| Portfolio | `#00d4ff` cyan | `grid.svg` | `linear-gradient(135deg, #0a0e14 → #0d1520)` |
| Capivara | `#f59e0b` amber | `waves.svg` | `linear-gradient(135deg, #141008 → #1f180d)` |
| Estudos | `#3b82f6` blue | `notebook.svg` | `linear-gradient(135deg, #0a0e17 → #0d1525)` |
| Descobertas | `#38bdf8` sky | `sparkles.svg` | `linear-gradient(135deg, #140a12 → #1f0d1a)` |
| TatuEngine | `#14b8a6` teal | `wavefield.svg` | `linear-gradient(135deg, #0a1412 → #0d1f1a)` |
| Seguranca | `#ef4444` red | `shield.svg` | `linear-gradient(135deg, #0a0a0f → #1a0a0a)` |
| LifeLog | `#a855f7` purple | `scribble.svg` | `linear-gradient(135deg, #0a0a0f → #150a1a)` |
| Dev | `#848d97` gray | none | `linear-gradient(135deg, #0a0a0f → #101015)` |

### WCAG Contrast

- Body text on dark bg: `#e1e4e8` on `#0a0a0f` = 14.2:1 ✅
- Body text on light bg: `#1a1a2e` on `#f5f2eb` = 17.1:1 ✅
- Muted text on light bg: `#5a5a60` on `#f5f2eb` = 6.82:1 ✅ AA
- Placeholder text on light bg: `#a0a0a6` on `#f5f2eb` = 2.60:1 ❌ (intentionally subtle)
- Navbar links on light bg: `#5a5a60` on `rgba(255,255,255,0.82)` = 6.82:1 ✅

## Typography Rules

### Font Stack
- **Display / headings:** `'Inter', system-ui, sans-serif`
- **Body:** `'Inter', system-ui, sans-serif` — weight 400, line-height 1.7
- **Mono:** `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`

### Scale
12 · 14 · 16 · 20 · 24 · 32 · 48 · 64 (px)

### Usage per level
- **Hero title:** 3rem / 800 weight / 1.15 line-height (desktop); 2rem (tablet); 1.65rem (phone)
- **Post h1:** 2rem / 700 weight
- **Post h2:** 1.5rem / 600 weight
- **Post h3:** 1.25rem / 600 weight
- **Body:** 1rem / 400 weight / 1.8 line-height (post content)
- **Navbar:** 0.9375rem / 500 weight
- **Small / metadata:** 0.8125rem / 600 weight, uppercase, letter-spacing 0.05em (date separator)
- **Tags:** 0.75rem / 500 weight
- **Code inline:** 0.875em
- **Search hint kbd:** 0.625rem

### Mono usage
Code blocks (`<pre>`), inline code, and search hint keyboard shortcuts.

## Spacing

- **Base grid:** 4px
- **Spacing scale:** 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64 (px)
- **Card padding:** 1.75rem
- **Section spacing:** 80px top+bottom (desktop), 48px (tablet), 32px (phone)
- **Navbar inner padding:** 0 1.5rem
- **Filter section padding:** 1.25rem

## Navbar (Critical)

**This is the most important component. Rules are absolute.**

- **NO hamburger menu.** Samuel explicitly rejects it.
- Layout: `[📖 LifeLog · Samuel] | [Início] [📚 Arquivo] [ℹ️ Sobre] [🚀 Portfólio] [🌙🎨PT]`
- **NEVER `flex-wrap: wrap`** — `flex-wrap: nowrap` at ALL breakpoints.
- **NEVER `flex-direction: column`** — no stacking on phone.
- **ALWAYS `overflow-x: auto`** on phone when links don't fit.
- Logo: `📖 LifeLog · Samuel Medeiros` — brand separator (`·`), brand name in muted color.
- Glass background: `rgba(10,10,15,0.85)` dark, `rgba(255,255,255,0.82)` light + `backdrop-filter: blur(20px)`.
- Sticky top, z-index 50.

### Responsive breakpoints
- **Desktop (≥769px):** All inline, full text visible
- **Tablet (≤768px):** `.navbar-brand-name` hidden (`display:none`), controls 30×30px, dots 16px
- **Phone (≤480px):** `overflow-x: auto` on navbar-inner and navbar-links, dots 18px (touch-friendly), color dropdown anchored right

## Component Stylings

### PostCard
- Border-radius: 16px (dark) / 14px (light) — via `--card-radius`
- Background: `--color-bg-card`
- Border: `--card-border`
- Hover: glow up (`--color-glow`), scale (`--hover-scale`), accent top border gradient
- Entry animation: `cardFadeIn` 0.4s `cubic-bezier(0.16,1,0.3,1)` with staggered delay (`--card-index * 60ms`)
- Filter hide: `opacity: 0; transform: scale(0.95); pointer-events: none`

### FilterBar
- Glass background with backdrop-blur
- `flex-wrap: wrap` for pills (this is the only component that wraps)
- Search input: glass dark, white light, focus ring in accent
- Pills: round buttons with active state using accent color
- Color dropdown anchored `left: 50%; transform: translateX(-50%)` — mobile: `right: 0`

### PalettePicker (Theme Rail)
- Layout: `[🌙] [🎨 ▼dropdown] [PT]` — all `flex-shrink: 0`
- Buttons 34×34px (desktop), 30×30px (mobile)
- Color dots: 14px (desktop), 16px (mobile), 18px (phone ≤480px)
- Dropdown: glass/blur, opens **downward** (`top: calc(100% + 6px)`), `.drop-up` class when bottom edge <120px
- Theme toggle: View Transition API circular clip-path 600ms `cubic-bezier(0.34,1.56,0.64,1)`
- Language: direct navigation (NO VT/fade — prevents navbar layout shift)
- Non-negotiable: controls must be ALWAYS VISIBLE (no popover)

### TagCloud (Archive page)
- Pills with `color-mix(in srgb, var(--color-accent) 10%, transparent)` background
- Sorted by frequency, max 50 tags
- Links use `/?q=${tag}`

### TerminalWidget (About page)
- Interactive terminal simulating shell commands
- Glass styling consistent with dark/light themes
- On light: `box-shadow: 0 4px 24px rgba(0,0,0,0.06)`

## Corners & Elevation

| Element | Radius | Shadow |
|---------|--------|--------|
| PostCard | 16px / 14px (light) | `--card-shadow` |
| Buttons | 0.75rem | None (flat) |
| Search input | 0.875rem | Focus glow |
| Tags | 999px (pill) | Hover glow |
| Code blocks | 12px | None |
| Filter dropdown | 12px | Glass+blur |
| Navbar logo icon | 0.75rem | Border accent |

Elevation is subtle. Cards use `1px` borders, not heavy shadows. Only hover/focus states add glow.

## Motion

### Default easing
- **Spring / playful:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — theme toggle clip-path
- **Card entry:** `cubic-bezier(0.16, 1, 0.3, 1)` — fadeIn staggered
- **UI transitions:** `cubic-bezier(0.4, 0, 0.2, 1)` — hover states
- **Color transitions:** `0.3s ease` — global theme switches

### Theme transition (circular reveal)
- Uses View Transition API + WAAPI `animate()` with clip-path
- Duration: 600ms, spring easing
- Origin: click position → falls back to viewport center
- Debounced (`animating` flag)
- Light/dark via `data-theme` attribute on `<html>`
- `prefers-reduced-motion: reduce` skips all animation

### Card entry animations
- `cardFadeIn`: opacity 0→1, translateY(12px)→0, scale(0.98)→1
- Duration: 0.4s, spring easing
- Stagger delay: `--card-index * 60ms`
- Only on `prefers-reduced-motion: no-preference`

### Project-specific card animations
- Arachne: `spiderPulse` 6s (box-shadow glow oscillation)
- Dogwalk: `dogWaves` 4s (border-color oscillation)
- Portfolio: `circuitPulse` 5s (opacity oscillation)
- Capivara: `bubbleFloat` 3s (translateY -4px)
- TatuEngine: `wavePulse` 5s (border-color oscillation)
- Descobertas: `sparkle` 4s (box-shadow oscillation)

### Reduced motion
- `prefers-reduced-motion: reduce` → `animation: none !important` on all VT pseudo-elements
- No card entry animation
- Theme toggle: direct `setTheme()` without VT

## Responsive Behavior

- **Desktop (≥769px):** Full layout, 12-col grid feel, max-width 72rem
- **Tablet (≤768px):** Compact navbar, 30px controls, 16px dots, `brand-name` hidden
- **Phone (≤480px):** `overflow-x: auto` navbar, 18px dots, 30px controls (never smaller), dropdown right-anchored
- **Covers/banners:** `aspect-ratio: 21/9` → `16/9` on mobile
- **Prev/next nav:** `grid-cols-2` → `grid-cols-1` (stack vertical)
- **Fonts:** Hero 3rem → 2rem → 1.65rem
- **Partículas:** `opacity: 0.3` on mobile (performance)

## Accessibility
- ✅ WCAG AA for all text (except deliberately subtle placeholder)
- ✅ `:focus-visible` ring in accent color
- ✅ `prefers-reduced-motion` honored
- ✅ Scrollbar custom styled
- ✅ Selection color matches accent
- ✅ Skip navigation via semantic HTML structure
- ✅ Links underlined in content (underline on hover for navbar)

## Do's and Don'ts
- ✅ Let the cosmic gradient and patterns do the work
- ✅ One project accent per screen (controlled by `data-project`)
- ✅ Dark theme first, light as opt-in
- ✅ `color-mix()` for dynamic accent-based backgrounds
- ✅ All transitions on `background-color, color, border-color, box-shadow` — NEVER `all`
- ✅ Use `var()` for every color — NO hardcoded hex outside `:root`
- ✅ Class-name doubling (`.search-wrap.search-wrap`) to win specificity over Astro scoped CSS
- ❌ No hamburger menu on ANY breakpoint
- ❌ No `flex-wrap: wrap` on navbar — `nowrap` everywhere
- ❌ No `flex-direction: column` on navbar
- ❌ No View Transition / fade on language switch (causes navbar layout shift)
- ❌ No `transition: all` (breaks scroll reveal and hover animations)
- ❌ `--color-accent-soft` para bg de tags — opacidade varia por paleta, no light mode fica invisível. Usar `color-mix(in srgb, var(--accent) 12%, transparent)` que resolve no runtime independente do tema
- ❌ No light mode `feTurbulence` pattern noise (makes bg look grainy)
- ❌ No popover for theme controls (must be always visible)
- ❌ Do not invent hex values outside the palette

## Agent Prompt Guide
- Every render reads `DESIGN.md` + `design-system.css`. Reference tokens via `var(--name)`.
- Use `color-mix(in srgb, var(--color-accent) X%, transparent)` for dynamic accents.
- Light mode uses `[data-theme="light"]` scoping — always pair dark and light values.
- Theme rail controls must be visible, not hidden behind popovers.
- When in doubt, prefer the dark theme. It's the default and best-tested.
- Never add hamburger menus. Never wrap the navbar. These are hard rules.
