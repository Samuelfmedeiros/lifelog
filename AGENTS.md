# 📖 LifeLog — Session Hub

> Blog pessoal estilo devlog — documentando a jornada de Samuel Medeiros
>
> **Stack:** Astro 7 · MDX · Tailwind 4 · TypeScript · Playwright
> **Live:** https://lifelog-sepia.vercel.app
> **Status:** ✅ Operacional — 54 posts bilíngues (108 MDX) · 7 E2E specs · 200 testes · i18n PT/EN
> **Pipeline:** 📖 Narrative-First (desde 24/07) — **3 posts/dia hidden: 08:00/12:00/16:00 → /ocultos** (28/08; liberação manual do Samuel)

---

## 🔴 TEST-LOOP OBRIGATÓRIO ANTES DE QUALQUER ENTREGA (18/08 + v2 25/08/2026 — Samuel, GLOBAL)

Regra permanente em TODOS os projetos. Antes de declarar pronta/fazer deploy de QUALQUER
entrega (código, UI, pipeline, feature, fix), rodar SEMPRE o loop de testes com IA
(skill `ai-test-loop`):

1. **Builder = opencode CLI** (corrige gaps de programação; NUNCA avalia o próprio trabalho — v2 25/08)
2. **Testes reais** — unit + e2e + VRT do projeto (`test-loop-runner.py` ou o comando nativo)
3. **Critic determinístico separado** — nota 0-100 com evidência real, contexto fresco
4. **Reviewer opencode** — CONCORDO|DISCORDO (DISCORDO = reabrir loop) + nota revisor no PDF
5. **Evidência visual** — screenshots DESKTOP + MOBILE (Playwright/VLM), regra obrigatória
   para mudanças de visual
6. **Vídeo de aprovação** = entregue ao FINAL (mensagem única no grupo), nunca no meio
7. **Gate:** nota >= threshold (UI=100, código=85); nota < threshold → reavaliar e corrigir
   (máx 8 rodadas); nota documentada no relatório
8. **PDF relatório** SEMPRE anexado via MEDIA:<caminho> (ou sendDocument + message_id confirmado)

**ADICIONAR TESTES DE COMPLEMENTO:** se for preciso adicionar mais testes para melhorar
o projeto ou cobrir outras áreas (novas features, áreas não cobertas, regressões),
ISSO DEVE SER FEITO ANTES da entrega — nunca entregar deixando áreas sem cobertura quando
dá pra cobrir.

Sem evidência real (testes + screenshot + nota + PDF entregue) NÃO é entrega completa.



## Sessão 2026-09-09 (fim de dia) — pipeline A/B/C do dia + fix LLM content vazio

- **post(a)**: seguranca-toda-janela-e-uma-porta (PT+EN, hidden) — /tag vazava título e resumo de post oculto pelo getStaticPaths e pela nuvem de tags; achado não-bloqueante do Roger com nota máxima no gate; regras: filtro compartilhado + teste por título no HTML público + par PT/EN (ff185ac); release atômica (075b3b0)
- **post(b)**: arachne-tres-facas-do-flake (PT+EN, hidden) — 3 flakes reais: RNG sem semente no test_search_top_k, offline_net autouse virando opt-in por marker, asserts tautológicos dentro do pytest.raises (critic R3); 79 passed no venv (0afb19d)
- **post(c)**: estudos-os-dez-segundos-de-silencio (PT+EN, hidden) — chamada LLM 200 OK com content vazio: reasoning models queimam o budget de tokens pensando; consertos: teto de tokens com margem (pensamento+resposta) + parser SSE que raspa `data: [DONE]` colado no chunk do JSON; capa Worker FLUX v3 (gradiente, OCR 0 hits, brightness 199) (3bafb5b)
- pipeline 3 posts (A 08:00 / B 12:00 / C 16:00) + deploy p/ incluir post b no bundle do painel (ab0d8d8) · push origin feat/release-atomic · HEAD: `3bafb5b`

## Sessão 2026-09-08 (fim de dia) — Tags Opção C live + 4 releases + recusas #38/#39

- **feat(tags) Opção C live**: vocabulário canônico (tag-vocab.ts) + guardião check-tags.py + /tag/[slug] PT+EN + guard --strict no CI (eb60e94→0fe6bf7); fix lint 6 erros + check-tags ROOT relativo (bd47418, 973ee1f)
- **posts**: tatuengine-bitmamba-1b-voltou-do-coma (Fase 4B, fix /tag/ hidden vazava), dogwalk-o-app-que-entra-na-tela-de-casa (PWA), descobertas-a-capa-que-nao-mudava (cache-bust), arachne-o-erro-que-salvou-o-banco — PT+EN + capas Worker FLUX (bc02d2d, 751c871, 641218e, 23943a7)
- **releases**: os 4 posts liberados PT+EN (bdc15a3, 2648fd1, fb00a41, 10affa5, 28d4d9b, 52621a9, c66df1e, 23a8d4d)
- **refazer**: recusas #38 (trinta-commits) e #39→novo arachne-o-erro; fix ocultos-data pós-liberação (067da21); capa watchdog (b28a423)
- **feat(release)**: commit atômico na liberação (mdx PT+EN + ocultos-data num commit só) + docs do fluxo (d2efa0c, 3d96e60)
- 28 commits no dia · push origin OK · HEAD: `3d96e60`

## Sessão 2026-09-08 — 🏷️ Tags Opção C: vocab canônico + /tag/[slug] + guard CI

- **fonte única de verdade** `src/lib/tag-vocab.ts` (TAG_VOCAB + TAG_ALIASES + canonicalizeTag + tagLabel): 332 slugs canônicos EN (língua franca técnica) com label PT (`pt: 'Segurança'`); 96 aliases PT→EN (`seguranca→security`, `automacao→automation`…); projects structural ficam PT (arachne/yurumi/seguranca/estudos…)
- **guardião** `scripts/check-tags.py`: `--report` | `--fix` | `--strict` (CI). Parseia o vocab do .ts (não duplica lista); checa: tag fora do vocab, tag do projeto ausente, PT/EN divergentes, multi-line, duplicatas, aliases não canonizados; IGNORE_FILES = posts em edição por outra sessão
- **migração** 272 frontmatters PT/EN idênticos (união PT+EN, ordem PT primeiro), flow single-line, CRLF preservado (`open(newline='')` obrigatório — universal newlines infla diff CRLF→LF)
- **páginas estáticas** `src/pages/tag/[slug].astro` + `src/pages/en/tag/[slug].astro`: getStaticPaths do vocab real, getCollection PT/EN + união de projetos cross-locale, TagCloud + grid de PostCards; `?q=` segue como fallback na home
- **chips clicáveis**: PostCard (`a.tag` → `/tag/<slug>` com `tagLabel`), TagCloud (`/tag/<slug>`), PostLayout (href era `?q=` → agora `/en/tag/<slug>`; display `#{tagLabel}`); `<section>` (BaseLayout já tem `<main>` — aninhado quebra build)
- **testes**: `src/lib/tag-vocab.test.ts` (5/5: invariantes, canonicalize, aliases↔vocab, labels, CI_CD/Segurança) + `e2e/tags.spec.ts` (7/7: yurumi 200 agrega PT+EN, amostra 8 tags, chips clicáveis, TagCloud, 404). Rodar playwright SEMPRE com `--config e2e/playwright.config.ts` (baseURL 4321)
- **CI**: deploy.yml — `Tag vocabulary check (Opção C)`: `python3 scripts/check-tags.py --strict` após PT/EN sync
- commit: **pendente** (deploy gate: só "pode subir")

## Sessão 2026-09-07 (fim de dia) — 3 posts pipeline + releases + fix tags + recusa #37

- **post(a)** (`fdcc173`): seguranca-o-vigia-nao-sabe-quem-voce-e (PT+EN, hidden) — re-baseline desfeito por corrida entre rotinas de auto-reparo; alarme de integridade apontou edição legítima; protocolo com confirmação tardia; capa Worker 456KB brilho 156 OCR limpo
- **releases** (`7ac1da7`, `a424d3a`, `101a14b`, `8369110`): capivara-o-revisor-que-nao-le-codigo + seguranca-o-vigia (PT+EN)
- **post(b)** (`9718315`): arachne-trinta-commits-ate-o-verde (PT+EN, hidden) — a campanha do CI: comentário YAML engolia `-n 4` no `run:`, fixture crossref nascia com FK ON (`engine.dispose` resolve), xdist `-n auto` matava workers (cap 4 + timeout 300s); capa Worker FLUX 191KB brilho 170 OCR limpo
- **fix(capa)** (`5b574de`): capa AI de seguranca-o-vigia refeita (watchdog)
- **fix(tags)** (`fc1dce2`): normaliza e completa tags dos posts (PT+EN) — 67 arquivos
- **post(c)** (`5b87ae5`): dogwalk-o-link-que-a-gente-mandava-pra-voce (PT+EN, hidden) — share público de tracking: token idempotente, payload mínimo (nunca tutor/walker), ETA honesto que cala atraso, botão órfão reencontrado na UI real; capa Worker FLUX 175KB
- **refazer(#37)** (`bb01cbc`, `52d69f3`): recusa do post dogwalk-o-link — remoção total (PT+EN+capa), recusa sem nota de ajuste
- 12 commits no dia · push origin OK · HEAD: `8b51a11`

## Sessão 2026-09-06 (fim de dia) — posts tatuengine/capivara revisor + releases
- **post(tatuengine)**: o treino que acordou lento — fix base_lrs do scheduler após load de ckpt (PT+EN, hidden, capa NIM 17.6KB brilho 225 OCR limpo) (85c2d29) + release PT (`9b861e2`) + release EN (`64f1788`)
- **post(capivara)**: o revisor que não lia código — tema claro auditado por VLM: tokens vs rgba + email truncado no header (PT+EN, hidden, capa NIM seed 2028 webp 42KB brilho 181 OCR zero) (f60f7e6)
- 4 commits no dia · push origin OK · HEAD: `f60f7e6`

## Sessão 2026-09-06 (fim de dia) — post capivara + release tatuengine
- **post(c)**: capivara-o-revisor-que-nao-le-codigo (PT+EN, hidden) — tema claro auditado por VLM (tokens vs rgba + email truncado no header); capa NIM seed 2028 webp 42KB, OCR zero (f60f7e6)
- **release(post)**: tatuengine-o-treino-que-acordou-lento PT+EN (9b861e2, 64f1788)
- **post(b)**: tatuengine-o-treino-que-acordou-lento (PT+EN, hidden) — fix base_lrs do scheduler pós load de ckpt; capa NIM 17.6KB brilho 225 OCR limpo (85c2d29)
- 4 commits no dia · push origin OK · HEAD: f60f7e6

## Sessão 2026-09-05 (fim de dia) — refazer caps/posts (OCR limpo), releases e fix cache-bust
- **refazer(#33/#34/#35/#36)**: posts descobertas-ocultos e seguranca-a-excecao refeitos do zero — temas novos, PT+EN, hidden mantido; caps sem texto (OCR 0 hits em 2 escalas x 2 PSMs, brightness 216/240/112)
- **refazer(#36-2)**: capa seguranca cache-bust - URL nova (-v2) quando rework; immutable 1y congelava capa velha no browser (1fd77d9)
- **post(hidden)**: o rodape que mentia duas vezes — hydration #418 e o copyright duplicado (PT+EN) (3211d7d) · /ocultos virou antessala do blog — release de posts ocultos em um clique (ac34fee) · a excecao que foi escrita duas vezes (52c25c8)
- **releases publicadas**: rodape, polidor de janelas 120s, metrica que ninguem confessa, F5 do passeador, guerra da porta 9000, seguranca-a-excecao, estado-congelado (PT+EN)
- **fix(covers)**: capas watchdog — capa AI de portfolio-o-rodape-que-mentia-duas-vezes (a430dad) e seguranca-a-excecao (51b0890)
- 30 commits no dia · pull origin (4 releases remote) + push origin OK · HEAD: `8523ad3`

## Sessão 2026-09-04 (fim de dia) — 6 posts novos + capas Yurumi aprovadas + fix i18n cron
- **posts estudos**: a metrica que ninguem confessa — reranker latency vs recall (ac63173, hidden) · o polidor de janelas 120s — polir transcricao com invariante anti-alucinacao (4ea8412) · fix i18n: cron duplicou EN no slot PT do post metrica (272e834)
- **posts dogwalk/arachne**: o F5 que desligava o passeador — persistencia do status online (e4f03ae, hidden) · a guerra da porta 9000 — tres bugs encadeados num so diagnostico (e2b0e2d, hidden)
- **releases**: capivara-o-cadeado-verde PT (b9671da) + EN (9fb98f5)
- **capas Yurumi aprovadas** (578d065): heroico no post memoria-agente + 2 fogueiras para proximos posts
- 8 commits no dia · push origin OK · HEAD: e4f03ae

## Sessão 2026-08-28 — Recusar com nota no /ocultos + refazer pipeline
- **feat(ocultos)**: botão **Recusar** com textarea de nota em cada card — POST `/api/recusar` (`api/recusar.mjs`, commit `5560caf`)
- **feat(api)**: recusa persiste em 2 vias — GitHub Issue (label `refazer`) + arquivo `docs/recusas/<slug>.md` no repo; sanitização + rate limit 3/30s
- **feat(ops)**: watcher → **cron agente** `081b4d301432` "LifeLog Refazer Auto" (*/15, monitor_script `lifelog-recusas-watch.py` com estado persistente). Detecta recusa NOVA → **refaz sozinho** (PT+EN, capa, build, commit, push) → fecha issue → post de volta no /ocultos. Samuel não precisa avisar nada.
- **feat(ui)**: layout do /ocultos melhorado (botão Recusar + form de nota)
- **fix(pipeline)**: Post B de 28/08 não rodou — next_run bugou para 29/08 pós-mudança de schedule; disparado manualmente
- **refactor(posts)**: refaz Capivara (remove LEVE LAVANDA) e Segurança (mais abstrato) conforme recusa do Samuel — commit `3c18217`

## Sessão 2026-08-28 (fim de dia) — Pipeline 3 posts/dia + Recusar/Refazer automático + fix layout /ocultos
- **feat(pipeline)**: 2 posts/dia → **3 posts/dia** — A 08:00 (`37f26454f492`), B 12:00 (`7d09479ddc78`, não repete A), C 16:00 (`c57e4814586e`, não repete A/B); hidden no /ocultos, liberação manual
- **feat(ocultos)**: botão **Recusar** + nota → `/api/recusar` (issue GitHub `refazer` + docs/recusas/) + **Refazer automático** (cron `081b4d301432`, monitor_script)
- **fix(ocultos)**: layout mobile — título largura total (284px/3 linhas vs 83px/11 antes), botões em linha própria (`d1c63f3`)
- **testes**: ai-test-loop lifelog ativo (lifelog.json + critic_check_lifelog.py) — loop 28/08 11:08 NOTA 100

## Sessão 2026-08-27 — Pipeline 09:00/09:30 (fluxo hidden de manhã)
- **feat(pipeline)**: crons 12h/16h → **09:00 (Post A) + 09:30 (Post B)** — os 2 posts do dia ficam hidden no /ocultos de manhã; Samuel libera no horário que quiser; Post B nunca repete o projeto do Post A
- **feat(post)**: Estudos — "quando a documentação virou conhecimento" (PT+EN, capa AI) liberado 27/08

- **release(post)**: liberados 27/08 — estudos/"quando a documentação virou conhecimento" (`4722285`/`2723469`) e arachne/"quando o scraper ficou acessível" (`43e3217`/`d7e8ec2`), capa AI
- **docs(agents)**: pipeline 09:00/09:30 documentado (`d6d94b2`) — 7 commits no dia · push origin OK · HEAD: `d6d94b2`
## Sessão 2026-08-25 (fim de dia) — Scrub histórico + rename slug espelho
- **security**: reconstrói histórico sem o commit que expunha stack defensiva — árvore final idêntica a main, force push (`6c9e720`); rename slug capivara-espelho-douglas → capivara-espelho-backup PT+EN (`e599155`)
- **qa**: registra audit bug-hunter 2026-08-25 — 6/6 rotas ok (`391d15c`)
- **docs**: consolida plano narrative-overhaul em OLD_STUFF (`cbaed96`)
- 4 commits no dia · push origin ⚠️ (verificar) · HEAD: `391d15c`

## Sessão 2026-08-23 (fim de dia) — Posts WCAG/Estudos liberados + gate de capas + fix ocultos

- **feat(post)**: 4 posts hidden PT+EN com capa AI — WCAG AA contraste (`514a4f6`), ternário (`0e882ed`), teoria de campo virou módulo (`7644d61`), semana que medi minha memória (`484e05d`)
- **release(post)**: liberados — descobertas-wcag-aa (`03bc614`/`9d95159`), ternário (`d061a6e`/`930748a`), semana memória (`ae3b6bf`/`fd1e862`), watchdog-descobriu-capas-falsas (`4b260f8`/`f464bdf`)
- **feat**: gate de capas no build — auto-fix quando possível, bloqueia post sem capa (`51cdc46`)
- **fix**: capa do post WCAG em WebP real (jpeg disfarçado não renderiza) (`f576283`); restaura capa original (`820240f`); linha cover no frontmatter (`b817195`, `3808f4e`); capa AI da semana-memória (`a0de538`)
- **fix(ocultos)**: libera par PT+EN sem erro duplicado — cards agrupados por post e API idempotente (`66054af`)
- **fix(a11y)**: contraste WCAG AA em todos os temas e paletas (`7fb83a8`)
- **docs**: consolida plans 07/19 implementados no OLD_STUFF (`498a05f`)
- 21 commits no dia · push origin OK · HEAD: `66054af`

## Sessão 2026-08-17 (fim de dia) — Posts maratona: Estudos (ondas) + Segurança (caça ativa) + hidden 308 skills
- **feat(posts)**: maratona — Estudos (ondas) e Segurança (caça ativa) completos PT+EN + capas AI (`b87963c`)
- **feat(post)**: estudos 308 skills e o hub de reuso (PT+EN, hidden) + capa AI (`1dd8b1d`)
- 2 commits · HEAD: `1dd8b1d`

## Sessão 2026-08-13 (fim de dia) — 📝 Posts Estudos/Segurança + saga animação + ProjectIcon sem emojis
- **feat(posts)**: Estudos e Segurança (PT+EN) — os 2 projetos mais carentes da grade (`dfe5d3a`) + timeline (`6a8378b`)
- **feat(post)**: desfecho da saga da animação — círculo expansivo no mobile (PT+EN, `1f8e8d9`) + timeline (`15f7b14`)
- **refactor**: remove TODOS os emojis da UI e posts — SVGs próprios por projeto (ProjectIcon) (`d59fd43`) + regenera 11 covers PIL sem tofu de emojis (`50a6b78`)
- **chore**: CI notificação Telegram com subject + arquivos alterados (`d373a53`) · remove script temp de video (`8373179`)
- **docs**: plano aprovado da maratona de posts 14-16/08 — grade fixa + conteúdo (`fe3b127`)
- 8 commits no dia · push origin OK · HEAD: `50a6b78`

## Sessão 2026-08-12 — 🔒 Scrub posts (caminhos internos + codec TatuEngine) + círculo expansivo mobile
- **fix(theme)**: círculo expansivo no mobile — revert crossfade 08a3d2d (pedido Samuel 12/08) (`37ed927`)
- **security(blog)**: remove caminhos internos (caminhos internos) de 12 posts PT+EN — Capivara, Portifolio, Descobertas, Lifelog, Hermes (`4a65623`)
- **security(blog)**: remove receita técnica do codec TatuEngine de 10 posts PT+EN — BlockLens, kernels CUDA, thresholds, commits; regra permanente na skill lifelog (`ab1d776`)
- **feat(posts)**: 3 posts 12/08 — Descobertas (GitHub 2GB/LFS + orphan branch), TatuEngine block-codec, Dogwalk backup mentiroso [pipeline] (`7f207f0`)
- **sec**: gitleaksignore — .astro/data-store.json e cache interno Astro (FP, P2) (`f402f79`)
- 6 commits no dia · push origin OK · HEAD: `37ed927`

## Sessão 2026-08-11 — Post k3s + 2 posts pipeline + revert Douglas PC

### 📝 Posts
- **feat(post)**: Arachne do Docker ao k3s (PT+EN) — decisão de usar Kubernetes de verdade, plano F0-F5, rollback (`146d60e`)
- **feat(posts)**: 2 posts 11/08 — 61 vulnerabilidades (Portifólio) + Douglas sumiu da subnet (Capivara) [pipeline] (`06cb903`)
- **revert(post)**: remove post do Douglas PC — não aprovado, nada sobre Samuel/Douglas PC (projeto errado) (`b8b5c96`)

### 🔒 Segurança
- gitleaks+bandit+opengrep scan (`889732c`)

- 6 commits no dia · push origin OK · HEAD: `146d60e`

## Sessão 2026-08-09 — 📝 Post Arachne: "O lock que nasceu no loop errado"
- **Post publicado (PT+EN)**: `arachne-o-lock-que-nasceu-no-loop-errado` (d54313f) — fix 457326e do Arachne: `_lock = asyncio.Lock()` no import preso ao loop do processo → workflow via threadpool dava RuntimeError "bound to a different event loop" + "browser agent não disponível neste worker" (intermitente 08-09/08). Fix: lazy init `_get_lock()` dentro do loop corrente (+16/-3, 2 usos).
- **⚠️ Bug cron one-shot release**: `LifeLog Release Posts 09/08` (a702b4b62614) criado com o argumento da data DENTRO do campo script (`lifelog-release-posts.py 2026-08-09`) → "Script not found". O script correto é `lifelog-release-posts.py` e a data vai no prompt. Post do dia publicado manualmente.
- **Crons de preview (1ff5884c8cfa + b2357e8e636b) estão PAUSADOS** (disabled) — sem preview automático desde 08/08 12:00.

---

## Sessão 2026-08-07 — 📝 Posts agendados (DRAFT) + posts novos PT/EN + Bug Hunter fix
- **Posts agendados 08-09/08 como DRAFT**: arachne pool de conexões (12h), capivara dashboard 994→262 (16h), tatuengine punição v3, descobertas i18n audit — não aparecem no site até publicar
- **Posts 08/08 adiantados**: arachne pool + capivara dashboard, PT+EN, pubDate 08/08 (0570258)
- **Posts novos publicados**:
  - `dogwalk-o-websocket-que-nao-apertava-a-mao` (PT+EN) — receive_text sem accept(), 5 endpoints mudos, fix 1 linha (45bd609)
  - `lifelog-a-saga-da-animacao-de-tema` (PT+EN) — 5 dias de whodunit CSS: stutter, origem errada, blend plus-lighter, node_modules fantasma (8b404c7)
- **fix(bug-hunter)**: remove rotas /tags inexistentes + valida status HTTP real (7a8f203)
- 6 commits · push origin OK · HEAD: `b813657`

---

## Sessão 2026-08-06 — 🚀 PWA + Perf mobile + VT fix + Bug Hunter
- **PWA completo**: service worker (cache-first assets, network-first posts, offline fallback), manifest com ícones 192/512 roxo LifeLog, apple-touch-icon, registro inline no BaseLayout
- **Perf mobile**: Android — 100dvh fixa toolbar flutuante, will-change:background-image pra GPU composite sem repaint
- **VT fix**: isolation:isolate no image-pair — sem isso o blend plus-lighter do Chromium vaza entre old/new
- **Bug Hunter LifeLog**: auditoria de render real (8 rotas PT/EN) — verificou que conteúdo SPA montou
- **Post**: descobertas-o-node-modules-fantasma (PT+EN) — o node_modules de 253MB na home que sequestrava builds Node do WSL
- HEAD: 734d81b · 6 commits · push origin OK

---

## 📋 Documentação Rápida

| Documento | Pra quê |
|-----------|---------|
| [README.md](README.md) | Visão geral, setup, arquitetura |
| [LIFELOG_MAP.md](LIFELOG_MAP.md) | Mapa completo — stack, pastas, schema, temas, CI/CD |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |
| `docs/OLD_STUFF.md` | Arquivo de docs antigos |

---

## ✅ Features Implementadas

### Conteúdo
- **51 posts bilíngues** (102 arquivos MDX: 51 PT + 51 EN) — projetos Arachne, Dogwalk, Capivara, Portfólio, TatuEngine + estudos + descobertas
- **i18n PT/EN** — Engine i18n custom, páginas espelhadas, sync checker no CI
- **Categorias:** 9 projetos registrados (`src/lib/projects.ts`) com cores, ícones e grupos
- **Capas AI** — Geração via Cloudflare Workers AI (FLUX.1 Schnell), script `scripts/generate_cover.py`
- **RSS Feed** + Sitemap XML

### Interface
- **Timeline grid** — Home com filtros por ano/projeto, DateSeparator
- **FilterBar** — Busca textual com embedded search index (JSON gerado no build via getCollection, embedado no HTML), URL params, result count
- **TagCloud** — Navegação por tags com contagem
- **PalettePicker** — 6 paletas de cor + dark/light toggle com persistência
- **TerminalWidget** — Terminal interativo na página Sobre (15+ comandos)
- **PostLayout** — Layout compartilhado com capa, navegação, posts relacionados
- **ProjectIcon** — Ícone + cor por projeto consistente

### Temas
- **6 paletas de cor** — Cada projeto com cor de destaque (accent) escura
- **Dark/Light** — Toggle com transição suave, persistência localStorage
- **Theme Rail** — Seletor lateral redesenhado com nomes+emojis
- **Cores inteligentes** — Dropdown de cores no mobile, animação fluida

### Performance & SEO
- **100% SSG** — Astro gera HTML estático, zero JS no build
- **Shiki syntax highlighting** — Dual theme (github-light + github-dark)
- **Responsivo** — Mobile-first, sem quebras no navbar

### CI/CD
- **GitHub Actions** (`deploy.yml`) — Validate → Build → Test → Deploy → Health check → Notify
- **Testes:** ? passando
- **Sync checker:** CI verifica sync PT/EN, health check inclui rotas EN
- **Deploy:** Vercel (build remoto, sem --prebuilt)
- **Ferramentas:** `pnpm` (Node 22+, corepack)

### Scripts
| Script | Função |
|--------|--------|
| `scripts/generate-cover.py` | Geração de capas via Cloudflare Workers AI |
| `scripts/check-lang-sync.py` | Verifica se posts PT/EN estão em sync |
| `scripts/cleanup-post.sh` | Limpeza de posts |
| `scripts/record-demo.{cjs,mjs}` | Gravação de demo E2E |
| `scripts/capture-*.mjs` | Captura de screenshots/video |

---

## 📁 Estrutura

```
lifelog/
├── src/
│   ├── content.config.ts          # Schema Zod: título, data, projeto, tags, capa
│   ├── content/posts/             # 51 posts bilíngues (PT + en/)
│   ├── components/                # 8 componentes Astro
│   │   ├── PostCard.astro         # Card da timeline (capa + info + tags)
│   │   ├── FilterBar.astro        # Busca + filtro ano/projeto (índice JSON embutido)
│   │   ├── PostLayout.astro       # Layout compartilhado de posts
│   │   ├── PalettePicker.astro    # Seletor de 6 paletas + dark/light
│   │   ├── TagCloud.astro         # Nuvem de tags com contagem
│   │   ├── TerminalWidget.astro   # Terminal interativo
│   │   ├── ProjectIcon.astro      # Ícone + cor por projeto
│   │   └── DateSeparator.astro    # Divisor de data na timeline
│   ├── layouts/BaseLayout.astro   # Layout global (navbar, SEO, temas)
│   ├── pages/                     # index, arquivo, sobre, post/[slug]
│   │   ├── en/                    # Páginas em inglês (espelhadas)
│   │   ├── post/[slug].astro      # Post individual
│   │   ├── rss.xml.ts / sitemap.xml.ts
│   │   └── 404.astro
│   ├── lib/                       # i18n.js, palettes.ts, projects.ts
│   └── styles/                    # global.css, themes.css
├── e2e/                           # 7 Playwright E2E specs
├── scripts/                       # Geração de capas, sync checker, demos
├── public/covers/                 # 61 capas AI (webp, 21:9)
├── .github/workflows/deploy.yml   # CI/CD Pipeline
├── astro.config.mjs               # Config Astro + Tailwind + MDX
└── package.json
```

---

## 🧪 Testes

- **Playwright E2E** (7 specs):
  - `lifelog.spec.ts` — Suite principal (51 posts bilíngues, filtros, RSS, 404, health)
  - `theme-rail.spec.ts` — Theme Rail seletor (getByLabel)
  - `record-demo.spec.ts` — Gravação de demo
  - `theme-mobile.spec.ts` — Tema no mobile (diagnóstico)
  - `a11y.spec.ts` — Acessibilidade axe-core (contraste WCAG + semântica)
  - `vrt.spec.ts` — Regressão visual (snapshots dark/light/mobile)
  - `security-headers.spec.ts` — DAST headers (produção)
- **Vitest:** 35 testes data-driven (`projects.test.ts`)

---

## 🔧 Comandos

| Comando | Ação |
|---------|------|
| `pnpm dev` | Dev server local |
| `pnpm build` | Build SSG |
| `pnpm preview` | Preview do build |
| `pnpm astro` | CLI Astro |
| `pnpm test:e2e` | E2E tests (CI) |
| `pnpm exec playwright test` | E2E local |

---

## 🔗 Links

- **Live:** https://lifelog-sepia.vercel.app
- **GitHub:** https://github.com/Samuelfmedeiros/lifelog
- **Deploy:** Push na master → CI/CD → Vercel
- **Gerenciador:** pnpm 10+

---

## Sistema de Postagem Oculta (15/08/2026)

Posts com `hidden: true` no frontmatter vão para o ar (deploy) mas ficam **invisíveis no site** até liberação manual pelo dono.

### Como funciona

1. **Frontmatter**: `hidden: true` (schema em `src/content.config.ts`).
2. **Filtro global**: TODAS as páginas filtram `!p.data.draft && !p.data.hidden` — home, arquivo, sobre, RSS, sitemap, busca, prev/next e `getStaticPaths` (rota direta vira 404).
3. **Admin**: `/ocultos` (não linkada) lista posts ocultos, mostra o conteúdo e tem botão "Liberar".
4. **Liberação**: `api/liberar.mjs` (Vercel Function) flipa `hidden: true` → `false` no MDX (PT+EN) **E regenera `api/ocultos-data.mjs` — TUDO num ÚNICO commit atômico** (Git Data API: blobs→tree→commit→ref; retry x3 re-buscando conteúdo fresco; cura de data stale em re-click) → CI roda → post aparece e painel atualiza no mesmo deploy. Self-heal no `deploy.yml`: data divergente do HEAD → commit de sync `[skip ci]`.
5. **Listagem**: `api/ocultos.mjs` lê o filesystem do deploy e retorna os ocultos (protegido por segredo).

### Env vars obrigatórias (Vercel)

- `ADMIN_SECRET` — segredo do /ocultos (Bearer no Authorization header).
- `GH_TOKEN` — token GitHub com permissão de escrita no repo (Contents API).

Sem `GH_TOKEN` a liberação responde 500 com mensagem clara; sem `ADMIN_SECRET` a listagem responde 401.

### Fluxo de uso

1. Pipeline cria post PT+EN com `hidden: true` → push → deploy (invisível).
2. Samuel abre `/ocultos`, entra com o segredo, lê o post.
3. Clica "Liberar" → commit com `hidden: false` → CI deploya → post público.

### Regras

- NUNCA linkar `/ocultos` na navbar ou em posts.
- CI health check pula posts com `draft: true` OU `hidden: true` (senão 404 derruba o deploy).
- Anti-emoji vale para a página admin também (0 emojis em `src/pages/ocultos.astro`).

## 📖 Narrative-First Pipeline (desde 24/07/2026)

**Auto-post diário (cron `6d90ce`) foi DESATIVADO.** Posts de changelog agregado não existem mais.

### Regras

1. **Cada post é um capítulo** — Setup → Conflito → Resolução. Sem arco narrativo, não publica.
2. **Um projeto por post** — Nunca agregar 2+ projetos no mesmo post.
3. **Código real** — Extraído do repositório com `search_files`/`read_file`. Nada de memória.
4. **Métricas verificáveis** — Números de commits, testes, build time. Nunca inventados.
5. **PT + EN** — Sempre bilíngue. Manter `project` ID em português.

### Grade de Conteúdo (sugestão)

| Dia | Projeto | História |
|-----|---------|----------|
| Sex 24/07 | LifeLog | "De auto-post a narrativa" |
| Sáb 25/07 | Dogwalk | Saga CI/CD |
| Dom 26/07 | Arachne | Multi-engine fallback |
| Seg 27/07 | Capivara | Dashboard analytics |
| Ter 28/07 | Portfólio | Vue 3.5 rebuild |
| Qua 29/07 | TatuEngine | BitMamba 1B |
| Qui 30/07 | Descobertas | FTS5 + sqlite-vec |

A grade é sugestão — se surgir história melhor,优先. Samuel revisa antes de publicar.

### Template

Ver `docs/narrative-template.md` — estrutura de 6 blocos, frontmatter, TerminalWidget.

### Pipeline de Criação

1. Verificar grade → qual projeto hoje?
2. Pesquisar estado real (commits recentes, PRs, bugs, decisões)
3. Escrever rascunho seguindo template
4. Gerar capa (`python3 scripts/generate-cover.py <slug>`)
5. Build + verificar
6. Samuel revisa → publicar / editar / pular

---

## 🗺️ Próximos Passos

- [x] Vitest unit tests (componentes) — 35 testes data-driven (02/08/2026)
- [x] PWA (service worker + offline) — 06/08/2026
- [ ] Mais paletas de cor
- [x] Busca full-text — embedded search index no build (22/07/2026)

---

- **4 commits** · push origin OK · HEAD: `2f880ce`

- **Post PT+EN**: tatuengine-seguranca-como-processo — politica de seguranca continua
- **Restaurado CSS VT**: identico ao bf98eff (animation:none + mix-blend-mode:normal) — sem animation:none o crossfade VT apaga o old snapshot
- **VT animation fix**: stutter + origem errada do circulo resolvidos (remove animation:none dos pseudos, restaura isolation:isolate, reset lastTouchX/Y pos-animacao)

## Sessao 2026-08-05 — Theme animation fix + Post seguranca
*Última atualização: 2026-08-05 · Fim de dia — VT fix + post tatuengine segurança*

---

## 🛡️ REGRA DE SEGURANÇA CONTÍNUA (04/08/2026)

> **"Segurança é acompanhamento."** — Samuel

- **A cada entrega:** `pnpm audit` + verificar headers no `vercel.json` + integridade do lockfile
- **Semanalmente:** revisar `docs/SEGURANCA.md` + atualizar inventário
- **Mensalmente:** revisar dependências (atualizar Astro, Tailwind, plugins)
- **Ao adicionar feature:** reavaliar superfície de ataque
- **Referências:** OWASP Top 10:2025, HttpArmor, OWASP Web Checklist
- **Cron:** `LifeLog Security Watchdog` (diário, 24h, silent unless issues)
- **Doc completo:** `docs/SEGURANCA.md`

---

## 🔴 ROGER + REGISTRO IMEDIATO (02/09/2026 — Samuel, GLOBAL)

**ROGER:** antes de declarar pronta/fazer deploy de QUALQUER entrega neste projeto, rodar o
test-loop obrigatório — skill `roger-test-loop` / `ai-test-loop` (orquestrador
`loop_orchestrator_unified.py`). Sem evidência real (testes + nota + PDF) NÃO é entrega.
Gate: UI=100, código=85. PDF relatório SEMPRE via MEDIA:.

**REGISTRO IMEDIATO:** toda alteração/coisa nova/caminho novo/mudança de workflow criada
NESTE projeto DEVE ser registrada no MESMO MOMENTO em que é criada — neste AGENTS.md
(arquivos, rotas, commands, endpoints novos), em skill (`skill_manage`) se repetível,
e em memory se infra/pitfall. "Feito" sem registro no ato = INCOMPLETO.


## Sessão 2026-09-03 — Fim de dia (docs)
- **3 posts novos (hidden, PT+EN):** seguranca — a fila que ninguem atende (supply chain, capa AI) (`1702214`); tatuengine — o step 322 (morte silenciosa + VRAM fantasma, capa NIM) (`57b86ef`); capivara — o CI que morria no meio do step (CI self-hosted + keepalive) (`3dd9933`).
- **Pipeline recusa→refazer:** 3 recusas com nota funcionando — tatuengine ×2 (capa alinhada ao texto "onda que flatline", issue #31, `bff8035`), capivara ×1 (tema trocado p/ seguranca path traversal, issue #32, `67234de`).
- **Capas watchdog:** regeneradas estudos/dogwalk/portfolio (`9752717`, `20866f5`, `79ac99b`).
- **Docs:** CHANGELOG [2026-09-03] já cobre o dia (commit `2797068`); esta seção completa o AGENTS.md.

## Sessão 2026-09-08 (noite) — Release atômico: liberar + ocultos-data em 1 commit
- **feat(release)**: `/api/liberar` agora faz UM commit útico atômico (mdx PT+EN + `api/ocultos-data.mjs`) via Git Data API (`d2efa0c`, branch `feat/release-atomic`) — painel nunca mais lista post já público após liberação (bug do 067da21). Retry x3 com re-busca de conteúdo fresco (nunca overwrite cego se main andou); twin candidates cobre nomenclatura `en/slug.mdx` e `en/en-slug.mdx`.
- **scripts/ocultos-core.mjs**: fonte única do formato do ocultos-data (parse/serialize byte-idêntico, provado por sha256 no build) — usado por `gen-ocultos.mjs` (build) e `api/liberar.mjs` (release).
- **deploy.yml**: step self-heal — se o data divergir do HEAD no build, commita `chore(ocultos): sync ocultos-data [skip ci]`.
- **Testes**: +15 unit (`src/lib/ocultos-core.test.ts`: round-trip, flip CRLF/LF, remoção do par, twin candidates) — suíte 89/89; lint 0 errors; build 1227 páginas; dry-run da coreografia Git Data 7/7 na API real (branch descartável, deletada).
- **Pendente**: Roger (gate `roger-lifelog-after-campaign.py` + cron 15m dispara quando RAM libera do treino Tatu) + push com OK do Samuel.

## Sessão 2026-09-09 — 3 posts no pipeline + releases atômicas
- **post(a)**: seguranca-toda-janela-e-uma-porta (PT+EN, hidden) — /tag vazava título e resumo de post oculto pelo getStaticPaths e pela nuvem de tags; achado não-bloqueante do Roger com nota máxima no gate; filtro compartilhado + teste por título no HTML público + par PT/EN (ff185ac).
- **post(b)**: arachne-tres-facas-do-flake (PT+EN, hidden) — 3 flakes reais da suíte: RNG sem semente no test_search_top_k, offline_net autouse virando opt-in por marker, asserts tautológicos dentro do pytest.raises (critic R3); 79 passed verificado no venv (0afb19d).
- **post(c)**: estudos-os-dez-segundos-de-silencio (PT+EN, hidden) — chamada LLM 200 OK com content vazio: reasoning models queimam o budget de tokens pensando e sobra zero pra resposta; teto de tokens com margem (pensamento+resposta) + parser SSE raspando data: [DONE] colado no chunk do JSON; capa AI Worker FLUX v3 com gate OCR (3bafb5b).
- **Releases**: post(a) liberado localmente (075b3b0); posts(b) e (c) liberados via release atômica Git Data direto no origin (96b0124, c76928c) — local realinhado por FF.
- 10 commits locais no dia · push origin OK pós-FF · HEAD: `c76928c`.
