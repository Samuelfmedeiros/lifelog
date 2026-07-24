# Plano: LifeLog — De Changelog a Narrativa

**Data:** 2026-07-24
**Autor:** Hermes (para Samuel)
**Status:** 📋 Planejado

---

## 1. Diagnóstico — O Problema

### Estado Atual

O LifeLog tem 2 pipelines de produção:

| Pipeline | Funcionamento | Problema |
|----------|--------------|----------|
| **Auto-post diário** (cron `6d90ce`) | Agrega commits de 24h → post único | Cria "relatório", não história. Mesmo formato todo dia |
| **Kanban Preview** (cron `1ff5884c`) | Seleciona tópico da fila → preview → Samuel aprova | Melhor, mas ainda opera em modo "fila de assuntos" |

O auto-post diário **é o inimigo da narrativa**:
- Post único misturando commits de Arachne + Dogwalk + Capivara no mesmo dia
- Sem arco, sem tensão, sem resolução
- "24/07 — Atualizações nos projetos" não vira capítulo de nada
- Leitor não se importa com "o que comitei hoje" — se importa com "o que aprendi / construí / superei"

### Causa Raiz

O pipeline foi desenhado pra **preencher calendário** (quantidade), não pra **construir história** (qualidade). A métrica era "N posts/dia" quando deveria ser "N histórias boas/semana".

---

## 2. A Nova Direção — Narrativa de Projetos

### Princípios

1. **Cada post é um capítulo** — Não existe post sem arco narrativo (setup → conflito → resolução)
2. **Um projeto por post** — Nunca agregar 2+ projetos no mesmo post
3. **Cronologia, não atualidade** — A história é contada em ordem, mesmo que publicada semanas depois
4. **Código real, decisões reais** — O post parece ter sido escrito na época, com os erros e acertos
5. **Sazonalidade** — Projetos têm "temporadas" (S1, S2) com começo, meio e fim

### Formato do Post Narrativo

```
Título: <Ação> + <Projeto> + <Consequência>
         Ex: "Como o Dogwalk aprendeu a fazer deploy sem chorar"
         Ex: "O dia que o Arachne engoliu 4 fallbacks e não morreu"

Estrutura:
1. ⚡ Abertura (gancho) — 1 parágrafo que captura o conflito
2. 🧠 Contexto — O que levou a esse momento
3. 🔧 A luta — Código real, decisões, debugging, tentativas
4. 💡 Resolução — O que funcionou e por quê
5. 📊 Métricas — Tabela real de antes/depois
6. 🎯 Aprendizados — O que fica pra próxima
7. 💻 TerminalWidget — Comandos/Trechos interativos
```

### Grade de Conteúdo (próximos 7 dias)

Em vez de "um post por dia sobre tudo", cada dia foca **um projeto específico** em ordem que constrói cronologia:

| Dia | Projeto | História |
|-----|---------|----------|
| Sex 24/07 | LifeLog | "De auto-post a narrativa — porque matei o cron diário" |
| Sáb 25/07 | Dogwalk | Saga do deploy CI/CD (o debug que virou guerra) |
| Dom 26/07 | Arachne | Multi-engine fallback: como 4 camadas viram 1 pipeline |
| Seg 27/07 | Capivara | O dia que o dashboard do Capivara virou operação |
| Ter 28/07 | Portfólio | Vue 3.5 → o rebuild que não era só design |
| Qua 29/07 | TatuEngine | BitMamba 1B: treinar um SSM do zero |
| Qui 30/07 | Descobertas | FTS5 + sqlite-vec: busca híbrida que mudou o RAG |

**Cada história é independente mas a sequência forma um "snapshot do ecossistema" — uma temporada.**

---

## 3. Mudanças Concretas

### 3.1 Desativar Auto-Post Diário (Ação IMEDIATA)

**Job:** `lifelog-post-diario` (job_id: `6d90ce55741c`)
- ⏸️ Pausar o cron — não matar (pode reativar depois)
- Motivo: ele gera o post agregado que Samuel NÃO quer

### 3.2 Transformar Kanban Preview em "Editor de Histórias"

O cron `1ff5884c8cfa` (LifeLog Preview) continua, mas com novo propósito:

**Antes:** Selecionar tópico da fila → preview genérico
**Depois:** 
1. Verificar grade de conteúdo (qual projeto hoje?)
2. Pesquisar estado real do projeto (commits recentes, bugs, decisões)
3. Escrever rascunho narrativo seguindo o formato acima
4. Criar task Kanban com preview
5. Samuel revisa: `publicar` / `editar: <pedido>` / `pular`

### 3.3 Novo Post Template

Criar template narrativo em `src/lib/post-template.md` como referência para escrita:

```yaml
---
title: "Título narrativo com verbo"
description: "Resumo que conta o conflito, não descreve o conteúdo"
date: 2026-XX-XX 00:00:00 -03:00
pubDate: 2026-07-24 00:00:00 -03:00
project: <projeto>
tags: [tag1, tag2]
icon: "🕷️"
cover: /covers/<slug>.webp
featured: false
---
```

### 3.4 Atualizar AGENTS.md e Skills

- Remover referência ao auto-post diário como padrão
- Adicionar seção "Narrative-First Posting"
- Atualizar o lifelog skill com a nova regra

### 3.5 Tratamento dos Posts Existentes

Posts antigos (agregados) NÃO são apagados — eles viram "registro histórico". A partir de hoje, todos os posts novos seguem o modelo narrativo.

---

## 4. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Menos posts publicados (1/dia → 1/dia mas melhor) | Baixo | Qualidade > quantidade. Samuel decide o ritmo |
| Grade engessada demais | Médio | Grade é sugestão, não regra. Se surgir história melhor,优先 |
| Post demora mais pra escrever | Médio | Usar delegate_task pro research + rascunho |
| Perder o hábito de postar | Baixo | Cron de lembrete diário (não de escrita automática) |

---

## 5. Execução

### Fase 1 — Setup (hoje)
- [ ] Pausar cron auto-post diário
- [ ] Salvar este plano
- [ ] Criar template narrativo
- [ ] Atualizar AGENTS.md

### Fase 2 — Primeiro Post (hoje)
- [ ] Escrever "De auto-post a narrativa" (projeto lifelog)
- [ ] Build + E2E
- [ ] Commit + Push

### Fase 3 — Ritmo (diário)
- [ ] Seguir grade de conteúdo
- [ ] Cada dia = 1 história de 1 projeto
- [ ] Samuel revisa antes de publicar

---

*Fim do plano.*
