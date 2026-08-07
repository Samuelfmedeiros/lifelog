# 📋 CHANGELOG — LifeLog

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