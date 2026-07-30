# Mobile First — LifeLog Craft Rule

## Breakpoints
| Name | Max-width | Key changes |
|------|-----------|-------------|
| Desktop | ≥769px | Full layout, 12-col, hero 3rem |
| Tablet | ≤768px | Brand name hidden, controls 30px, dots 16px |
| Phone | ≤480px | `overflow-x: auto` navbar, dots 18px, dropdown right |

## Hard rules
- NEVER `flex-direction: column` on navbar (even at 480px)
- NEVER `flex-wrap: wrap` on navbar or `.navbar-links`
- Theme rail buttons NEVER smaller than 30×30px
- Color dots NEVER smaller than 16px (≤480px: 18px for touch)
- Dropdown color: `right: 0` anchored on phone (avoids cut-off)
- Covers: `aspect-ratio: 21/9` → `16/9` on mobile
- Partículas: `opacity: 0.3` (performance)
- Prev/next: `grid-cols-2` → `grid-cols-1` on ≤768px

## Pitfall
- `pointer: coarse` is NOT used for touch detection. Use breakpoint sizes directly.
