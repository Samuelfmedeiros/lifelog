# 📖 LifeLog — Blog Pessoal de Samuel Medeiros

Dev · Projetos · Estudos · Descobertas

**Live:** https://lifelog-sepia.vercel.app
**Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Fuse.js · Playwright

---

## 🏗️ Arquitetura

```
lifelog/
├── src/
│   ├── content.config.ts          # Schema Zod: posts collection
│   ├── content/
│   │   ├── posts/                 # 23 MDX posts publicados
│   │   └── drafts/                # Rascunhos (.gitkeep)
│   ├── components/                # 6 componentes Astro
│   │   ├── PostCard.astro         # Card da timeline
│   │   ├── FilterBar.astro        # Busca + filtro ano/projeto
│   │   ├── DateSeparator.astro    # Divisor cronológico
│   │   ├── PalettePicker.astro    # Seletor de 6 paletas + dark/light
│   │   ├── ProjectIcon.astro      # Ícone + cor por projeto
│   │   └── TerminalWidget.astro   # Terminal interativo (Sobre)
│   ├── layouts/
│   │   └── BaseLayout.astro       # SEO, navbar, fontes, temas
│   ├── pages/
│   │   ├── index.astro            # Home — timeline grid + filtros
│   │   ├── arquivo.astro          # Arquivo agrupado por ano
│   │   ├── sobre.astro            # Sobre + TerminalWidget
│   │   ├── post/[slug].astro      # Post individual
│   │   └── rss.xml.ts             # Feed RSS
│   ├── lib/
│   │   └── palettes.ts            # 6 paletas de cor
│   └── styles/
│       ├── global.css             # Tailwind + globais
│       └── themes.css             # Dark/Light + temas por projeto
├── public/
│   ├── covers/                    # Capas AI (webp, 21:9)
│   └── patterns/                  # SVGs temáticos por projeto
├── scripts/
│   └── generate-cover.py          # Geração de capas via Cloudflare Worker
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

---

## 📡 Scripts

```bash
# Gerar capa AI para um post
python3 scripts/generate-cover.py <slug>

# Gerar capas para todos os posts sem capa
python3 scripts/generate-cover.py --all

# Listar posts sem capa
python3 scripts/generate-cover.py --list-missing
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
