# 📖 LifeLog — Blog Pessoal de Samuel Medeiros

Dev · Projetos · Estudos · Descobertas

**Live:** https://lifelog-sepia.vercel.app
**Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Fuse.js · Playwright

> 🌐 [English](README.md) · 🇧🇷 **Português**

---

## 🏗️ Arquitetura

```
lifelog/
├── src/
│   ├── content.config.ts          # Schema Zod: posts collection
│   ├── content/
│   │   ├── posts/                 # 80 posts bilíngues (160 MDX: PT + en/)
│   │   └── drafts/                # Rascunhos (.gitkeep)
│   ├── components/                # 8 componentes Astro
│   │   ├── PostCard.astro         # Card da timeline
│   │   ├── FilterBar.astro        # Busca + filtro ano/projeto
│   │   ├── DateSeparator.astro    # Divisor cronológico
│   │   ├── PalettePicker.astro    # Seletor de 6 paletas + dark/light
│   │   ├── ProjectIcon.astro      # Ícone + cor por projeto
│   │   ├── PostLayout.astro       # Layout compartilhado de post (capa, nav, relacionados)
│   │   ├── TagCloud.astro         # Navegação por tags com contagem
│   │   └── TerminalWidget.astro   # Terminal interativo (Sobre)
│   ├── layouts/
│   │   └── BaseLayout.astro       # SEO, navbar, fontes, temas, PWA
│   ├── pages/
│   │   ├── index.astro            # Home — timeline grid + filtros
│   │   ├── arquivo.astro          # Arquivo agrupado por ano
│   │   ├── sobre.astro            # Sobre + TerminalWidget
│   │   ├── post/[slug].astro      # Post individual
│   │   └── rss.xml.ts             # Feed RSS + sitemap
│   ├── lib/
│   │   └── palettes.ts            # 6 paletas de cor
│   └── styles/
│       ├── global.css             # Tailwind + globais
│       └── themes.css             # Dark/Light + temas por projeto
├── public/
│   ├── covers/                    # Capas AI (webp, 21:9)
│   └── patterns/                  # SVGs temáticos por projeto
├── scripts/
│   ├── generate-cover.py          # Geração de capas via Cloudflare Worker
│   ├── check-lang-sync.py         # Verificador de sync PT/EN
│   ├── cleanup-post.sh            # Limpeza de posts
│   └── ...                        # Helpers de captura/screenshot
├── e2e/
│   └── lifelog.spec.ts            # Playwright E2E tests
├── .github/workflows/
│   └── deploy.yml                 # CI/CD: validate → build → test → deploy → health check
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 🎨 Temas por Projeto

Cada post herda tema visual do `project` no frontmatter:

| Projeto | Cor | Emoji | Estilo | Pattern |
|---------|-----|-------|--------|---------|
| Arachne | Roxo `#7c3aed` | 🕷️ | Cyberpunk hacker | Teia de aranha |
| Dogwalk | Verde `#22c55e` | 🐶 | Nature/tech | Pegadas |
| Portfólio | Ciano `#00d4ff` | 🚀 | Sci-fi nave | Grid/circuito |
| Capivara | Âmbar `#f59e0b` | 🐷 | Tropical/tech | Ondas |
| TatuEngine | Teal `#14b8a6` | 🌊 | Wave/Physics | Wave field |
| Estudos | Azul `#3b82f6` | 📚 | Caderno digital | Grid linhas |
| Descobertas | Azul céu `#38bdf8` | 💡 | Descoberta | Bolhas de luz |

### Frontmatter

```mdx
---
title: "Título do Post"
description: "Resumo..."
date: 2026-07-06
project: arachne        # Define o tema visual
tags: [busca, fts5]
cover: /covers/slug.webp # Capa AI (ou gradiente fallback)
icon: 🕷️
---
```

---

## 🚀 Deploy & CI/CD

- **Plataforma:** Vercel (auto-deploy via GitHub)
- **URL:** https://lifelog-sepia.vercel.app
- **CI/CD:** GitHub Actions — push no main dispara:
  1. Validação do projeto
  2. `pnpm install` + cache
  3. Astro type check
  4. `pnpm build`
  5. Preview server + E2E Playwright tests
  6. Deploy Vercel production
  7. Health check (homepage, sitemap, RSS, páginas, post)
  8. Notificação Telegram (sucesso/falha)

---

## 🧪 Testes

```bash
pnpm test              # Playwright E2E (headless)
pnpm test:headed       # Playwright E2E (visível)
pnpm test:debug        # Playwright E2E (debug mode)
```

**200 testes passando** (165 E2E + 35 Vitest) · 7 E2E specs · sync checker PT/EN no CI

---

## 📡 Scripts

```bash
# Gerar capa AI para um post
python3 scripts/generate-cover.py <slug>

# Gerar capas para todos os posts sem capa
python3 scripts/generate-cover.py --all

# Listar posts sem capa
python3 scripts/generate-cover.py --list-missing

# Verificar sync PT/EN
python3 scripts/check-lang-sync.py
```

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                # localhost:4321

# Build
pnpm build              # → dist/
pnpm preview            # Preview local

# Deploy manual
vercel deploy --prod --token $VERCEL_TOKEN
```

---

## 📝 Licença

Projeto pessoal — © 2026 Samuel Medeiros
