# 📋 CHANGELOG — LifeLog

## [2026-08-11] — Bug Hunter findings versionados (dia leve)
- `ed4f5cb`: versiona audits bug-hunter 2026-08-10/11 (290 linhas de findings)
- 1 commit · push origin OK · HEAD: `ed4f5cb`

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