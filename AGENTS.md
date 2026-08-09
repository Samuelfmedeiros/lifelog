# 📖 LifeLog — Session Hub

> Blog pessoal estilo devlog — documentando a jornada de Samuel Medeiros
>
> **Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Playwright
> **Live:** https://lifelog-sepia.vercel.app
> **Status:** ✅ Operacional — 52 posts bilíngues (104 MDX) · 7 E2E specs · 200 testes · i18n PT/EN
> **Pipeline:** 📖 Narrative-First (desde 24/07) — auto-post diário desativado

---

## Sessão 2026-08-09 — 📝 Post Arachne: "O lock que nasceu no loop errado"
- **Post publicado (PT+EN)**: `arachne-o-lock-que-nasceu-no-loop-errado` (d54313f) — fix 457326e do Arachne: `_lock = asyncio.Lock()` no import preso ao loop do processo → workflow via threadpool dava RuntimeError "bound to a different event loop" + "browser agent não disponível neste worker" (intermitente 08-09/08). Fix: lazy init `_get_lock()` dentro do loop corrente (+16/-3, 2 usos).
- **⚠️ Bug cron one-shot release**: `LifeLog Release Posts 09/08` (a702b4b62614) criado com o argumento da data DENTRO do campo script (`lifelog-release-posts.py 2026-08-09`) → "Script not found". O script correto é `lifelog-release-posts.py` e a data vai no prompt. Post do dia publicado manualmente.
- **Crons de preview (1ff5884c8cfa + b2357e8e636b) estão PAUSADOS** (disabled) — sem preview automático desde 08/08 12:00.

---

## Sessão 2026-08-07 — 📝 Posts agendados (DRAFT) + posts novos PT/EN + Bug Hunter fix
- **Posts agendados 08-09/08 como DRAFT**: arachne pool de conexões (12h), capivara dashboard 994→262 (16h), tatuengine punição v3, descobertas i18n audit — não aparecem no site até publicar
- **Posts 08/08 adiantados**: arachne pool + capivara dashboard, PT+EN, pubDate 08/08 (0570258)
- **Posts novos publicados**:
  - `dogwalk-o-websocket-que-nao-apertava-a-mao` (PT+EN) — receive_text sem accept(), 5 endpoints mudos, fix 1 linha (45bd609)
  - `lifelog-a-saga-da-animacao-de-tema` (PT+EN) — 5 dias de whodunit CSS: stutter, origem errada, blend plus-lighter, node_modules fantasma (8b404c7)
- **fix(bug-hunter)**: remove rotas /tags inexistentes + valida status HTTP real (7a8f203)
- 6 commits · push origin OK · HEAD: `b813657`

---

## Sessão 2026-08-06 — 🚀 PWA + Perf mobile + VT fix + Bug Hunter
- **PWA completo**: service worker (cache-first assets, network-first posts, offline fallback), manifest com ícones 192/512 roxo LifeLog, apple-touch-icon, registro inline no BaseLayout
- **Perf mobile**: Android — 100dvh fixa toolbar flutuante, will-change:background-image pra GPU composite sem repaint
- **VT fix**: isolation:isolate no image-pair — sem isso o blend plus-lighter do Chromium vaza entre old/new
- **Bug Hunter LifeLog**: auditoria de render real (8 rotas PT/EN) — verificou que conteúdo SPA montou
- **Post**: descobertas-o-node-modules-fantasma (PT+EN) — o node_modules de 253MB na home que sequestrava builds Node do WSL
- HEAD: 734d81b · 6 commits · push origin OK

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
- [x] PWA (service worker + offline) — 06/08/2026
- [ ] Mais paletas de cor
- [x] Busca full-text — embedded search index no build (22/07/2026)

---

- **4 commits** · push origin OK · HEAD: `2f880ce`

- **Post PT+EN**: tatuengine-seguranca-como-processo — politica de seguranca continua
- **Restaurado CSS VT**: identico ao bf98eff (animation:none + mix-blend-mode:normal) — sem animation:none o crossfade VT apaga o old snapshot
- **VT animation fix**: stutter + origem errada do circulo resolvidos (remove animation:none dos pseudos, restaura isolation:isolate, reset lastTouchX/Y pos-animacao)

## Sessao 2026-08-05 — Theme animation fix + Post seguranca
*Última atualização: 2026-08-05 · Fim de dia — VT fix + post tatuengine segurança*

---

## 🛡️ REGRA DE SEGURANÇA CONTÍNUA (04/08/2026)

> **"Segurança é acompanhamento."** — Samuel

- **A cada entrega:** `pnpm audit` + verificar headers no `vercel.json` + integridade do lockfile
- **Semanalmente:** revisar `docs/SEGURANCA.md` + atualizar inventário
- **Mensalmente:** revisar dependências (atualizar Astro, Tailwind, plugins)
- **Ao adicionar feature:** reavaliar superfície de ataque
- **Referências:** OWASP Top 10:2025, HttpArmor, OWASP Web Checklist
- **Cron:** `LifeLog Security Watchdog` (diário, 24h, silent unless issues)
- **Doc completo:** `docs/SEGURANCA.md`
