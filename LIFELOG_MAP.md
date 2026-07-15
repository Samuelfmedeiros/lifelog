# 🗺️ LifeLog — Mapa Completo do Projeto

> Gerado em: 2026-07-14
> Stack: Astro 7 · MDX · Tailwind 4 · TypeScript

---

## 1. Stack Tecnológica

| Componente | Escolha | Motivo |
|---|---|---|
| Framework | **Astro 7** | SSG nativo, zero JS no build, MDX integrado |
| Estilo | **Tailwind 4** (Vite plugin) | Utilitário, temas via CSS custom properties |
| Conteúdo | **MDX + content collections** | Schema validado com Zod, tipagem forte |
| Busca | **Fuse.js 7.4** (self-hosted /vendor/) | Fuzzy search, zero dependência externa |
| Fonte | **Inter** (Google Fonts) | Limpa, boa legibilidade técnica |
| Deploy | **Vercel** (GitHub auto) | CI/CD grátis, preview deployments |
| Capas AI | **Cloudflare Workers AI** (FLUX.1 Schnell) | Grátis, sem texto na imagem |
| Ícones | **Emoji unicode** | Zero dependência, consistente cross-platform |
| Gerenciador | **pnpm** | Mais rápido que npm/yarn, lockfile deterministic |

---

## 2. Arquitetura de Pastas

```
~/lifelog/
│
├── src/
│   ├── content.config.ts          # Schema Zod: título, data, projeto, tags, capa
│   ├── content/
│   │   ├── posts/                # 23 MDX posts
│   │   └── drafts/               # Rascunhos (.gitkeep)
│   │
│   ├── components/               # 6 componentes Astro
│   │   ├── PostCard.astro        # Card da timeline (capa + info + tags)
│   │   ├── FilterBar.astro       # Busca + filtro ano/projeto (JS client-side)
│   │   ├── DateSeparator.astro   # Divisor de data na timeline
│   │   ├── PalettePicker.astro   # Seletor de 6 paletas + dark/light toggle
│   │   ├── ProjectIcon.astro     # Ícone + cor por projeto
│   │   └── TerminalWidget.astro  # Terminal interativo na página Sobre
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro      # Layout global: navbar, SEO, fontes, temas
│   │
│   ├── pages/
│   │   ├── index.astro           # Home: timeline grid com filtros
│   │   ├── arquivo.astro         # Arquivo: agrupado por ano, stats
│   │   ├── sobre.astro           # Sobre + widget terminal
│   │   ├── post/[slug].astro     # Post individual com capa, navegação
│   │   └── rss.xml.ts            # Feed RSS
│   │
│   ├── lib/
│   │   └── palettes.ts           # Definição das 6 paletas de cor
│   │
│   └── styles/
│       ├── global.css            # Tailwind + estilos globais
│       └── themes.css            # Dark/Light + temas por projeto
│
├── public/
│   ├── covers/                   # 14 capas AI (FLUX.1, webp, 21:9)
│   └── patterns/                 # 5 SVGs de fundo (grid, notebook, paws, etc.)
│
├── scripts/
│   └── generate_cover.py         # Geração de capas via Cloudflare Worker
│
├── astro.config.mjs              # Config: site URL, Tailwind, MDX
├── package.json                  # Dependências
└── tsconfig.json                 # TypeScript strict
```

---

## 3. Schema de Conteúdo (content.config.ts)

```typescript
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    pubDate: z.date().optional(),
    project: z.enum(['arachne', 'dogwalk', 'portfolio', 'capivara', 'tatuengine', 'estudos', 'descobertas']),
    tags: z.array(z.string()),
    icon: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
  }),
});
```

### Fluxo de Dados
```
MDX Post (src/content/posts/)
  → Astro content collection (validado via Zod)
    → getCollection('posts') nas páginas
      → Renderiza MDX → HTML estático
        → Deploy Vercel (dist/)
```

---

## 4. Sistema de Temas

### 6 Paletas de Cor

| Paleta | ID | Acento Dark | Acento Light | Ícone |
|--------|----|------------|-------------|-------|
| Roxo | purple | `#a78bfa` | `#7c3aed` | 🟣 |
| Ciano | cyan | `#22d3ee` | `#0891b2` | 🩵 |
| Verde | emerald | `#34d399` | `#059669` | 🟢 |
| Âmbar | amber | `#fbbf24` | `#d97706` | 🟡 |
| Rosa | rose | `#fb7185` | `#e11d48` | 🩷 |
| Azul | blue | `#60a5fa` | `#2563eb` | 🔵 |

### 2 Temas (Claro/Escuro)
- **Dark** (default) — fundo `#0a0a0f`, texto `#e1e4e8`
- **Light** — fundo `#f5f2eb`, texto `#1a1a2e`

### Temas por Projeto
Cada post herda o `data-project` do frontmatter e aplica cores específicas via CSS:

| Projeto | Cor | Emoji | Ícone | Sensação |
|---------|-----|-------|-------|----------|
| arachne | Roxo | 🕷️ | 🕷️ | Cyberpunk |
| dogwalk | Verde | 🐶 | 🐶 | Nature-tech |
| portfolio | Ciano | 🚀 | 🚀 | Sci-fi |
| capivara | Âmbar | 🐷 | 🐷 | Tropical tech |
| tatuengine | Teal | 🌊 | 🌊 | Wave/Physics |
| estudos | Azul | 📚 | 📚 | Acadêmico |
| descobertas | Rosa | 💡 | 💡 | Etéreo |

### Persistência
```
localStorage: lifelog-theme | lifelog-palette
  → Script anti-flash no <head> (define antes do primeiro paint)
    → View Transitions API no toggle
```

---

## 5. Páginas e Fluxos

### 🏠 Home (index.astro)
- Timeline com post cards em grid (1 col mobile, 2 col desktop)
- Agrupado por data (DateSeparator)
- FilterBar: busca (Fuse.js) + filtro ano + filtro projeto
- Tudo client-side via JS (sem reload)
- Empty state quando nenhum post corresponde

### 📚 Arquivo (arquivo.astro)
- Stats cards: quantos posts por projeto
- Lista agrupada por ano
- Cada item: ícone, título, data, badge do projeto
- Links diretos para `/post/<slug>`

### ℹ️ Sobre (sobre.astro)
- Estatísticas totais (posts, projetos, desde)
- Terminal interativo com comandos: whoami, ls, skills, contact, date, etc.
- Links externos (Portfolio, GitHub, LinkedIn, RSS)

### 📝 Post Individual (post/[slug].astro)
- Capa AI 21:9 com glow
- Metadados: projeto, data, tempo de leitura, tags
- Conteúdo MDX renderizado com estilo tipográfico
- Navegação anterior/próximo post
- Breadcrumb → timeline

### 📡 RSS (rss.xml.ts)
- Feed RSS dos posts ordenados por data
- Usa `@astrojs/rss`

---

## 6. Componentes Detalhados

### PostCard.astro
- **Cover:** Imagem webp 21:9 ou placeholder com emoji
- **Badge:** Ícone + nome do projeto sobreposto na capa
- **Corpo:** Data, título, descrição, tags (max 3)
- **Hover:** Elevação + glow + translateY
- **CTA:** "Continuar lendo →"

### FilterBar.astro
- **Layout:** Single row minimalista: [busca | pills projeto | ano]
- **Search:** Input com ícone 🔎 + atalho ⌘K
- **Projetos:** 7 pills compactas (emoji + label)
- **Cor dinâmica:** Ao selecionar projeto, a barra inteira adota a cor do projeto (borda esquerda + glow)
- **Ano:** Dropdown minimalista
- **Fuse.js:** Self-hosted em `/vendor/fuse.mjs` (sem CDN)
- **Interação:** Tudo JS puro sem framework

### PalettePicker.astro
- **Toggle:** Pill compacto com indicador de cor ativa
- **Popover:** Grid 2×3 de dots com paletas, switch dark/light
- **Interação:** Tudo via JS puro (sem framework)
- **Transição:** Circle-wipe via View Transitions API

---

## 7. Sistemas Externos

### 🌐 Vercel (Deploy + CDN)
```
URL:           https://lifelog-sepia.vercel.app
GitHub:        https://github.com/Samuelfmedeiros/lifelog
Framework:     Astro 7
Build:         npm run build → dist/
Auto-deploy:   Push no main → Vercel CI
```

### 🤖 Cloudflare Worker (Capas AI) — Funcionando
```
Worker:        lifelog-capa
URL:           https://lifelog-capa.samuelandrademedeiros.workers.dev
Modelo:        @cf/black-forest-labs/flux-1-schnell
API Key:       {configurada no worker}
Estilo:        Sem texto, tema por projeto
Script:        ~/lifelog/scripts/generate-cover.py
Uso:           python3 scripts/generate-cover.py <slug>
               python3 scripts/generate-cover.py --all
```

### 📰 RSS
```
Endpoint:      /rss.xml
Formato:       RSS 2.0
Conteúdo:      Todos os posts ordenados por data
```

### 🔍 Busca (Fuse.js)
```
CDN:           https://cdn.jsdelivr.net/npm/fuse.js@7.4.2/dist/fuse.mjs
Keys:          title, desc, tags, project
Threshold:     0.4 (fuzzy)
Distance:      100
Lazy:          Só carrega quando usuário digita ≥2 chars
Fallback:      String.includes() se CDN falhar
```

### 💾 Backup
```
Script:        ~/.hermes/scripts/lifelog-backup.sh
Cron:          Backup LifeLog (diário) — 02:00 BRT
Destino:       /mnt/f/Samuel Backup/backups/lifelog/
Rotação:       7 backups
Tamanho:       ~25MB compactado
Exclui:        node_modules, .astro, dist, .git, .vercel, demos
```

---

## 8. Pipeline de Postagem

### Fluxo Atual
```
1. IDEA (sessão Hermes / LLM)
2. GERA MDX → src/content/posts/<slug>.mdx
3. GERA CAPA → scripts/generate_cover.py <slug>
4. VALIDA → npm run build (AST check)
5. COMMIT + PUSH → GitHub
6. DEPLOY → Vercel auto
```

### Fluxo Automático (queue.json)
```
src/content/drafts/queue.json
  → Pipeline gerador (LLM phi4) → MDX
    → Gera capa (Worker AI)
      → Commit + Push automático
```

### Posts Atuais (23)

| Post | Projeto | Data |
|------|---------|------|
| Dogwalk — a primeira ideia do marketplace de pets | dogwalk | Mai |
| FastAPI + React — por que escolhi essa stack pro Dogwalk | dogwalk | Mai |
| O início do Dogwalk — quando resolvi criar um marketplace de pets | dogwalk | Mai |
| Primeiro deploy do Dogwalk — Vite + Cloudflare Pages | dogwalk | Mai |
| Primeiros passos — infraestrutura e as primeiras linhas de código | dogwalk | Mai |
| Capivara nasce — preciso de um hub pessoal seguro | capivara | Mai |
| O Arachne nasceu de uma frustração — scrapers quebrados e dados perdidos | arachne | Jun |
| Arachne — o scraper que virou plataforma | arachne | Jun |
| Primeiros testes com Crawl4AI — Sidecar e Docker | arachne | Jun |
| Pipeline multi-engine no Arachne — 4 camadas de fallback | arachne | Jun |
| Arachne cresce — pipeline multi-engine e cache inteligente | arachne | Jun |
| Capivara: hub pessoal contra a bagunça financeira | capivara | Jun |
| Capivara cresce — dashboard, analytics e controle | capivara | Jun |
| Dogwalk: primeiros componentes de autenticação | dogwalk | Jun |
| Dogwalk amadurece — testes Playwright como backbone de qualidade | dogwalk | Jun |
| Testes E2E com Playwright — a virada de qualidade | dogwalk | Jun |
| Portfolio v3 — Vue 3.5 + Vite 8, o rebuild que eu precisava | portfolio | Jun |
| Portifolio Samuel — o redesign que buscou identidade | portfolio | Jun |
| TatuEngine — primeiros experimentos com wave field theory | tatuengine | Jun |
| BitMamba 1B — treinando o primeiro modelo SSM | tatuengine | Jun |
| D1 Sync — levando dados do Capivara pro Cloudflare | capivara | Jun |
| O ecossistema toma forma — backups, segurança e automatização | descobertas | Jun |
| Descobertas de Julho — ferramentas que mudaram meu fluxo | descobertas | Jul |

---

## 9. Changelog

### v1.2.0 (14/07/2026)
- [x] **23 posts publicados** — de 14 para 23, cobrindo todos os projetos
- [x] **TatuEngine** — novo projeto suportado (teal/wave theme, schema, paleta)
- [x] **CI/CD Pipeline** — GitHub Actions com validação, build, E2E tests, deploy Vercel + health check
- [x] **Deploy automatizado** — push no main → Vercel deploy + notificação Telegram
- [x] **E2E Playwright** — testes headless no CI, preview server dedicado
- [x] **Schema expandido** — `pubDate`, `draft`, `tatuengine` adicionados ao content.config.ts

### v1.1.0 (07/07/2026)

### ✅ Realizado
- [x] **Sitemap.xml** — SEO gerado automaticamente com todas as URLs
- [x] **OpenGraph dinâmico** — og:title, og:description, og:type, og:url, og:site_name + Twitter Cards por página
- [x] **Cover como OG Image** — posts com capa compartilham a imagem no link preview
- [x] **Fuse.js self-hosted** — `/vendor/fuse.mjs`, sem dependência de CDN
- [x] **FilterBar redesign** — single row minimalista com busca + pills projeto + ano
- [x] **Cor dinâmica** — barra muda de cor ao selecionar projeto (borda + glow)
- [x] **Fade-in cards** — animação com stagger delay nos posts
- [x] **Página 404** — customizada com tema do LifeLog
- [x] **Backup automático** — cron diário 02:00 BRT (script lifelog-backup.sh)

### 🔧 Ideias para Próximas Versões
- [ ] **Pipeline de postagem automática** — LLM gera MDX, worker cria capa, commit + push
- [ ] **Loading state** na busca (Fuse.js import pode ser lento)
- [ ] **Tema por post** via data-project no layout (já funciona)
- [ ] **Tags clickáveis** na home (via URL params)
- [ ] **Animações de entrada** mais sofisticadas (intersection observer)
- [ ] **Modo de visualização** (grid/lista)

---

## 10. Comandos Úteis

```bash
# Desenvolvimento
cd ~/lifelog
pnpm dev                # localhost:4321

# Build
pnpm build              # → dist/
pnpm preview            # preview local

# Deploy (via CLI)
vercel deploy --prod --token $VERCEL_TOKEN

# Gerar capa
python3 scripts/generate_cover.py <slug>
python3 scripts/generate_cover.py --list-missing

# Backup manual
bash ~/.hermes/scripts/lifelog-backup.sh

# Ver logs Vercel
vercel logs --token $VERCEL_TOKEN
```
