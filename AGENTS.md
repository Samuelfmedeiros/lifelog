# 📖 LifeLog — Session Hub

> Blog pessoal estilo devlog — documentando a jornada de Samuel Medeiros
>
> **Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Playwright
> **Live:** https://lifelog-sepia.vercel.app
> **Status:** ✅ Operacional — 52 posts bilíngues (104 MDX) · 7 E2E specs · 200 testes · i18n PT/EN
> **Pipeline:** 📖 Narrative-First (desde 24/07) — **2 posts/dia hidden às 09:00/09:30 → /ocultos** (ajuste 27/08; liberação manual do Samuel)

---

## 🔴 TEST-LOOP OBRIGATÓRIO ANTES DE QUALQUER ENTREGA (18/08 + v2 25/08/2026 — Samuel, GLOBAL)

Regra permanente em TODOS os projetos. Antes de declarar pronta/fazer deploy de QUALQUER
entrega (código, UI, pipeline, feature, fix), rodar SEMPRE o loop de testes com IA
(skill `ai-test-loop`):

1. **Builder = opencode CLI** (corrige gaps de programação; NUNCA avalia o próprio trabalho — v2 25/08)
2. **Testes reais** — unit + e2e + VRT do projeto (`test-loop-runner.py` ou o comando nativo)
3. **Critic determinístico separado** — nota 0-100 com evidência real, contexto fresco
4. **Reviewer opencode** — CONCORDO|DISCORDO (DISCORDO = reabrir loop) + nota revisor no PDF
5. **Evidência visual** — screenshots DESKTOP + MOBILE (Playwright/VLM), regra obrigatória
   para mudanças de visual
6. **Vídeo de aprovação** = entregue ao FINAL (mensagem única no grupo), nunca no meio
7. **Gate:** nota >= threshold (UI=100, código=85); nota < threshold → reavaliar e corrigir
   (máx 8 rodadas); nota documentada no relatório
8. **PDF relatório** SEMPRE anexado via MEDIA:<caminho> (ou sendDocument + message_id confirmado)

**ADICIONAR TESTES DE COMPLEMENTO:** se for preciso adicionar mais testes para melhorar
o projeto ou cobrir outras áreas (novas features, áreas não cobertas, regressões),
ISSO DEVE SER FEITO ANTES da entrega — nunca entregar deixando áreas sem cobertura quando
dá pra cobrir.

Sem evidência real (testes + screenshot + nota + PDF entregue) NÃO é entrega completa.

## Sessão 2026-08-28 — Recusar com nota no /ocultos + refazer pipeline
- **feat(ocultos)**: botão **Recusar** com textarea de nota em cada card — POST `/api/recusar` (`api/recusar.mjs`, commit `5560caf`)
- **feat(api)**: recusa persiste em 2 vias — GitHub Issue (label `refazer`) + arquivo `docs/recusas/<slug>.md` no repo; sanitização + rate limit 3/30s
- **feat(ops)**: watcher → **cron agente** `081b4d301432` "LifeLog Refazer Auto" (*/15, monitor_script `lifelog-recusas-watch.py` com estado persistente). Detecta recusa NOVA → **refaz sozinho** (PT+EN, capa, build, commit, push) → fecha issue → post de volta no /ocultos. Samuel não precisa avisar nada.
- **feat(ui)**: layout do /ocultos melhorado (botão Recusar + form de nota)
- **fix(pipeline)**: Post B de 28/08 não rodou — next_run bugou para 29/08 pós-mudança de schedule; disparado manualmente
- **refactor(posts)**: refaz Capivara (remove LEVE LAVANDA) e Segurança (mais abstrato) conforme recusa do Samuel — commit `3c18217`

## Sessão 2026-08-27 — Pipeline 09:00/09:30 (fluxo hidden de manhã)
- **feat(pipeline)**: crons 12h/16h → **09:00 (Post A) + 09:30 (Post B)** — os 2 posts do dia ficam hidden no /ocultos de manhã; Samuel libera no horário que quiser; Post B nunca repete o projeto do Post A
- **feat(post)**: Estudos — "quando a documentação virou conhecimento" (PT+EN, capa AI) liberado 27/08

- **release(post)**: liberados 27/08 — estudos/"quando a documentação virou conhecimento" (`4722285`/`2723469`) e arachne/"quando o scraper ficou acessível" (`43e3217`/`d7e8ec2`), capa AI
- **docs(agents)**: pipeline 09:00/09:30 documentado (`d6d94b2`) — 7 commits no dia · push origin OK · HEAD: `d6d94b2`
## Sessão 2026-08-25 (fim de dia) — Scrub histórico + rename slug espelho
- **security**: reconstrói histórico sem o commit que expunha stack defensiva — árvore final idêntica a main, force push (`6c9e720`); rename slug capivara-espelho-douglas → capivara-espelho-backup PT+EN (`e599155`)
- **qa**: registra audit bug-hunter 2026-08-25 — 6/6 rotas ok (`391d15c`)
- **docs**: consolida plano narrative-overhaul em OLD_STUFF (`cbaed96`)
- 4 commits no dia · push origin ⚠️ (verificar) · HEAD: `391d15c`

## Sessão 2026-08-23 (fim de dia) — Posts WCAG/Estudos liberados + gate de capas + fix ocultos

- **feat(post)**: 4 posts hidden PT+EN com capa AI — WCAG AA contraste (`514a4f6`), ternário (`0e882ed`), teoria de campo virou módulo (`7644d61`), semana que medi minha memória (`484e05d`)
- **release(post)**: liberados — descobertas-wcag-aa (`03bc614`/`9d95159`), ternário (`d061a6e`/`930748a`), semana memória (`ae3b6bf`/`fd1e862`), watchdog-descobriu-capas-falsas (`4b260f8`/`f464bdf`)
- **feat**: gate de capas no build — auto-fix quando possível, bloqueia post sem capa (`51cdc46`)
- **fix**: capa do post WCAG em WebP real (jpeg disfarçado não renderiza) (`f576283`); restaura capa original (`820240f`); linha cover no frontmatter (`b817195`, `3808f4e`); capa AI da semana-memória (`a0de538`)
- **fix(ocultos)**: libera par PT+EN sem erro duplicado — cards agrupados por post e API idempotente (`66054af`)
- **fix(a11y)**: contraste WCAG AA em todos os temas e paletas (`7fb83a8`)
- **docs**: consolida plans 07/19 implementados no OLD_STUFF (`498a05f`)
- 21 commits no dia · push origin OK · HEAD: `66054af`

## Sessão 2026-08-17 (fim de dia) — Posts maratona: Estudos (ondas) + Segurança (caça ativa) + hidden 308 skills
- **feat(posts)**: maratona — Estudos (ondas) e Segurança (caça ativa) completos PT+EN + capas AI (`b87963c`)
- **feat(post)**: estudos 308 skills e o hub de reuso (PT+EN, hidden) + capa AI (`1dd8b1d`)
- 2 commits · HEAD: `1dd8b1d`

## Sessão 2026-08-13 (fim de dia) — 📝 Posts Estudos/Segurança + saga animação + ProjectIcon sem emojis
- **feat(posts)**: Estudos e Segurança (PT+EN) — os 2 projetos mais carentes da grade (`dfe5d3a`) + timeline (`6a8378b`)
- **feat(post)**: desfecho da saga da animação — círculo expansivo no mobile (PT+EN, `1f8e8d9`) + timeline (`15f7b14`)
- **refactor**: remove TODOS os emojis da UI e posts — SVGs próprios por projeto (ProjectIcon) (`d59fd43`) + regenera 11 covers PIL sem tofu de emojis (`50a6b78`)
- **chore**: CI notificação Telegram com subject + arquivos alterados (`d373a53`) · remove script temp de video (`8373179`)
- **docs**: plano aprovado da maratona de posts 14-16/08 — grade fixa + conteúdo (`fe3b127`)
- 8 commits no dia · push origin OK · HEAD: `50a6b78`

## Sessão 2026-08-12 — 🔒 Scrub posts (caminhos internos + codec TatuEngine) + círculo expansivo mobile
- **fix(theme)**: círculo expansivo no mobile — revert crossfade 08a3d2d (pedido Samuel 12/08) (`37ed927`)
- **security(blog)**: remove caminhos internos (caminhos internos) de 12 posts PT+EN — Capivara, Portifolio, Descobertas, Lifelog, Hermes (`4a65623`)
- **security(blog)**: remove receita técnica do codec TatuEngine de 10 posts PT+EN — BlockLens, kernels CUDA, thresholds, commits; regra permanente na skill lifelog (`ab1d776`)
- **feat(posts)**: 3 posts 12/08 — Descobertas (GitHub 2GB/LFS + orphan branch), TatuEngine block-codec, Dogwalk backup mentiroso [pipeline] (`7f207f0`)
- **sec**: gitleaksignore — .astro/data-store.json e cache interno Astro (FP, P2) (`f402f79`)
- 6 commits no dia · push origin OK · HEAD: `37ed927`

## Sessão 2026-08-11 — Post k3s + 2 posts pipeline + revert Douglas PC

### 📝 Posts
- **feat(post)**: Arachne do Docker ao k3s (PT+EN) — decisão de usar Kubernetes de verdade, plano F0-F5, rollback (`146d60e`)
- **feat(posts)**: 2 posts 11/08 — 61 vulnerabilidades (Portifólio) + Douglas sumiu da subnet (Capivara) [pipeline] (`06cb903`)
- **revert(post)**: remove post do Douglas PC — não aprovado, nada sobre Samuel/Douglas PC (projeto errado) (`b8b5c96`)

### 🔒 Segurança
- gitleaks+bandit+opengrep scan (`889732c`)

- 6 commits no dia · push origin OK · HEAD: `146d60e`

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
- **Testes:** ? passando
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

## Sistema de Postagem Oculta (15/08/2026)

Posts com `hidden: true` no frontmatter vão para o ar (deploy) mas ficam **invisíveis no site** até liberação manual pelo dono.

### Como funciona

1. **Frontmatter**: `hidden: true` (schema em `src/content.config.ts`).
2. **Filtro global**: TODAS as páginas filtram `!p.data.draft && !p.data.hidden` — home, arquivo, sobre, RSS, sitemap, busca, prev/next e `getStaticPaths` (rota direta vira 404).
3. **Admin**: `/ocultos` (não linkada) lista posts ocultos, mostra o conteúdo e tem botão "Liberar".
4. **Liberação**: `api/liberar.mjs` (Vercel Function) flipa `hidden: true` → `false` no MDX via GitHub API e commita → CI roda → post aparece.
5. **Listagem**: `api/ocultos.mjs` lê o filesystem do deploy e retorna os ocultos (protegido por segredo).

### Env vars obrigatórias (Vercel)

- `ADMIN_SECRET` — segredo do /ocultos (Bearer no Authorization header).
- `GH_TOKEN` — token GitHub com permissão de escrita no repo (Contents API).

Sem `GH_TOKEN` a liberação responde 500 com mensagem clara; sem `ADMIN_SECRET` a listagem responde 401.

### Fluxo de uso

1. Pipeline cria post PT+EN com `hidden: true` → push → deploy (invisível).
2. Samuel abre `/ocultos`, entra com o segredo, lê o post.
3. Clica "Liberar" → commit com `hidden: false` → CI deploya → post público.

### Regras

- NUNCA linkar `/ocultos` na navbar ou em posts.
- CI health check pula posts com `draft: true` OU `hidden: true` (senão 404 derruba o deploy).
- Anti-emoji vale para a página admin também (0 emojis em `src/pages/ocultos.astro`).

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
