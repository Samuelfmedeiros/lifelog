# 📋 CHANGELOG — LifeLog

## [2026-09-03] — 3 posts novos (seguranca/tatuengine/capivara CI) + recusa->refazer + capas watchdog
- **feat(post)**: seguranca — a fila que ninguem atende, supply chain, hidden PT+EN + capa AI (`1702214`); releases (`377fe57`, `516b85c`)
- **feat(post)**: tatuengine — o-step-322, morte silenciosa + VRAM fantasma, hidden PT+EN, capa NIM (`57b86ef`); fix capa flatline issue #31 (`bff8035`); releases (`6fce316`, `c2ddc3f`)
- **feat(post)**: capivara — o-ci-que-morria-no-meio-do-step, CI self-hosted, hidden PT+EN (`3dd9933`) + capa watchdog (`5617ce4`); recusa com nota (`f86784d`) -> refaz com tema trocado p/ seguranca path traversal issue #32 (`67234de`)
- **chore(covers)**: regenera capas estudos (Worker FLUX) (`9567589`, `c41b79b`) + dogwalk/portfolio (watchdog) (`20866f5`, `79ac99b`, `9752717`)
- 19 commits no dia · push origin OK · HEAD: `67234de`




## [2026-08-30] — Posts yurumi + lm_head + portão de segurança (PT+EN, hidden) + capas AI
- **feat(post)**: yurumi — a memória que aprendeu a ser agente (PT+EN, hidden, capa AI) (`ae6b3d0`); projeto yurumi no schema + tema violeta + pattern brain (`692de59`); capa Gemini fiel ao personagem com cerrado de Brasília 16:9 (`217a625`); test 9→10 projetos (`486dafa`)
- **feat(post)**: tatuengine — o retorno do lm_head (PT+EN, hidden, capa AI) (`28cedc1`) + capa AI watchdog (`bbc1488`); seguranca — o portão que não deixa entregar (hidden, PT+EN) (`f9980d5`) + capa AI watchdog (`cd78f77`)
- **release(post)**: seguranca-o-portao-que-nao-deixa-entregar (`094db2f`, `b51ec92`) + tatuengine-o-retorno-do-lm-head (`81c30f6`, `2b4ea9f`) PT+EN
- **chore**: versiona finding bug-hunter audit-2026-08-30 (navigation timeouts transientes — rotas 200 em <1.5s) (`af41fc8`)
- 13 commits · push origin OK · HEAD: `486dafa`

## [2026-08-28] — Recusar com nota + refazer automático + posts liberados + pipeline 3/dia
- **feat(ocultos)**: botão Recusar com nota + persistência (GitHub Issue + docs/recusas/) + segurança (rate limit, sanitização) (`5560caf`); refazer automático (cron 081b4d301432) (`1600650`); fix layout mobile /ocultos — título largura total + botões linha própria (`d1c63f3`)
- **release(post)**: capivara — o painel que passou a ver o ecossistema inteiro (`c028195`, `b173337`, `ff18238`) + seguranca — sentinela do formulário (`791a2f4`, `8c85619`, `1a056b5`) PT+EN, capas AI
- **pipeline**: 3 posts/dia hidden (08:00/12:00/16:00) + seleção por carência (`8384718`)
- **chore**: gitleaks allowlist .astro/data-store.json (`371d6ba`)
- 17 commits · push origin OK · HEAD: `8384718`

## [2026-08-27] — Pipeline 09:00/09:30 + posts liberados (estudos, arachne a11y)
- **feat(pipeline)**: crons 12h/16h → 09:00 (Post A) + 09:30 (Post B), 2 posts/dia hidden no /ocultos p/ liberação manual
- **release(post)**: estudos — quando a documentação virou conhecimento (`4722285`/`2723469`) + arachne — 92 violações a zero: campanha a11y F1-F2c (`43e3217`/`d7e8ec2`), PT+EN, capa AI
- 7 commits · push origin OK · HEAD: `d6d94b2`

## [2026-08-25] — Scrub histórico + rename slug espelho

- **security**: reconstrói histórico sem o commit que expunha stack defensiva — árvore final idêntica a main, force push (`6c9e720`); rename slug capivara-espelho-douglas → capivara-espelho-backup PT+EN (`e599155`)
- **qa**: registra audit bug-hunter 2026-08-25 — 6/6 rotas ok (`391d15c`)
- **docs**: consolida plano narrative-overhaul em OLD_STUFF (`cbaed96`)

4 commits · push origin ⚠️ (verificar) · HEAD: `391d15c`
## [2026-08-23] — Posts WCAG/Estudos liberados + gate de capas + fix ocultos

- **feat(post)**: 4 posts hidden PT+EN com capa AI (WCAG AA contraste, ternário, teoria de campo, semana-memória)
- **release(post)**: liberados 4 posts PT+EN (descobertas-wcag-aa, ternário, semana-memória, watchdog-capas-falsas)
- **feat**: gate de capas no build — auto-fix quando possível, bloqueia post sem capa
- **fix**: capa WCAG em WebP real; restaura capa original; linha cover no frontmatter; fix(ocultos) libera par PT+EN idempotente
- **fix(a11y)**: contraste WCAG AA em todos os temas e paletas
- 21 commits · push origin OK · HEAD: `66054af`

## [2026-08-17] — Posts maratona (Estudos/Segurança) + hidden hub de reuso

- **feat(posts)**: maratona — Estudos (ondas) e Segurança (caça ativa) completos PT+EN + capas AI (`b87963c`)
- **feat(post)**: estudos 308 skills e o hub de reuso (PT+EN, hidden) + capa AI (`1dd8b1d`)
- 2 commits · HEAD: `1dd8b1d`

## [2026-08-13] — Posts Estudos/Segurança + saga animação + ProjectIcon sem emojis

### 📝 Posts
- **Estudos e Segurança (PT+EN)**: os 2 projetos mais carentes da grade (`dfe5d3a`)
- **Desfecho saga da animação**: círculo expansivo no mobile (PT+EN) (`1f8e8d9`)

### 🎨 UI
- **refactor**: remove todos os emojis da UI e posts — SVGs próprios por projeto (ProjectIcon) (`d59fd43`)
- **fix(covers)**: regenera 11 covers PIL com ícones próprios — remove tofu de emojis (`50a6b78`)
- **chore**: CI notificação Telegram com subject + arquivos alterados (`d373a53`) · remove script temp de video do toggle de tema (`8373179`)

### 📚 Docs
- Plano aprovado da maratona de posts 14-16/08 (grade fixa + conteúdo) (`fe3b127`) · timelines (`6a8378b`, `15f7b14`)

- 8 commits · push origin OK · HEAD: `50a6b78`

## [2026-08-12] — 🔒 Scrub posts (caminhos internos + codec TatuEngine) + círculo expansivo mobile

### 📝 Posts
- 3 posts 12/08: Descobertas (GitHub 2GB/LFS + orphan branch), TatuEngine block-codec, Dogwalk backup mentiroso [pipeline] (`7f207f0`)

### 🔧 Fixes
- círculo expansivo no mobile — revert crossfade 08a3d2d (pedido Samuel 12/08) (`37ed927`)

### 🔒 Segurança
- remove caminhos internos (caminhos internos) de 12 posts PT+EN — Capivara, Portifolio, Descobertas, Lifelog, Hermes (`4a65623`)
- remove receita técnica do codec TatuEngine de 10 posts PT+EN — BlockLens, kernels CUDA, thresholds, commits (`ab1d776`)
- gitleaksignore: .astro/data-store.json + cache interno Astro (FP, P2) (`f402f79`)

6 commits · push origin OK · HEAD: `37ed927`

## [2026-08-12] - 3 posts + security sweep blog + theme fix

- **feat(posts)**: 3 posts 12/08 — Descobertas (GitHub 2GB/LFS + orphan branch), TatuEngine block-codec, Dogwalk backup mentiroso [pipeline]
- **security(blog)**: remove caminhos internos (caminhos internos) de 12 posts PT+EN — Capivara, Portifolio, Descobertas, Lifelog, Hermes
- **security(blog)**: remove receita tecnica do codec TatuEngine de 10 posts (PT+EN) — BlockLens, kernels CUDA, thresholds, commits, caminhos internos
- **fix(theme)**: animacao crossfade mobile sem clip-path + guarda de regressao E2E (`08a3d2d`), depois revert para circulo expansivo no mobile (pedido Samuel 12/08, `37ed927`)
- **sec**: gitleaksignore — .astro/data-store.json e cache interno Astro (FP, P2)

## [2026-08-11] — Post k3s + 2 posts pipeline + revert Douglas PC

### 📝 Posts
- **Arachne do Docker ao k3s (PT+EN)**: decisão Kubernetes real, plano F0-F5, rollback (`146d60e`)
- **2 posts pipeline**: 61 vulnerabilidades (Portifólio) + Douglas sumiu da subnet (Capivara) (`06cb903`)
- **Revert**: post Douglas PC removido — não aprovado (nada sobre Samuel/Douglas PC; projeto errado) (`b8b5c96`)

### 🔒 Segurança
- gitleaks+bandit+opengrep scan (`889732c`)

6 commits · push origin OK · HEAD: `146d60e`

## [2026-08-09] — 🎨 Neon light mode fix + pubDate nos cards + capa AI Capivara + posts novos
### 🎨 UI/Fix
- **Neon do fundo volta no light mode** — aura 0.04→0.12 no fundo neon
- **Cards mostram pubDate** (data de publicação) em vez de date histórico
### 🖼️ Capas AI
- **Capa AI do post Capivara** (Worker FLUX) — substitui placeholder
### 📝 Posts
- **Nova história do Capivara**: "painel parou de mentir" (seção dashboard)
- **Libera posts 09/08** — draft removido
- **Post Arachne**: "O lock que nasceu no loop errado" (PT+EN) — lazy init `_get_lock()`
### 📡 RSS/Headers
- **RSS expõe project + accent** (cor do projeto) no feed
- **Headers /covers** cross-origin (CORP) — capas acessíveis de outros domínios
### 📋 Docs
- **Roadmap de posts** (segurança, AI Jail, descobertas) + sessão 09/08 no AGENTS.md

**12 commits · HEAD: `2b2b52a` ✅ push origin**

## [2026-08-07] — 📝 Posts novos PT/EN + drafts agendados + Bug Hunter fix
### 📝 Posts
- `dogwalk-o-websocket-que-nao-apertava-a-mao` (PT+EN) — receive_text sem accept(), 5 endpoints mudos, fix 1 linha
- `lifelog-a-saga-da-animacao-de-tema` (PT+EN) — 5 dias de whodunit CSS
- Posts 08/08 adiantados: arachne pool de conexões + capivara dashboard 994→262 (PT+EN, pubDate 08/08)
- Posts 08-09/08 em DRAFT (arachne pool, capivara dashboard, tatuengine punição v3, descobertas i18n audit)
### 🐛 Fix
- Bug Hunter: remove rotas /tags inexistentes + valida status HTTP real
- 6 commits · push origin OK · HEAD: `b813657`

## [2026-08-06] — 🚀 PWA + Perf Mobile + VT Fix + Bug Hunter

### 🚀 PWA
- **Service worker**: cache-first pros assets, network-first pros posts, offline fallback pra home
- **Manifest**: ícones 192/512 (roxo LifeLog), theme_color, apple-touch-icon
- **Registro inline** no BaseLayout

### 📱 Performance Mobile
- **100dvh** — Android: 100vh muda de tamanho com a toolbar flutuante, 100dvh é estável
- **will-change:background-image** no body — GPU composite, sem repaint no scroll

### 🎨 VT Fix
- **isolation:isolate** no image-pair VT — sem isso o blend plus-lighter do Chromium vaza entre old/new e o círculo parece não começar de onde clicou

### 🔍 Bug Hunter
- **Auditoria de render** (8 rotas PT/EN) — verificou que o conteúdo SPA montou

### 📝 Conteúdo
- **Post PT+EN**: descobertas-o-node-modules-fantasma — o node_modules de 253MB na home que sequestrava todos os builds Node do WSL

**6 commits · HEAD: `734d81b` ✅ push origin**

## [2026-08-05] — VT Animation Fix + Post Segurança

### 🎨 Theme Animations
- **VT circle fix**: stutter + origem errada do círculo — remove animation:none dos VT pseudos (causava stutter), restaura isolation:isolate no image-pair (blend vazava, old sumia fora do círculo), reset lastTouchX/Y pós-animação (ghost click usava posição de outra viewport)
- **Restaurado CSS VT idêntico ao bf98eff**: animation:none + mix-blend-mode:normal — sem animation:none o crossfade VT apaga o old snapshot ("apagando tudo")
- Mantém melhorias JS (reset lastTouchX/Y, vt-running)

### 📝 Conteúdo
- **Post PT+EN**: tatuengine-seguranca-como-processo — política de segurança contínua, SEGURANCA.md v1.0 + watchdog 24h

**4 commits · HEAD: `2f880ce` ✅ push origin**
## [2026-09-03] — Recuperação de documentação 31/08–02/09
- **docs**: AGENTS.md — regra ROGER + REGISTRO IMEDIATO (02/09, global) commitada (estava pronta desde 02/09)
- **chore**: capas AI de posts (`9752717` estudos/loss, `20866f5` dogwalk, `79ac99b` portfolio typewriter) ficaram sem entrada de changelog — registradas agora
- contexto: cron fim-de-dia recriado (job `5682dd26368e`, 23:00) — recuperação pontual do gap de documentação
