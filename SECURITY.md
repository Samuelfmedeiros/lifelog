# 🔒 Security Policy — Portifolio Samuel

## Reporting a Vulnerability

Contact Samuel Medeiros directly:
- **Email:** samuelandrademedeiros@gmail.com
- **GitHub Security Advisory:** https://github.com/Samuelfmedeiros/Portifolio/security/advisories/new

## Security Practices

1. **No secrets in code** — All keys loaded from environment variables.
2. **Audio/transcription files banned** — Blocked by .gitignore and pre-commit hook.
3. **Secret Scanning** — GitHub Secret Scanning + Push Protection enabled.
4. **Dependencies** — Regular updates via Dependabot.
5. **CSP** — Content-Security-Policy ativa (default-src 'self', script-src com nonce).

---

## 🛡️ HTTP Security Headers

| Header | Status |
|--------|--------|
| `Strict-Transport-Security` | ✅ `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | ✅ Ativa |
| `X-Frame-Options` | ✅ `DENY` |
| `X-Content-Type-Options` | ✅ `nosniff` |
| `Referrer-Policy` | ✅ `strict-origin-when-cross-origin` |
| `Permissions-Policy` | 🟠 Pendente (baixa prioridade) |

### ⚠️ CSP Notes
- `unsafe-inline` e `unsafe-eval` presentes para Next.js SSR/hydration + Framer Motion
- Aceitável para aplicação estática. CSP mais restritiva exigiria nonces dinâmicos.

---

## 📦 Dependency Vulnerabilities

**Score:** 7.8/10 🟠

- 26 high vulnerabilities (90% em devDependencies da Vercel — não vão pro build)
- `next` middleware bypass (CVE-7.5) — baixo risco para site estático
- Auditoria periódica via `npm audit`

---

## 🔑 API & Data

- **Contact form:** Dados vão para PostgreSQL 18 local via Capivara API
- **Capivara:** API pública sem auth para POST, admin endpoints com JWT
- **GitHub API:** Dados reais (sem fake), carregamento client-side
- **Umami:** Self-hosted, sem dados de terceiros
