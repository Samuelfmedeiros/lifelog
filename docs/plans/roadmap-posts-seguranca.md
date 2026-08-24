# 📝 Roadmap de Posts — Segurança, AI Jail & Descobertas

> **Planejado em 09/08/2026** (Samuel: "planeja alguns futuros posts serão sobre ai jail e nosso uso, descoberta, aprendizado, segurança")
> Projetos: `seguranca`, `descobertas`, `tatuengine`, `hermes`

## 🎯 Temas planejados

### 1. 🔒 AI Jail na prática — o que aprendemos usando o sandbox
- **Projeto:** `seguranca` | **Slug:** `seguranca-ai-jail-na-pratica`
- **Angulo:** O post anterior (28/07) mostrou a instalação. Este mostra o **uso real**:
  - Casos onde o jail salvou (deploy em lockdown, workers sem GPU, operações críticas)
  - O dia em que o `jail --lockdown pg_restore` evitou um desastre
  - Trade-offs: Landlock mais lento (5.2s vs 3.8s), `no_landlock=true` no WSL
  - Código real: wrappers, config `~/.ai-jail`, mounts por comando (npm/pip/uv/cargo)

### 2. 🧠 O Arachne sandboxed — isolando browser, eval e código custom
- **Projeto:** `arachne` | **Slug:** `arachne-sandbox-ai-jail`
- **Angulo:** Como o Arachne integra ai-jail/bwrap via `app/sandbox.py`:
  - `sandboxed_browser()` — Chrome com sandbox do SO (sem `--no-sandbox`)
  - `sandboxed_handler()` — código Python custom (`code` stage) isolado
  - `eval()` de `math`/`jsonata` em subprocesso ai-jail (anti-RCE)
  - MCP tool `arachne_sandbox_status` — ver proteções ativas

### 3. 🛡️ Bug Hunter — o auditor que caça problemas enquanto eu durmo
- **Projeto:** `descobertas` | **Slug:** `descobertas-bug-hunter-auditor-noturno`
- **Angulo:** O sistema de auditoria diária:
  - Findings JSON por dia (audit-2026-08-06 até 09)
  - 15→1 vulnerabilidades de deps (pnpm update completo — LangSmith, sharp/libvips, JS-YAML, React Router)
  - CSP sem `unsafe-inline` + react-router v8
  - A transição: reativo → proativo (caçar antes de quebrar)

### 4. 🚨 O rate limit que bloqueava o IP errado (CF-Connecting-IP)
- **Projeto:** `seguranca` | **Slug:** `seguranca-rate-limit-cf-connecting-ip`
- **Angulo:** (Já contado no post do Capivara de hoje — **verificar duplicidade**)
  - Se já publicado, substituir por: **"CSP: do unsafe-inline ao policy rigoroso"**

### 5. ⚡ A punição semântica — ensinando o agente a se comportar
- **Projeto:** `tatuengine` | **Slug:** `tatuengine-a-punicao-semantica-que-ensinou-o-agente-a-se-comportar`
- **Status:** ✅ **JÁ PUBLICADO** (09/08, PT+EN) — `tatuengine-a-punicao-semantica...mdx`

### 6. 💡 Descobertas: o que aprendi essa semana
- **Projeto:** `descobertas` | **Slug:** `descobertas-aprendizados-semana-09-08`
- **Angulo:** Consolidar lições da semana:
  - Cache ISR vs force-cache (o bug de hoje — post novo não aparecia)
  - CORP/COEP cross-origin (capas bloqueadas)
  - WSL vEthernet zumbi — o padrão de diagnóstico
  - Fallback chain com providers free diferentes

## 📋 Prioridade sugerida (grade cíclica)

| Ordem | Post | Projeto | Pronto? |
|-------|------|---------|---------|
| 1 | AI Jail na prática | seguranca | 🔲 |
| 2 | Arachne sandboxed | arachne | 🔲 |
| 3 | Bug Hunter noturno | descobertas | 🔲 |
| 4 | CSP: do unsafe-inline ao policy rigoroso | seguranca | 🔲 |
| 5 | Aprendizados da semana (ISR/CORP/WSL) | descobertas | 🔲 |

## ✅ Já cobertos (não repetir)
- 28/07: Blindando o Hermes — ai-jail, bwrap e secrets (`blindando-hermes-ai-jail.mdx`)
- 09/08: Capivara — painel parou de mentir (inclui rate limit CF-Connecting-IP)
- 09/08: TatuEngine — punição semântica v3

## 📌 Como publicar
- Formato: PT + EN, capa AI (Cloudflare Worker), build, push
- Verificar duplicidade antes de escrever (`grep` no repo)
- Pós-publicação: watchdog LifeLog→Portifólio confirma sync
