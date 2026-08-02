# LifeLog — Roadmap Refatoração de Testes (2026-08-01)

> Plano aprovado por Samuel em 01/08/2026. Refatoração progressiva dos testes
> do LifeLog em 4 fases, sem quebrar a rede de segurança de 74 testes
> (68 E2E + 6 Vitest).

## Visão Geral

| Fase | Objetivo | Ferramentas | Complexidade |
|------|----------|-------------|--------------|
| 1. Estabilização | Eliminar quebras constantes e dados engessados | Playwright (Regex/Mocks) | Baixa |
| 2. Modernização E2E | Limpar código repetido e melhorar seletores | Playwright (POM/Fixtures) | Média |
| 3. Upgrade Unitário | Escalar validações com menos código | Vitest (test.each()) | Média |
| 4. Novos Horizontes | Acessibilidade + prevenção de bugs visuais | Axe-core + VRT | Alta |
| 5. Segurança Contínua | SCA + SAST + DAST sem sair do fluxo | pnpm audit + ESLint + Playwright | Baixa |

## Fase 1 — Estabilização e Fim do Hardcoding

- [x] Substituir assertions exatas por dinâmicas (Regex + contagem real)
  - Commit `abac822`: PROJECT_PILLS dinâmico (ids) + PROJECT_PILL_LABELS (labels) — corrigiu falha "8 vs 10 pills"
- [ ] Mocks de Rede no Playwright para isolar interface
  - ⚠️ Avaliado: provavelmente desnecessário — LifeLog é SSG puro, dados vêm dos MDX (não de API)
- [x] Validar suíte 68 testes repetidamente
  - ✅ 3/3 runs: 148 passed, 0 failed (3.5/4.0/3.8min) — zero flakiness

**Pontos exatos encontrados (investigação 01/08/2026):**
- `e2e/lifelog.spec.ts:203` — teste "Posts=32, Projetos=6, Desde=2026" hardcoded (HOJE são 51+ PT)
- `e2e/lifelog.spec.ts:262-263` — RSS usa `ptCount * 2` (dinâmico ✅)
- `e2e/lifelog.spec.ts:321-345` — mistura `POSTS.length` (dinâmico ✅) com números fixos
- `e2e/lifelog.spec.ts:412` — `.post-card` count usa `POSTS.length` ✅
- **62 locators CSS** no lifelog.spec + 28 no theme-rail, **0 getByRole**

## Fase 2 — Modernização E2E

- [x] Web-First Assertions (`getByRole`/`getByLabel`) nos seletores frágeis
  - Commit `a88239f`: h1→getByRole heading, #filter-search→getByLabel, .post-card→getByRole article, theme-rail→getByLabel
- [x] Fixtures pra eliminar repetição de navegação
  - `e2e/fixtures.ts`: goto (retorna Response) + home — eliminou 16x page.goto('/')
- [ ] Padronizar interações do theme-rail.spec.ts (parcialmente feito com getByLabel)

## Fase 3 — Upgrade Unitário

- [x] `test.each()` data-driven nos 6 testes de projects.test.ts
  - Commit `a88239f`: 6 → 35 testes (9 projetos × 3 contratos + casos limite)
- [x] Casos limite `getProject()` (injeção, case-sensitive, null/undefined)

## Fase 4 — Novos Horizontes

- [x] `@axe-core/playwright` — contraste + semântica HTML
  - Commit `0de7167`: 7 testes (home/arquivo/sobre/post dark+light) + 8 correções WCAG
  - Corrigidos: contraste `.cta`/pill/`pre`/terminal/tag-count, heading-order (h3→h2), landmark-unique (aria-label navbar)
- [x] VRT `toHaveScreenshot()` — toggles dark/light + mobile
  - Commits `4c80bfa` + `6d08aa1`: 4 snapshots (home dark/light, navbar, mobile)
  - Pitfalls: networkidle nunca resolve (WebSocket Vite) → domcontentloaded; fonts.ready pode travar → Promise.race 1.5s; `*.png` no gitignore ignorava baselines → exceção adicionada

## Fase 5 — Segurança Contínua (adicionada 01/08/2026)

> Segurança realista e automatizada, sem virar projeto paralelo. Três frentes
> de alto impacto com baixo esforço, usando o ecossistema já existente (pnpm + Playwright).

### 5.1 SCA — Auditoria de Dependências (muito baixa)

- [x] Adicionar `pnpm audit` no CI, logo antes de `pnpm test` (commit `fa4339c`)
- [x] Bloqueia build se biblioteca do frontend tiver CVE conhecida
  - `pnpm update` zerou 4 CVEs (astro 7.0.6→7.1.6, svgo, fast-xml-parser, postcss)

### 5.2 SAST — Análise Estática com ESLint (baixa)

- [x] Instalar `eslint-plugin-security` (commit `7f3c595`)
- [x] Varredura passiva: ReDoS (regex perigosas), manipulação insegura de objetos
- [x] Alerta no editor + CI
  - `pnpm lint`: 0 errors, 20 warnings (falsos positivos detect-object-injection)

### 5.3 DAST — Validação de Headers com Playwright (média)

- [x] Teste global de infraestrutura que requisita a home e valida:
  - `Strict-Transport-Security` (HSTS) presente
  - `Content-Security-Policy` (CSP) configurada (anti-XSS)
  - `X-Frame-Options` ativo (anti-clickjacking)
- [x] Integrar na suíte E2E existente (1 teste novo)
  - Commit `91b6b81`: `e2e/security-headers.spec.ts` (6 testes) + vercel.json com headers

## Estado Atual (final — 02/08/2026)

- 165 testes E2E (161 + 4 VRT) + 7 a11y dentro da suíte
- 35 testes Vitest (projects.test.ts data-driven)
- Total: 200 testes
- Build: 110 pages, 0 erros · Lint: 0 errors · Audit: 0 CVEs

## Comandos

```bash
pnpm test            # Vitest + Playwright (CI)
pnpm vitest run      # só unitários
pnpm exec playwright test --config=e2e/playwright.config.ts  # só E2E
```
