# Plano: Correção de Filtros, Tags Clicáveis, PalettePicker e Posts PT/EN

**Data:** 2026-07-19
**Projeto:** LifeLog
**Status:** ⚡ Planejado

## Issues identificadas

### 1. Filtros "zerados" — posts com contagem 0

**Causa raiz:** Não é bug de filtragem — é que existem projetos no FilterBar que **não têm posts**:
- `seguranca` — 0 posts (projeto existe no PROJECTS, mas nunca foi usado)
- `lifelog` — 0 posts como project (só como tag)
- `estudos` — 0 posts

Além disso, alguns posts têm:
- Tags vazias (`tags:` sem conteúdo) — quebra a busca por tag
- Formato inconsistente (array sem aspas vs com aspas)

**O que fazer:**
- [ ] Esconder projetos sem posts das pills (ou mostrar contagem)
- [ ] Corrigir tags inconsistentes nos posts existentes

### 2. Tags clicáveis (novo feature)

Samuel quer tags agrupadas em algum lugar pra clicar e filtrar.

**O que fazer:**
- [ ] Adicionar seção de "Tags" no sidebar ou abaixo da FilterBar
- [ ] Coletar todas as tags únicas dos posts
- [ ] Cada tag clicável → ativa busca por aquela tag
- [ ] Agrupar por frequência (tags mais usadas primeiro)

### 3. PalettePicker / ThemeRail — verificar layout mobile

O ThemeRail tá em `PalettePicker.astro`. No mobile:
- Botões 30x30 (ok)
- Dropdown ajusta pra `right: 0` em vez de `left: 50%`
- FilterBar + ThemeRail podem quebrar juntos no header

**O que fazer:**
- [ ] Verificar se não há quebra no mobile testando o layout
- [ ] Garantir que FilterBar e ThemeRail não colidem

### 4. Posts PT e EN — essencial

**O que fazer:**
- [ ] Atualizar cron `lifelog-post-diario` pra gerar posts em PT e EN
- [ ] O cron já usa `src/content/posts/` pra PT e `src/content/posts/en/` pra EN

## Execução

Fase 1 — Corrigir filtros zerados + PalettePicker
Fase 2 — Tags clicáveis (planejar + implementar)
Fase 3 — Cron posts PT/EN
