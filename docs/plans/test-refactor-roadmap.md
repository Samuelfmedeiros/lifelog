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

- [ ] Substituir assertions exatas por dinâmicas (Regex + contagem real)
- [ ] Mocks de Rede no Playwright para isolar interface
- [ ] Validar suíte 68 testes repetidamente

**Pontos exatos encontrados (investigação 01/08/2026):**
- `e2e/lifelog.spec.ts:203` — teste "Posts=32, Projetos=6, Desde=2026" hardcoded (HOJE são 51+ PT)
- `e2e/lifelog.spec.ts:262-263` — RSS usa `ptCount * 2` (dinâmico ✅)
- `e2e/lifelog.spec.ts:321-345` — mistura `POSTS.length` (dinâmico ✅) com números fixos
- `e2e/lifelog.spec.ts:412` — `.post-card` count usa `POSTS.length` ✅
- **62 locators CSS** no lifelog.spec + 28 no theme-rail, **0 getByRole**

## Fase 2 — Modernização E2E

- [ ] Web-First Assertions (`getByRole`/`getByLabel`) nos seletores frágeis
- [ ] Fixtures/POM pra eliminar repetição de navegação nos 55 testes
- [ ] Padronizar interações do theme-rail.spec.ts

## Fase 3 — Upgrade Unitário

- [ ] `test.each()` data-driven nos 6 testes de projects.test.ts
- [ ] Casos limite `getProject()` (injeção, mutação de PROJECT_ACCENTS)

## Fase 4 — Novos Horizontes

- [ ] `@axe-core/playwright` — contraste + semântica HTML
- [ ] VRT `toHaveScreenshot()` — toggles dark/light + mobile

## Fase 5 — Segurança Contínua (adicionada 01/08/2026)

> Segurança realista e automatizada, sem virar projeto paralelo. Três frentes
> de alto impacto com baixo esforço, usando o ecossistema já existente (pnpm + Playwright).

### 5.1 SCA — Auditoria de Dependências (muito baixa)

- [ ] Adicionar `pnpm audit` no CI, logo antes de `pnpm test`
- [ ] Bloqueia build se biblioteca do frontend tiver CVE conhecida

### 5.2 SAST — Análise Estática com ESLint (baixa)

- [ ] Instalar `eslint-plugin-security`
- [ ] Varredura passiva: ReDoS (regex perigosas), manipulação insegura de objetos
- [ ] Alerta no editor + CI

### 5.3 DAST — Validação de Headers com Playwright (média)

- [ ] Teste global de infraestrutura que requisita a home e valida:
  - `Strict-Transport-Security` (HSTS) presente
  - `Content-Security-Policy` (CSP) configurada (anti-XSS)
  - `X-Frame-Options` ativo (anti-clickjacking)
- [ ] Integrar na suíte E2E existente (1 teste novo)

## Estado Atual (baseline)

- 68 testes E2E (55 lifelog + 10 theme-rail + 2 record-demo + 1 theme-mobile)
- 6 testes Vitest (projects.test.ts)
- Total: 74 testes
- Build: 110 pages, 0 erros

## Comandos

```bash
pnpm test            # Vitest + Playwright (CI)
pnpm vitest run      # só unitários
pnpm exec playwright test --config=e2e/playwright.config.ts  # só E2E
```
