# 📋 CHANGELOG — LifeLog

## [2026-08-12] — 🔒 Scrub posts (caminhos internos + codec TatuEngine) + círculo expansivo mobile

### 📝 Posts
- 3 posts 12/08: Descobertas (GitHub 2GB/LFS + orphan branch), TatuEngine block-codec, Dogwalk backup mentiroso [pipeline] (`7f207f0`)

### 🔧 Fixes
- círculo expansivo no mobile — revert crossfade 08a3d2d (pedido Samuel 12/08) (`37ed927`)

### 🔒 Segurança
- remove caminhos internos (~/.hermes, /home/samuel) de 12 posts PT+EN — Capivara, Portifolio, Descobertas, Lifelog, Hermes (`4a65623`)
- remove receita técnica do codec TatuEngine de 10 posts PT+EN — BlockLens, kernels CUDA, thresholds, commits (`ab1d776`)
- gitleaksignore: .astro/data-store.json + cache interno Astro (FP, P2) (`f402f79`)

6 commits · push origin OK · HEAD: `37ed927`

## [2026-08-12] - 3 posts + security sweep blog + theme fix

- **feat(posts)**: 3 posts 12/08 — Descobertas (GitHub 2GB/LFS + orphan branch), TatuEngine block-codec, Dogwalk backup mentiroso [pipeline]
- **security(blog)**: remove caminhos internos (~/.hermes, /home/samuel) de 12 posts PT+EN — Capivara, Portifolio, Descobertas, Lifelog, Hermes
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