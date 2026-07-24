# Template de Post Narrativo — LifeLog

> Todo post conta uma história. Setup → Conflito → Resolução.

## Frontmatter

```yaml
---
title: "Verbo + Projeto + Consequência"
description: "Resumo que conta o conflito, não descreve o conteúdo"
date: 2026-XX-XX 00:00:00 -03:00
pubDate: 2026-07-24 00:00:00 -03:00
project: <arachne|dogwalk|portfolio|capivara|tatuengine|estudos|descobertas>
tags: [tema-central, decisão, aprendizado]
icon: "🕷️"
cover: /covers/<slug>.webp
featured: false
---
```

## Estrutura (6 blocos)

### 1. ⚡ Abertura (gancho)
1 parágrafo — captura o conflito central. Por que esse momento importa?
> "Tinha tudo pra dar errado. O deploy do Dogwalk tava quebrando no CI há 3 dias, e eu já tinha tentado 4 abordagens diferentes sem sucesso."

### 2. 🧠 Contexto
O que levou a esse momento? Qual era o estado do projeto antes? Decisões anteriores que importam.
> "O Dogwalk começou com FastAPI + asyncpg, deploy manual via rsync. Quando migrei pra Cloudflare Pages, o CI/CD virou um pesadelo de debug."

### 3. 🔧 A luta
**Coração do post.** Código REAL, decisões, debugging, tentativas e erros. Incluir:
- Trechos de código que mostram o problema
- Raciocínio por trás das escolhas
- Pelo menos UM momento de "quase desisti"
- Comandos reais que rodaram

> ```python
> # Tentativa 1: wrangler deploy direto
> # Falhou com "Invalid multipart upload"
> # Root cause: wrangler-action v3 tinha bug de Node 22
> ```

### 4. 💡 Resolução
O que funcionou e por quê. A descoberta. O "aha!" moment.
> "A solução era trivial: voltar pra Global API Key + Email em vez de wrangler-action. Ninguém no GitHub Issues tinha postado isso."

### 5. 📊 Métricas / Tabela
Dados reais de antes/depois. NUNCA números inventados.

| Métrica | Antes | Depois |
|---------|-------|--------|
| Deploy time | 4 min (com falha) | 47s |
| CI pass rate | 60% | 100% |
| Linhas de YAML | 85 | 42 |

### 6. 🎯 Aprendizados + 💻 TerminalWidget
O que fica pra próxima. `TerminalWidget` com os comandos mais úteis.

```astro
import Terminal from '../../components/TerminalWidget.astro'

## O que aprendi

- Debug de CI é 90% log, 10% código
- A solução mais simples é a que você ignora primeiro

<Terminal commands={[
  { cmd: 'echo "lição aprendida"', description: 'O comando que resolveu tudo' }
]} />
```

## Regras de Ouro

- **Um projeto por post** — nunca agregar 2+ no mesmo
- **Código real** — extrair do repositório com search_files/read_file, não escrever de memória
- **Primeira pessoa** — "eu tentei", "descobri", "quebrei"
- **Números verificáveis** — métricas de commits, testes, build time
- **Nada de "post diário"** — data = quando o evento aconteceu, pubDate = quando publicamos
- **PT + EN** — sempre bilíngue
