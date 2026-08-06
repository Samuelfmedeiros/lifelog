# 📋 CHANGELOG — LifeLog

## [2026-08-05] — VT Animation Fix + Post Segurança

### 🎨 Theme Animations
- **VT circle fix**: stutter + origem errada do círculo — remove animation:none dos VT pseudos (causava stutter), restaura isolation:isolate no image-pair (blend vazava, old sumia fora do círculo), reset lastTouchX/Y pós-animação (ghost click usava posição de outra viewport)
- **Restaurado CSS VT idêntico ao bf98eff**: animation:none + mix-blend-mode:normal — sem animation:none o crossfade VT apaga o old snapshot ("apagando tudo")
- Mantém melhorias JS (reset lastTouchX/Y, vt-running)

### 📝 Conteúdo
- **Post PT+EN**: tatuengine-seguranca-como-processo — política de segurança contínua, SEGURANCA.md v1.0 + watchdog 24h

**4 commits · HEAD: `2f880ce` ✅ push origin**