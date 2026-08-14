# 📖 LifeLog — Samuel Medeiros' Personal Blog

Dev · Projects · Studies · Discoveries

**Live:** https://lifelog-sepia.vercel.app
**Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Fuse.js · Playwright

> 🌐 **English** · [🇧🇷 Português](README.pt-BR.md)

---

## 🏗️ Architecture

```
lifelog/
├── src/
│   ├── content.config.ts          # Zod schema: posts collection
│   ├── content/
│   │   ├── posts/                 # 80 bilingual posts (160 MDX: PT + en/)
│   │   └── drafts/                # Drafts (.gitkeep)
│   ├── components/                # 8 Astro components
│   │   ├── PostCard.astro         # Timeline card
│   │   ├── FilterBar.astro        # Search + year/project filter
│   │   ├── DateSeparator.astro    # Chronological divider
│   │   ├── PalettePicker.astro    # 6 palettes + dark/light selector
│   │   ├── ProjectIcon.astro      # Icon + color per project
│   │   ├── PostLayout.astro       # Shared post layout (cover, nav, related)
│   │   ├── TagCloud.astro         # Tag navigation with counts
│   │   └── TerminalWidget.astro   # Interactive terminal (About)
│   ├── layouts/
│   │   └── BaseLayout.astro       # SEO, navbar, fonts, themes, PWA
│   ├── pages/
│   │   ├── index.astro            # Home — timeline grid + filters
│   │   ├── arquivo.astro          # Archive grouped by year
│   │   ├── sobre.astro            # About + TerminalWidget
│   │   ├── post/[slug].astro      # Individual post
│   │   └── rss.xml.ts             # RSS feed + sitemap
│   ├── lib/
│   │   └── palettes.ts            # 6 color palettes
│   └── styles/
│       ├── global.css             # Tailwind + globals
│       └── themes.css             # Dark/Light + per-project themes
├── public/
│   ├── covers/                    # AI covers (webp, 21:9)
│   └── patterns/                  # Themed SVGs per project
├── scripts/
│   ├── generate-cover.py          # AI cover generation (Cloudflare Worker)
│   ├── check-lang-sync.py         # PT/EN sync checker
│   ├── cleanup-post.sh            # Post cleanup
│   └── ...                        # Capture/screenshot helpers
├── e2e/
│   └── lifelog.spec.ts            # Playwright E2E tests
├── .github/workflows/
│   └── deploy.yml                 # CI/CD: validate → build → test → deploy → health check
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 🎨 Themes per Project

Each post inherits a visual theme from the `project` frontmatter field:

| Project | Color | Emoji | Style | Pattern |
|---------|-------|-------|-------|---------|
| Arachne | Purple `#7c3aed` | 🕷️ | Cyberpunk hacker | Spider web |
| Dogwalk | Green `#22c55e` | 🐶 | Nature/tech | Paw prints |
| Portfólio | Cyan `#00d4ff` | 🚀 | Sci-fi ship | Grid/circuit |
| Capivara | Amber `#f59e0b` | 🐷 | Tropical/tech | Waves |
| TatuEngine | Teal `#14b8a6` | 🌊 | Wave/Physics | Wave field |
| Estudos | Blue `#3b82f6` | 📚 | Digital notebook | Line grid |
| Descobertas | Sky blue `#38bdf8` | 💡 | Discovery | Light bubbles |

### Frontmatter

```mdx
---
title: "Post Title"
description: "Summary..."
date: 2026-07-06
project: arachne        # Defines visual theme
tags: [busca, fts5]
cover: /covers/slug.webp # AI cover (or gradient fallback)
icon: 🕷️
---
```

---

## 🚀 Deploy & CI/CD

- **Platform:** Vercel (auto-deploy via GitHub)
- **URL:** https://lifelog-sepia.vercel.app
- **CI/CD:** GitHub Actions — push on main triggers:
  1. Project validation
  2. `pnpm install` + cache
  3. Astro type check
  4. `pnpm build`
  5. Preview server + Playwright E2E tests
  6. Vercel production deploy
  7. Health check (homepage, sitemap, RSS, pages, post)
  8. Telegram notification (success/failure)

---

## 🧪 Tests

```bash
pnpm test              # Playwright E2E (headless)
pnpm test:headed       # Playwright E2E (visible)
pnpm test:debug        # Playwright E2E (debug mode)
```

**200 tests passing** (165 E2E + 35 Vitest) · 7 E2E specs · PT/EN sync checker in CI

---

## 📡 Scripts

```bash
# Generate AI cover for a post
python3 scripts/generate-cover.py <slug>

# Generate covers for all posts missing one
python3 scripts/generate-cover.py --all

# List posts without a cover
python3 scripts/generate-cover.py --list-missing

# Check PT/EN sync
python3 scripts/check-lang-sync.py
```

---

## 🔧 Useful Commands

```bash
# Development
pnpm dev                # localhost:4321

# Build
pnpm build              # → dist/
pnpm preview            # Local preview

# Manual deploy
vercel deploy --prod --token $VERCEL_TOKEN
```

---

## 📝 License

Personal project — © 2026 Samuel Medeiros
