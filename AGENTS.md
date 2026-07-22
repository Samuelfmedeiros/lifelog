# 📖 LifeLog — Session Hub

> Blog pessoal estilo devlog — documentando a jornada de Samuel Medeiros
>
> **Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Fuse.js 7 · Playwright
> **Live:** https://lifelog-sepia.vercel.app
> **Status:** ✅ Operacional — 70 posts · 5 E2E specs · i18n PT/EN

---

## 📋 Documentação Rápida

| Documento | Pra quê |
|-----------|---------|
| [README.md](README.md) | Visão geral, setup, arquitetura |
| [LIFELOG_MAP.md](LIFELOG_MAP.md) | Mapa completo — stack, pastas, schema, temas, CI/CD |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |
| `docs/OLD_STUFF.md` | Arquivo de docs antigos |

---

## ✅ Features Implementadas

### Conteúdo
- **70 posts MDX** — 5 projetos (Arachne, Dogwalk, Capivara, Portfólio, TatuEngine) + estudos + descobertas
- **i18n PT/EN** — Engine i18n custom, páginas espelhadas, sync checker no CI
- **Categorias:** 9 projetos registrados (`src/lib/projects.ts`) com cores, ícones e grupos
- **Capas AI** — Geração via Cloudflare Workers AI (FLUX.1 Schnell), script `scripts/generate_cover.py`
- **RSS Feed** + Sitemap XML

### Interface
- **Timeline grid** — Home com filtros por ano/projeto, DateSeparator
- **FilterBar** — Busca fuzzy com Fuse.js 7.4 (self-hosted /vendor/), URL params, result count
- **TagCloud** — Navegação por tags com contagem
- **PalettePicker** — 6 paletas de cor + dark/light toggle com persistência
- **TerminalWidget** — Terminal interativo na página Sobre (15+ comandos)
- **PostLayout** — Layout compartilhado com capa, navegação, posts relacionados
- **ProjectIcon** — Ícone + cor por projeto consistente

### Temas
- **6 paletas de cor** — Cada projeto com cor de destaque (accent) escura
- **Dark/Light** — Toggle com transição suave, persistência localStorage
- **Theme Rail** — Seletor lateral redesenhado com nomes+emojis
- **Cores inteligentes** — Dropdown de cores no mobile, animação fluida

### Performance & SEO
- **100% SSG** — Astro gera HTML estático, zero JS no build
- **Shiki syntax highlighting** — Dual theme (github-light + github-dark)
- **Responsivo** — Mobile-first, sem quebras no navbar

### CI/CD
- **GitHub Actions** (`deploy.yml`) — Validate → Build → Test → Deploy → Health check → Notify
- **Testes:** Playwright E2E (5 specs: lifelog, record-demo, theme-mobile, theme-rail)
- **Sync checker:** CI verifica sync PT/EN, health check inclui rotas EN
- **Deploy:** Vercel (build remoto, sem --prebuilt)
- **Ferramentas:** `pnpm` (Node 22+, corepack)

### Scripts
| Script | Função |
|--------|--------|
| `scripts/generate-cover.py` | Geração de capas via Cloudflare Workers AI |
| `scripts/check-lang-sync.py` | Verifica se posts PT/EN estão em sync |
| `scripts/cleanup-post.sh` | Limpeza de posts |
| `scripts/record-demo.{cjs,mjs}` | Gravação de demo E2E |
| `scripts/capture-*.mjs` | Captura de screenshots/video |

---

## 📁 Estrutura

```
lifelog/
├── src/
│   ├── content.config.ts          # Schema Zod: título, data, projeto, tags, capa
│   ├── content/posts/             # 70 MDX posts
│   ├── components/                # 8 componentes Astro
│   │   ├── PostCard.astro         # Card da timeline (capa + info + tags)
│   │   ├── FilterBar.astro        # Busca + filtro ano/projeto (Fuse.js)
│   │   ├── PostLayout.astro       # Layout compartilhado de posts
│   │   ├── PalettePicker.astro    # Seletor de 6 paletas + dark/light
│   │   ├── TagCloud.astro         # Nuvem de tags com contagem
│   │   ├── TerminalWidget.astro   # Terminal interativo
│   │   ├── ProjectIcon.astro      # Ícone + cor por projeto
│   │   └── DateSeparator.astro    # Divisor de data na timeline
│   ├── layouts/BaseLayout.astro   # Layout global (navbar, SEO, temas)
│   ├── pages/                     # index, arquivo, sobre, post/[slug]
│   │   ├── en/                    # Páginas em inglês (espelhadas)
│   │   ├── post/[slug].astro      # Post individual
│   │   ├── rss.xml.ts / sitemap.xml.ts
│   │   └── 404.astro
│   ├── lib/                       # i18n.js, palettes.ts, projects.ts
│   └── styles/                    # global.css, themes.css
├── e2e/                           # 5 Playwright E2E specs
├── scripts/                       # Geração de capas, sync checker, demos
├── public/covers/                 # 14+ capas AI (webp, 21:9)
├── .github/workflows/deploy.yml   # CI/CD Pipeline
├── astro.config.mjs               # Config Astro + Tailwind + MDX
└── package.json
```

---

## 🧪 Testes

- **Playwright E2E** (5 specs):
  - `lifelog.spec.ts` — Suite principal (33 posts → 70+)
  - `record-demo.spec.ts` — Gravação de demo
  - `theme-mobile.spec.ts` — Tema no mobile
  - `theme-rail.spec.ts` — Theme Rail seletor
- **CI:** Vitest com `passWithNoErrors` (sem testes unitários ainda)

---

## 🔧 Comandos

| Comando | Ação |
|---------|------|
| `pnpm dev` | Dev server local |
| `pnpm build` | Build SSG |
| `pnpm preview` | Preview do build |
| `pnpm astro` | CLI Astro |
| `pnpm test:e2e` | E2E tests (CI) |
| `pnpm exec playwright test` | E2E local |

---

## 🔗 Links

- **Live:** https://lifelog-sepia.vercel.app
- **GitHub:** https://github.com/Samuelfmedeiros/lifelog
- **Deploy:** Push na master → CI/CD → Vercel
- **Gerenciador:** pnpm 10+

---

## 🗺️ Próximos Passos

- [ ] Vitest unit tests (componentes)
- [ ] PWA (service worker + offline)
- [ ] Mais paletas de cor
- [ ] Busca full-text com Astro content layer

---

*Última atualização: 2026-07-21 · Docs Maintenance Diário*
