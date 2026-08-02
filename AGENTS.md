# 📖 LifeLog — Session Hub

> Blog pessoal estilo devlog — documentando a jornada de Samuel Medeiros
>
> **Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Playwright
> **Live:** https://lifelog-sepia.vercel.app
> **Status:** ✅ Operacional — 51 posts bilíngues (102 MDX) · 7 E2E specs · 200 testes · i18n PT/EN
> **Pipeline:** 📖 Narrative-First (desde 24/07) — auto-post diário desativado

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
- **51 posts bilíngues** (102 arquivos MDX: 51 PT + 51 EN) — projetos Arachne, Dogwalk, Capivara, Portfólio, TatuEngine + estudos + descobertas
- **i18n PT/EN** — Engine i18n custom, páginas espelhadas, sync checker no CI
- **Categorias:** 9 projetos registrados (`src/lib/projects.ts`) com cores, ícones e grupos
- **Capas AI** — Geração via Cloudflare Workers AI (FLUX.1 Schnell), script `scripts/generate_cover.py`
- **RSS Feed** + Sitemap XML

### Interface
- **Timeline grid** — Home com filtros por ano/projeto, DateSeparator
- **FilterBar** — Busca textual com embedded search index (JSON gerado no build via getCollection, embedado no HTML), URL params, result count
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
- **Testes:** 200 passando (165 E2E + 35 Vitest)
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
│   ├── content/posts/             # 51 posts bilíngues (PT + en/)
│   ├── components/                # 8 componentes Astro
│   │   ├── PostCard.astro         # Card da timeline (capa + info + tags)
│   │   ├── FilterBar.astro        # Busca + filtro ano/projeto (índice JSON embutido)
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
├── e2e/                           # 7 Playwright E2E specs
├── scripts/                       # Geração de capas, sync checker, demos
├── public/covers/                 # 61 capas AI (webp, 21:9)
├── .github/workflows/deploy.yml   # CI/CD Pipeline
├── astro.config.mjs               # Config Astro + Tailwind + MDX
└── package.json
```

---

## 🧪 Testes

- **Playwright E2E** (7 specs):
  - `lifelog.spec.ts` — Suite principal (51 posts bilíngues, filtros, RSS, 404, health)
  - `theme-rail.spec.ts` — Theme Rail seletor (getByLabel)
  - `record-demo.spec.ts` — Gravação de demo
  - `theme-mobile.spec.ts` — Tema no mobile (diagnóstico)
  - `a11y.spec.ts` — Acessibilidade axe-core (contraste WCAG + semântica)
  - `vrt.spec.ts` — Regressão visual (snapshots dark/light/mobile)
  - `security-headers.spec.ts` — DAST headers (produção)
- **Vitest:** 35 testes data-driven (`projects.test.ts`)

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

## 📖 Narrative-First Pipeline (desde 24/07/2026)

**Auto-post diário (cron `6d90ce`) foi DESATIVADO.** Posts de changelog agregado não existem mais.

### Regras

1. **Cada post é um capítulo** — Setup → Conflito → Resolução. Sem arco narrativo, não publica.
2. **Um projeto por post** — Nunca agregar 2+ projetos no mesmo post.
3. **Código real** — Extraído do repositório com `search_files`/`read_file`. Nada de memória.
4. **Métricas verificáveis** — Números de commits, testes, build time. Nunca inventados.
5. **PT + EN** — Sempre bilíngue. Manter `project` ID em português.

### Grade de Conteúdo (sugestão)

| Dia | Projeto | História |
|-----|---------|----------|
| Sex 24/07 | LifeLog | "De auto-post a narrativa" |
| Sáb 25/07 | Dogwalk | Saga CI/CD |
| Dom 26/07 | Arachne | Multi-engine fallback |
| Seg 27/07 | Capivara | Dashboard analytics |
| Ter 28/07 | Portfólio | Vue 3.5 rebuild |
| Qua 29/07 | TatuEngine | BitMamba 1B |
| Qui 30/07 | Descobertas | FTS5 + sqlite-vec |

A grade é sugestão — se surgir história melhor,优先. Samuel revisa antes de publicar.

### Template

Ver `docs/narrative-template.md` — estrutura de 6 blocos, frontmatter, TerminalWidget.

### Pipeline de Criação

1. Verificar grade → qual projeto hoje?
2. Pesquisar estado real (commits recentes, PRs, bugs, decisões)
3. Escrever rascunho seguindo template
4. Gerar capa (`python3 scripts/generate-cover.py <slug>`)
5. Build + verificar
6. Samuel revisa → publicar / editar / pular

---

## 🗺️ Próximos Passos

- [x] Vitest unit tests (componentes) — 35 testes data-driven (02/08/2026)
- [ ] PWA (service worker + offline)
- [ ] Mais paletas de cor
- [x] Busca full-text — embedded search index no build (22/07/2026)

---

*Última atualização: 2026-07-25 · Docs Maintenance Diário*
