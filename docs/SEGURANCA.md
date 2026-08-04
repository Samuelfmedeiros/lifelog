# 🛡️ LifeLog — Plano de Segurança (v1.0)

> Documento dedicado de segurança do blog (04/08/2026).
> **Segurança é acompanhamento contínuo, não um documento parado.**
> Inspirado na política do LEVE LAVANDA + 3 referências GitHub (OWASP 2025, HttpArmor, OWASP Checklist).

---

## 🎯 Princípios

1. **SSG é seguro por natureza, mas não imune** — sem backend/API/auth, mas tem superfície: build, deploy, headers, dependências, conteúdo
2. **Defense in depth** — várias camadas: código → build → deploy → headers → monitoramento
3. **Auditar a cada entrega** — pnpm audit + headers check + integridade do lockfile
4. **Secrets NUNCA no bundle** — tokens via GitHub Secrets, .env no .gitignore
5. **Referências são pra USAR, não só documentar**

---

## 📦 Inventário (04/08/2026)

| Área | Controle | Status |
|------|----------|--------|
| **CSP** | `script-src 'unsafe-inline'` (Astro requer), sem `unsafe-eval` | ✅ Hardened 04/08 |
| **Headers** | HSTS (2 anos), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP, CORP, COEP | ✅ Completo 04/08 |
| **SCA** | `pnpm audit` — zero vulns | ✅ |
| **SAST** | ESLint + `eslint-plugin-security` — 20 warnings (todos em testes, risco zero) | ✅ |
| **Secrets** | `VERCEL_TOKEN` + `TELEGRAM_BOT_TOKEN` → GitHub Secrets | ✅ |
| **.env** | `LIFELOG_COVER_API_KEY` local, `.gitignore` cobre | ✅ |
| **HTTPS** | Vercel força HTTPS + HSTS preload | ✅ |
| **Dependências** | Astro 7.1.6, Tailwind 4.3.3, pnpm lockfile versionado | ✅ |
| **Input validation** | FilterBar com busca textual — query params sanitizados pelo browser (SSG) | ✅ |
| **Cache** | `Cache-Control: no-cache` + meta tags + guard bfcache (`pageshow`) | ✅ 03/08 |
| **OAST** | `security-headers.spec.ts` — testa headers em produção | ✅ |

---

## 🚨 Ameaças (adaptadas ao SSG)

| # | Ameaça | Risco | Controle |
|---|--------|-------|----------|
| **A05** | **Security Misconfiguration** — CSP permissiva, headers faltando | 🟡 BAIXO | Headers completos, CSP sem unsafe-eval, COOP/CORP/COEP |
| **A06** | **Vulnerable Components** — dependências com CVE | 🟡 BAIXO | `pnpm audit` a cada build, lockfile versionado |
| **A08** | **Software Integrity** — lockfile corrompido/trocado | 🟡 BAIXO | Lockfile no git, `pnpm install --frozen-lockfile` no CI |
| **Client** | **XSS via MDX** — script injetado em post | 🟢 MÍNIMO | Só Samuel escreve posts; React/Astro escapa por padrão |
| **Supply** | **Ataque à cadeia** — dep maliciosa no npm | 🟡 BAIXO | pnpm lockfile fixa versões exatas; audit no CI |
| **Deploy** | **Token Vercel vazado** | 🟡 BAIXO | GitHub Secrets, nunca no código |

---

## 🛡️ Controles por área

### Build & CI/CD
- [x] `pnpm install --frozen-lockfile` (CI) — lockfile imutável
- [x] `pnpm audit` — reporta vulns (NUNCA auto-fix — pitfall Vercel)
- [x] ESLint security plugin ativo
- [ ] gitleaks scan no CI (secrets no git)
- [ ] Verificação de integridade do lockfile (hash check)

### Headers (vercel.json)
- [x] CSP: `default-src 'self'`, sem `unsafe-eval`
- [x] HSTS: 2 anos + includeSubDomains + preload
- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: SAMEORIGIN
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy: câmera, microfone, geolocalização, sensores, pagamento → tudo bloqueado
- [x] COOP: same-origin
- [x] CORP: same-origin
- [x] COEP: require-corp
- [x] Cache-Control: no-cache (HTML) + immutable (assets/covers)

### Conteúdo (MDX)
- [x] Sem user input (só Samuel publica)
- [x] Cover API key em `.env` (fora do git)
- [x] Capas geradas via Cloudflare Worker (API key no backend, não no front)

### Monitoramento
- [x] `security-headers.spec.ts` (DAST) — testa headers em produção
- [x] E2E Playwright — 165 testes de integridade do site
- [x] CI/CD health check — verifica HTTP 200 em rotas críticas
- [ ] Cron de acompanhamento de segurança (diário/semanal)
- [ ] Alerta no grupo Notificações se headers mudarem

---

## 📊 Roadmap de segurança

| Fase | Entrega | Status |
|------|---------|--------|
| **1. Headers** | CSP, HSTS, X-Frame, COOP/CORP/COEP, Permissions-Policy | ✅ 04/08 |
| **2. SCA/SAST** | pnpm audit, ESLint security, lockfile integrity | ✅ 04/08 |
| **3. CI/CD** | Frozen lockfile, audit no CI, gitleaks | ⚠️ gitleaks pendente |
| **4. Monitoramento** | Cron de segurança, health check automatizado | ⚠️ Pendente |
| **Contínuo** | pnpm audit, revisão de headers, update de deps | 🔄 Em andamento |

---

## 🔍 Auditorias (ferramentas do ecossistema)

- `web-api-security-audit` (skill) — N/A (sem backend)
- `infrastructure-security-audit` (skill) — N/A (Vercel serverless)
- `github-public-repo-security-audit` (skill) — ✅ Repo público, revisado 04/08
- `security-headers.spec.ts` — ✅ DAST automatizado

---

## 📚 Referências de segurança (GitHub — 04/08/2026)

### 🆕 Novas (boas práticas atuais)
1. **[HttpArmor](https://github.com/opensecurity/httparmor)** — gerador/validador de headers HTTP. CSP, HSTS, COOP/CORP/COEP, Permissions-Policy. Usado pra refinar headers do LifeLog.
2. **[OWASP Top 10:2025 Checklist](https://github.com/Sp3ctrX/owasp-top10-2025-checklist)** — 249 CWEs mapeados, Excel, exemplos reais, prevenção. Adaptado pro SSG (A05, A06, A08 relevantes).

### 📜 Clássico (padrão a seguir)
3. **[OWASP Web Checklist](https://github.com/0xRadi/OWASP-Web-Checklist)** — checklist clássico OWASP. Adaptado pro SSG (Information Gathering → Configuration → Client-side).

### 📖 Extras (do LEVE LAVANDA)
- **[OWASP CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries)** (⭐32k) — referência canônica pra cada controle
- **[nodebestpractices](https://github.com/goldbergyoni/nodebestpractices)** (⭐105k) — seção security: secrets, validation, headers

---

## 🔄 Política de acompanhamento contínuo

> **"Segurança é acompanhamento."** — Samuel, 04/08/2026

- **A cada entrega/bloco:** `pnpm audit` + verificar headers + integridade do lockfile
- **Semanalmente:** revisar SEGURANCA.md + atualizar inventário
- **Mensalmente:** revisar dependências (atualizar Astro, Tailwind, plugins)
- **Ao adicionar feature nova:** reavaliar superfície de ataque

---

*Criado: 04/08/2026 · v1.0 — política adotada do LEVE LAVANDA + 3 referências GitHub*
