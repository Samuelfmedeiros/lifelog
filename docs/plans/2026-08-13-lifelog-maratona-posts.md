# Plano: Maratona de Posts LifeLog — 13 a 16/08/2026

**Status:** ✅ APROVADO (Samuel, 13/08/2026 21:54)
**Cron:** `190d5fc10f11` — LifeLog Auto-Publish Maratona (14-16/08), schedule `0 12,16 * * *`, repeat 6, deliver origin
**Regra:** publicação DIRETA sem aprovação (exceção autorizada até domingo 16/08); depois volta fluxo normal (previews + aprovação)

## Grade aprovada (mapa fixo de conteúdo)

| Slot | Projeto | Posts | Tema do post |
|---|---|---|---|
| Sex 14/08 12:00 | Descobertas | 9→10 | O fantasma do ::1 — quando localhost travava e 127.0.0.1 não |
| Sex 14/08 16:00 | Portifólio | 10→11 | A região de projetos — quando o filtro perdeu pra simplicidade |
| Sáb 15/08 12:00 | Estudos | 2→3 | O ano em que estudei ondas — wave field theory e os modelos de sequência |
| Sáb 15/08 16:00 | Capivara | 10→11 | O hub que virou memória — samuel-memory, espelhos e o Qdrant |
| Dom 16/08 12:00 | Segurança | 3→4 | A caça ativa — quando a auditoria achou o banco sem tranca |
| Dom 16/08 16:00 | Arachne | 11→12 | O Arachne ganhou olhos — VLM, fila de jobs e cache de visão |

## Conteúdo por post (detalhado)

### Post 1 — Sex 14/08 12:00 · Descobertas (9→10)
- **Título:** O fantasma do ::1 — quando localhost travava e 127.0.0.1 não
- **Tema:** debug de travamento intermitente: 'localhost' falha, '127.0.0.1' funciona (loopback IPv6)
- **Fatos reais:** no Windows 'localhost' resolve para IPv6 ::1 primeiro e a conexão trava; '127.0.0.1' força IPv4 — confirmado 88x; regra: usar 127.0.0.1 SEMPRE
- **Lições:** localhost ≠ 127.0.0.1 no Windows; sintoma intermitente de rede pode ser loopback IPv6
- **Estrutura:** setup serviço local travando → conflito intermitência → resolução 88x provam o padrão

### Post 2 — Sex 14/08 16:00 · Portifólio (10→11)
- **Título:** A região de projetos — quando o filtro perdeu pra simplicidade
- **Fatos:** cards 2 col desktop, capas 16:9, descrições PT/EN, badge 'Do Blog', mobile 1 col, touch ≥18px, tema claro/creme padrão com toggle respeitado; filtro por categoria REJEITADO

### Post 3 — Sáb 15/08 12:00 · Estudos (2→3)
- **Título:** O ano em que estudei ondas — wave field theory e os modelos de sequência
- **Fatos:** TatuEngine wave-based, Mamba SSM, BitMamba-2 1B, loop de truncamento Ollama (num_ctx)
- **🔴 PROIBIDO:** receita do codec (BlockLens, kernels, thresholds, SHAs, arquivos internos, benchmarks) — só narrativa + resultados

### Post 4 — Sáb 15/08 16:00 · Capivara (10→11)
- **Título:** O hub que virou memória — samuel-memory, espelhos e o Qdrant
- **Fatos:** Qdrant 127.0.0.1:6333, mem0, regra dos espelhos Win↔WSL

### Post 5 — Dom 16/08 12:00 · Segurança (3→4)
- **Título:** A caça ativa — quando a auditoria achou o banco sem tranca
- **Fatos:** ZAP, gitleaks, bandit, opengrep em TODOS projetos; achados: banco sem tranca, permissão navegador, rota entregando dados, chave exposta, input sem tratamento; watchdog automático

### Post 6 — Dom 16/08 16:00 · Arachne (11→12)
- **Título:** O Arachne ganhou olhos — VLM, fila de jobs e cache de visão
- **Fatos:** qwen2.5vl:7b Ollama WSL, fila arachne-vlm-jobs + worker arachne-vlm-w1, cache sqlite vlm_cache.db (sha256), polling GET /api/extract/image-jobs/{id}, visão exige JWT, PYTHONPATH api/ e PostgreSQL não SQLite

## Regras de ouro
- NUNCA confirmar post sem URL 200 (verificação ≠ produção)
- NUNCA inventar fatos — posts usam commits/arquivos/números reais
- 🔴 NUNCA expor infra pessoal (IPs LAN, senhas, SSIDs) nem receita TatuEngine
- Commit cirúrgico (só arquivos do post + capa)
- Retry em falha de rede (DNS WSL cai com RAM crítica — sleep 15-30s)
- Se o script escolher projeto diferente do mapa → SEGUIR O MAPA (aprovado pelo Samuel)

## Pipeline (passos do cron)
1. `lifelog-post-gen.py` (WSL) → projeto do horário; conferir com mapa
2. Escrever post PT + EN (setup → conflito → resolução; en/ usa `../../../components/TerminalWidget.astro`)
3. Capa: `lifelog-cover-gen.py` (PIL, WEBP 2100x900, paleta do projeto)
4. `check-lang-sync.py` + `pnpm build` (build 100%)
5. Commit cirúrgico + push (DNS cai → retry 3x)
6. Verificar ao vivo via PowerShell (HTTP 200 PT + EN em lifelog-sepia.vercel.app)
7. Reportar resumo no grupo Portifólio

## Pós-maratona (17/08+)
- Cron para sozinho (repeat=6)
- Resumir crons de preview `1bff11520f08` (12h) e `3c9a2c8c9352` (16h)
- Voltar fluxo normal: previews + aprovação do Samuel
- Opcional: manter grade por carência como padrão

## Artefatos
- PDF aprovado: `LifeLog-Plano-Postagens-13a16-08-2026.pdf` (3 páginas, grade + conteúdo detalhado)
- Script: `~/.hermes/scripts/lifelog-post-gen.py` (carência + CATCHUP 9 + gap 2 dias)
- Covers: `~/.hermes/scripts/lifelog-cover-gen.py` (paletas incl. seguranca)
