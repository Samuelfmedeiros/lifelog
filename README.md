# 📖 LifeLog — Blog Pessoal de Samuel Medeiros

Dev · Projetos · Estudos · Descobertas

Stack: **Astro 7** · **MDX** · **Tailwind 4** · **Fuse.js** · **Playwright**

---

## 🏗️ Arquitetura

```
lifelog/
├── src/
│   ├── content/
│   │   ├── posts/          # Posts publicados (.mdx)
│   │   └── drafts/         # Rascunhos aguardando aprovação
│   ├── components/         # Astro componentes
│   ├── layouts/            # Layouts (BaseLayout, etc)
│   ├── pages/              # Páginas (Home, Arquivo, Sobre, Post)
│   └── styles/             # CSS (global.css, themes.css)
├── public/
│   ├── covers/             # Imagens de capa (geradas por AI)
│   └── patterns/           # SVGs temáticos por projeto
├── scripts/
│   ├── gerar_post.py       # Geração de posts via LLM (phi4/Ollama)
│   ├── generate_cover.py   # Geração de capas via AI (FAL Qwen)
│   ├── queue.py            # Gerenciador de fila de publicação
│   ├── collect.py          # Coleta de fontes (GitHub/Arachne/Telegram)
│   └── capture_demo.py     # Screenshots + vídeo de demonstração
└── package.json
```

---

## 🎨 Sistema de Temas por Projeto

Cada post tem identidade visual baseada no `project` do frontmatter:

| Projeto | Ícone | Cor | Estilo | Pattern |
|---------|-------|-----|--------|---------|
| Arachne | 🕷️ | Roxo `#7c3aed` | Cyberpunk hacker | Teia de aranha |
| Dogwalk | 🐶 | Verde `#84cc16` | Nature/tech | Pegadas |
| Portfólio | 🚀 | Ciano `#00d4ff` | Sci-fi nave | Grid/circuito |
| Capivara | 🐷 | Laranja `#f59e0b` | Tropical/tech | Ondas |
| Estudos | 📚 | Azul `#3b82f6` | Caderno digital | Grid linhas |
| Descobertas | 💡 | Azul céu `#38bdf8` | Descoberta | Bolhas de luz |

### Frontmatter de um post

```mdx
---
title: "Título do Post"
description: "Resumo..."
date: 2026-07-06
project: arachne        # Define o tema visual
tags: [busca, fts5]
cover: /covers/slug.webp # Imagem gerada por AI (ou gradiente fallback)
icon: 🕷️
---
```

Se `cover` não existir, o CSS aplica um gradiente temático automático.

---

## 🎬 AI Cover Generation (PLANEJADO)

### Conceito

Cada post ganha uma **imagem de capa única gerada por IA**, combinando:
- **Tema visual do projeto** (cores, estilo, elementos)
- **Conteúdo do post** (título, descrição, tags)
- **Estilo consistente** (cada projeto tem seu próprio estilo de imagem)

### Engine

| Prioridade | Engine | Custo | Detalhes |
|------------|--------|-------|----------|
| 1ª | **FAL Qwen Image** (Hermes `image_generate`) | ~$0.01-0.02/img | Já configurado, suporta aspect_ratio |
| 2ª | **Ollama** (modelo local) | Grátis | Se tiver modelo de imagem (ex: llava) |
| 3ª | **Gradiente CSS** | Zero | Fallback — já existe no themes.css |

### Prompt por Projeto

Cada projeto tem um **style guide** pro prompt de geração:

```python
PROJECT_STYLES = {
    "arachne": {
        "prompt_suffix": (
            "Cyberpunk aesthetic, dark background with purple neon accents. "
            "Data streams, web patterns, digital rain. "
            "Mood: mysterious, powerful, tech-noir. "
            "Style: digital art, rich contrast, volumetric lighting."
        ),
        "colors": ["#7c3aed", "#a78bfa", "#1a0f2e"],
        "composition": "Central focal point with geometric web patterns radiating outward",
    },
    "dogwalk": {
        "prompt_suffix": (
            "Nature-tech aesthetic, green organic shapes meeting clean technology. "
            "Paw prints, leaves, natural curves. "
            "Mood: fresh, energetic, friendly. "
            "Style: flat vector with gradients, clean lines."
        ),
        "colors": ["#84cc16", "#22c55e", "#052e16"],
        "composition": "Centered subject with organic flowing background elements",
    },
    # ... etc para cada projeto
}
```

### Workflow de Geração

```
gerar_post.py
  → Gera rascunho .mdx em drafts/
  → Salva com cover: null no frontmatter

generate_cover.py (NOVO)
  → Lê o .mdx do draft
  → Extrai: title, project, description, tags
  → Monta prompt combinando style guide do projeto + conteúdo
  → Chama FAL Qwen Image (via Hermes image_generate ou HTTP direto)
  → Salva imagem em public/covers/{slug}.webp
  → Atualiza frontmatter: cover: /covers/{slug}.webp

(queue.py approva → publica)
```

### Exemplos de Prompt

**Post Arachne — "FTS5 é Subestimado"**
```
"A blog post cover for the Arachne project about FTS5 search engine.

Style: Cyberpunk, dark purple background with neon accents.
Data streams flowing like search queries, digital web patterns.
A magnifying glass made of code, searching through data nodes.

Mood: technical, powerful, discovery.
Colors: deep purple (#7c3aed) on dark (#0f0a1a) with cyan highlights.

Text: 'FTS5 é Subestimado'
Composition: Central magnifying glass over a digital web, data streams
radiating outward. 16:9 aspect ratio, blog cover format."
```

**Post Estudos — "Python Async"**
```
"A blog post cover for Estudos project about Python Async/Await.

Style: Blueprint/study desk aesthetic, deep blue tones.
Code snippets floating, async arrows and await symbols as visual elements.
Clock showing parallel time flows.

Mood: focused, educational, "aha moment".
Colors: academic blue (#3b82f6) on dark navy (#0a1628) with warm paper accents.

Text: 'Python Async'
Composition: Open notebook with async code, paper planes representing
parallel tasks. 16:9 aspect ratio, blog cover format."
```

### Storage & Naming

```
public/covers/
├── o-comeco-do-arachne.webp    # slug do post
├── fts5-e-subestimado.webp
├── python-async.webp
└── ...
```

- Formato: **WebP** (bom equilíbrio qualidade/tamanho)
- Tamanho alvo: < 200KB
- Dimensão: 1200×675 (16:9, padrão de blog)
- Fallback automático: se a imagem não existir, o CSS usa gradiente

### Custo Estimado

| Cenário | Imagens | Custo |
|---------|---------|-------|
| Recovery (14 posts atuais) | 14 | ~$0.21 |
| Recovery + ajustes | ~20 | ~$0.30 |
| Por dia (2-4 posts) | 2-4 | ~$0.03-0.06/dia |
| Mensal (~90 posts) | 90 | ~$1.35/mês |

### Integração com o Pipeline

#### Opção A — Automático (recomendado)
O script `gerar_post.py` chama `generate_cover.py` ao final da geração.
Um comando: `python3 scripts/gerar_post.py "Título" --project arachne --generate-cover`

#### Opção B — Manual
`python3 scripts/generate_cover.py <slug>` — gera ou regera a capa de um post específico.

#### Opção B — Batch recovery
`python3 scripts/generate_cover.py --all` — gera capas pra todos os posts que não têm cover.

### Regeneração

Se não gostou da capa:
```bash
python3 scripts/generate_cover.py <slug> --retry
```
Isso gera um novo prompt (com seed diferente) e sobrescreve a imagem.

---

## 📡 Motor de Geração + Publicação (PLANEJADO)

Ver skill `lifelog-auto-post-plan` para detalhes completos.

### Fluxo
1. **Coleta** — `collect.py` puxa fontes (GitHub, Arachne, Telegram) → JSON
2. **Geração** — `gerar_post.py` + LLM (phi4/Ollama) → rascunho .mdx em `drafts/`
3. **Capa** — `generate_cover.py` → imagem AI → `public/covers/` + frontmatter
4. **Aprovação** — Telegram notifica Samuel → ✅ aprova / ✏️ edita / ❌ descarta
5. **Fila** — `queue.py` gerencia fila com 4 slots/dia (09, 13, 18, 21h)
6. **Publicação** — Cron Hermes → `queue.py publish` → Astro rebuild → Vercel deploy

---

## 🧪 Testes

```bash
pnpm test              # Playwright E2E (headless)
pnpm test:headed       # Playwright E2E (visível)
pnpm test:debug        # Playwright E2E (debug mode)
```

---

## 🚀 Deploy

```bash
pnpm build             # Build estático → dist/
pnpm preview           # Preview local em :4321
```

(Deploy na Vercel planejado — ver skill `lifelog-auto-post-plan`)

---

## 📝 Licença

Projeto pessoal — © 2026 Samuel Medeiros
