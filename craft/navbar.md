# Navbar — LifeLog Craft Rule

**Severity: BLOCKER.** Violations of these rules are rejected by the user.

## The Rule
- **NO hamburger menu.** Period. On any breakpoint.
- `flex-wrap: nowrap` on ALL breakpoints (default, ≤768px, ≤480px).
- `flex-direction: row` on ALL breakpoints — NEVER `column`.
- When links don't fit: `overflow-x: auto` on `.navbar-inner` and `.navbar-links`.

## Layout
```
[📖 LifeLog · Samuel] | [Início] [📚 Arquivo] [ℹ️ Sobre] [🚀 Portfólio] [🌙🎨PT]
└── navbar-logo ──────└── navbar-links (flex-wrap: nowrap) ─────────────────────────
```

## Allowed elements in navbar-links
`Início`, `📚 Arquivo`, `ℹ️ Sobre`, `🚀 Portfólio` (target _blank), PalettePicker (theme rail).

## Responsive
- **≤768px:** `.navbar-brand-name` hidden (`display: none`)
- **≤480px:** `overflow-x: auto` on both inner containers
- Theme rail elements: `flex-shrink: 0` at all sizes
