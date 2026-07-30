# Post Structure — LifeLog Craft Rule

## Narrative Pattern
Every post is a **chapter** — setup → conflict → resolution. One project per post.

### 6-block template
1. **Abertura** — context, what was happening at the time
2. **Narrativa com código** — real code from the repo, decisions made
3. **Tradeoffs** — what was tried, what was discarded
4. **Aprendizados** — lessons, ROOT CAUSE insights
5. **Tabela de métricas** — verifiable numbers (commits, tests, build time)
6. **TerminalWidget** — interactive terminal at the end

### Hard rules
- ALWAYS bilingual PT + EN (separate .mdx files)
- `project` ID stays in Portuguese (e.g. `descobertas`, NOT `discoveries`)
- NEVER aggregate 2+ projects in one post
- Code blocks: real backticks (```), never escaped
- `import Terminal from '../../components/TerminalWidget.astro'` (NOT `Terminal.astro`)
- No `draft: true` in frontmatter of published posts

### Frontmatter
```yaml
title: "Título do Post"
description: "Resumo de 1-2 frases"
date: YYYY-MM-DD HH:MM:SS -03:00
pubDate: YYYY-MM-DD HH:MM:SS -03:00
project: <project-id>
tags: [tag1, tag2]
icon: "🕷️"
cover: /covers/slug.webp
featured: false
```

### Pitfalls
- Dates MUST include `-03:00` timezone (otherwise parsed as UTC, off by one day)
- Cover filename MUST match slug exactly
- Double-check that features claimed exist in REAL running code, not just git history
- TerminalWidget commands: escape quotes carefully (backslash proliferation)
- Git hook blocks `*_TOKEN`, `*_SECRET`, `*_PASSWORD` even in examples
