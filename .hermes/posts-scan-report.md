# Relatório de Escaneamento — Posts Restantes (Arachne, Portfolio, Capivara, Outros)

**16 posts escaneados** (excluídos TatuEngine e Dogwalk já verificados anteriormente)

---

## 🔴 ERROS E INCONSISTÊNCIAS CRÍTICAS

### 1. Versão do "v2" do Portfolio — contradição entre posts
- **`portifolio-samuel-redesign-identidade.mdx`** (linha 49): diz que v2 era *"HTML estático com CSS vanilla"* e que o rebuild foi para *Next.js 14* (chamado de v3).
- **`portfolio-v3-vue-35-vite-8-o-rebuild-que-eu-precisava.mdx`** (linha 14): diz que v2 era *"Next.js 16 + React 19, framer-motion, 5 mini-games"* e que o rebuild foi para Vue.
- ➡️ **Conclusão:** O "v2" se refere a versões diferentes nos dois posts. O primeiro chama de v2 o HTML estático; o segundo chama de v2 o Next.js. Versões inconsistentes.

### 2. Ordem das engines no pipeline Arachne — invertida entre posts
- **`pipeline-multi-engine-no-arachne-4-camadas-de-fallback.mdx`**: ordem é **Trafilatura → Crawl4AI SDK → Sidecar → Camoufox** (leve → pesado)
- **`arachne-pipeline-multi-engine-cache.mdx`** (linha 41-46): ordem é **Crawl4AI Sidecar → Crawl4AI SDK → Trafilatura → requests_bs4** (pesado → leve)
- ➡️ A ordem é completamente invertida e a engine final é diferente (Camoufox vs requests+BS4).

### 3. Número "1.892" usa separador decimal como milhar
- **`arachne-nasceu-frustracao-scrapers.mdx`** (linha 365-366): `"Cache hits | 1.892 (44.6%)"` e `"1.892 × 3s = ~94 minutos"`
- Em português, ponto separa decimais. "1.892" lê-se 1,892 (um vírgula oito), não 1892. O cálculo 1.892 × 3s = 5,676s, não 94 minutos.
- ➡️ **Deveria ser `1.892` (com vírgula como milhar) ou apenas `1892`.**

### 4. Domínios placeholder vs reais
- **`ecossistema-backups-seguranca-automacao.mdx`** (linha 62-64): usa `seusite.com` (placeholder)
- Todos os outros posts com domínios usam domínios reais: `seu.pet`, `capivara.seu.pet`, `portifolio-30.vercel.app`, `samuelmedeiros.vercel.app`
- ➡️ Inconsistência: placeholder escapou para produção.

### 5. Comentário em chinês no bash script
- **`ecossistema-backups-seguranca-automacao.mdx`** (linha 28): `# backup.sh — roda no cron每晚 às 3h`
- "每晚" é chinês (měi wǎn = "toda noite"). Misturado com português.
- ➡️ **Deveria ser:** `# backup.sh — roda no cron toda noite às 3h`

---

## 🟡 INCONSISTÊNCIAS DE FORMATAÇÃO DO FRONTMATTER

### 6. Formato de `tags:` — dois estilos diferentes misturados
**Array flow (YAML inline):** 9 posts usam `tags: ["tag1", "tag2"]`
- capivara-nasce, descobertas-julho, d1-sync, capivara-hub-pessoal-bagunca, primeiros-testes-crawl4ai, arachne-o-scraper, capivara-cresce, portfolio-v3-vue, testes-e2e

**Multi-line (bloco):** 7 posts usam `tags:\n  - tag1\n  - tag2`
- 5-jogos-melhorados, portifolio-samuel-redesign, arachne-nasceu, fts5-sqlite-vec, pipeline-multi-engine, ecossistema-backups, arachne-pipeline-multi-engine-cache

### 7. `icon:` com e sem aspas
- **Com aspas:** 16 posts (`icon: "🐷"`, `icon: "🕷️"`, etc.)
- **Sem aspas:** 10 posts (`icon: 🚀`, `icon: 🕷️`, `icon: 💡`)
- Ambos válidos em YAML, mas inconsistentes entre si.

### 8. `date:` com e sem timezone
- **Com timezone (+HH:MM):** `date: 2026-07-03 10:00:00 -03:00` — 11 posts
- **Sem timezone:** `date: 2026-06-25` — 5 posts
  - capivara-nasce, portifolio-samuel-redesign, arachne-nasceu, ecossistema-backups, arachne-pipeline-multi-engine-cache

### 9. `featured:` ausente em 1 post
- **`portfolio-v3-vue-35-vite-8-o-rebuild-que-eu-precisava.mdx`** — não tem campo `featured:` no frontmatter.
- Todos os outros 25 posts têm `featured: true` ou `featured: false`.

### 10. `title:` com e sem aspas
- **Com aspas:** maioria dos posts
- **Sem aspas:** arachne-nasceu (linha 2), ecossistema-backups (linha 3), arachne-pipeline-multi-engine-cache (linha 3)
- Válido em YAML, mas inconsistente.

---

## 🟠 TYPOS E ERROS DE DIGITAÇÃO

### 11. "busgas" → "buscas"
- **`fts5-sqlite-vec-busca-híbrida-no-arachne.mdx`** (linha 98): *"documentos relevantes para AMBAS as **busgas** sobem"*
- ➡️ **Deveria ser:** "buscas"

### 12. "cómodo" → "cômodo" (português europeu vs brasileiro)
- **`descobertas-de-julho-ferramentas-que-mudaram-meu-fluxo.mdx`** (linha 17): *"cómodo não é sinônimo de eficiente"*
- "cómodo" é grafia europeia. Em PT-BR é "cômodo". Resto do texto está em PT-BR.

### 13. "o scrapers" → "o scraper"
- **`arachne-o-scraper-que-virou-plataforma.mdx`** (linha 21): *"perdi uma base de dados inteira porque **o scrapers** de um e-commerce"*
- ➡️ **Deveria ser:** "o scraper" (singular)

### 14. "Tempo pra consolidar mês" → "Tempo pra consolidar o mês"
- **`capivara-hub-pessoal-bagunca-financeira.mdx`** (linha 211): *"Tempo pra consolidar mês"*
- ➡️ Falta artigo "o"

---

## 🔵 INCONSISTÊNCIAS DE CONTEÚDO

### 15. Path do projeto Arachne: `~/projetos/arachne` vs `~/projetos/Arachne`
- **`arachne-nasceu-frustracao-scrapers.mdx`** (linha 380): `cd ~/projetos/arachne` (minúsculo)
- **Outros 3 posts** (pipeline-multi-engine, arachne-o-scraper, fts5): `cd ~/projetos/Arachne` (maiúsculo)
- ➡️ O caminho real (Linux case-sensitive) precisa ser verificado.

### 16. URLs do Portfólio divergentes entre posts
- **`portfolio-v3-vue-35-vite-8-o-rebuild-que-eu-precisava.mdx`** (linha 161, 188): `portifolio-30.vercel.app`
- **`capivara-cresce-dashboard-analytics-e-controle.mdx`** (linha 73-74): staging = `safm3.vercel.app`, prod = `samuelmedeiros.vercel.app`
- ➡️ Possivelmente URLs diferentes em momentos diferentes, mas vale verificar se estão atualizadas.

### 17. Tabela de velocidades das engines — números divergentes
- `primeiros-testes-com-crawl4ai-sidecar-e-docker.mdx` (linha 134-138): Trafilatura **0.3s**, Crawl4AI SDK **1.1s**
- `arachne-nasceu-frustracao-scrapers.mdx` (linha 69-72): Trafilatura **1.5s**, Crawl4AI **2.5s**
- `arachne-o-scraper-que-virou-plataforma.mdx` (linha 55-58): Trafilatura **~0.5s**, Crawl4AI **~1.5s**
- `pipeline-multi-engine-no-arachne-4-camadas-de-fallback.mdx` (linha 459-462): Trafilatura **~250ms**, Crawl4AI SDK **~1.8s**
- ➡️ Números naturalmente variam conforme condições de teste, mas as diferenças são grandes (ex: Trafilatura varia de 250ms a 1.5s). Vale padronizar ou contextualizar.

### 18. Dogwalk: post de E2E incluso indevidamente
- `testes-e2e-com-playwright-a-virada-de-qualidade.mdx` tem `project: dogwalk` — é sobre Dogwalk (já escaneado em sessão anterior), mas o nome do arquivo não contém "dogwalk", então foi incluído.
- ⚠️ Não é erro, apenas nota sobre o critério de exclusão por nome de arquivo.

---

## ✅ COVER IMAGES
- **Todas as 26 capas** existem em `/public/covers/` com nomes correspondentes aos slugs. ✅

---

## 📋 SUMMARY

| Categoria | Qtde | Severidade |
|-----------|:----:|:----------:|
| Erros de conteúdo (números, contradições) | 5 | 🔴 Crítica |
| Typos/digitação | 4 | 🟠 Média |
| Formatação frontmatter inconsistente | 5 | 🟡 Leve |
| Inconsistências de conteúdo | 4 | 🔵 Info |
| Covers ausentes | 0 | ✅ |

**Arquivo gerado:** `.hermes/posts-scan-report.md`
