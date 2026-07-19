# Plano: Pipeline de Postagens Diárias Automáticas (LifeLog)

**Data:** 2026-07-19
**Projeto:** LifeLog
**Status:** ⚡ Implementação

## Problema
Postagens diárias são manuais — preciso criar MDX, gerar capa, buildar, comitar. O projeto foi planejado desde o início para ter postagens automáticas diárias, com um cron que entrega o preview para Samuel avaliar.

## Já existe
1. **`lifelog-post-diario`** (job_id: `6d90ce55741c`) — Cron agendado 12:00 todo dia, nunca rodou
2. **`LifeLog Preview (confirmação manual)`** (job_id: `1ff5884c8cfa`) — Preview 09/14/19h (redundante com o de cima)
3. **`generate-cover.py`** — Geração de capas AI via Cloudflare Worker
4. **Template MDX** — Estrutura de posts já definida (frontmatter, cover, tags)

## Pipeline (implementado)

### Cron `lifelog-post-diario` (12:00 todo dia)
1. Coleta contexto dos commits recentes + sessões do dia
2. Cria post MDX com frontmatter (date=today, pubDate=today)
3. Gera capa via `python3 scripts/generate-cover.py <slug>`
4. Build `pnpm run build` pra verificar
5. Se build OK → entrega preview AQUI no grupo Portifólio (com attach_to_session)
6. Samuel responde:
   - ✅ "pode postar" ou "vai" → commit + push → Vercel auto-deploy
   - ✏️ "corrige X" → ajusta e re-apresenta
   - ❌ "descarta" → remove o post

### Mudanças feitas
1. Cron `lifelog-post-diario` atualizado com prompt completo e `attach_to_session: true`
2. Cron `LifeLog Preview` mantido como fallback (pode ser removido se redundante)

## Critério de sucesso
- Todo dia ao 12:00, um post novo chega aqui pra Samuel avaliar
- Samuel pode responder "vai", "corrige", ou "descarta"
- Se "vai", o post é commitado e deployado automaticamente
