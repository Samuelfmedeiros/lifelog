#!/usr/bin/env bash
# Supervisor do preview do Astro para a suite E2E.
#
# Por que existe (medido 12/11/2026, run 43212364729):
#   O step "Start preview server" subia `npx astro preview &` UMA vez e ninguem
#   o levantava se morresse. A suite roda com workers=1 por ~45min. Em 11:53:55Z
#   o kernel matou um `node` DESTE cgroup (oom-kill, oom_score_adj:500) — as 550
#   primeiras navegacoes passaram. Em 12:17:51Z o preview morreu e, dali ate
#   12:33:33Z, 242 assercoes falharam com net::ERR_CONNECTION_REFUSED. CI
#   vermelho com o produto intacto: servidor morto nao e bug de codigo.
#
#   Um `&` simples nao tem quem o levante. Este supervisor mantem o preview vivo:
#   se o processo sair por qualquer motivo, ele sobe de novo e registra o restart
#   (rc, uptime) no log. O E2E continua gate honesto — falha de teste continua
#   vermelha; servidor derrubado por OOM/crash nao derruba a suite.
#
# Uso: bash scripts/preview-supervisor.sh [porta]
set -uo pipefail

PORT="${1:-${PREVIEW_PORT:-4321}}"
HOST="${PREVIEW_HOST:-127.0.0.1}"
STATE_DIR="${PREVIEW_STATE_DIR:-.preview-supervisor}"
LOG="$STATE_DIR/supervisor.log"
PREVIEW_LOG="$STATE_DIR/preview.log"
PIDFILE="$STATE_DIR/supervisor.pid"

mkdir -p "$STATE_DIR"

# Um supervisor anterior deste worktree nao pode sobreviver: estaria servindo um
# dist/ que acabou de ser reconstruido.
if [ -f "$PIDFILE" ]; then
  OLD=$(cat "$PIDFILE" 2>/dev/null || echo "")
  if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
    kill "$OLD" 2>/dev/null || true
    sleep 1
  fi
fi
echo "$$" >"$PIDFILE"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%SZ)" "$*" >>"$LOG"; }

# Medido: o kernel matou o node do preview com oom_score_adj:500 (o runner marca
# os filhos assim, tornando-os alvo preferencial). O preview e o processo mais
# caro da suite e o menos descartavel — puxamos o score dele para baixo. Sem
# choom, segue sem ajuste (nao e requisito da correcao).
if command -v choom >/dev/null 2>&1; then
  CHILDREN_PRIO=(choom -n -300 --)
  ADJ_NOTE="on(-300)"
else
  CHILDREN_PRIO=()
  ADJ_NOTE="off(choom ausente)"
fi

log "supervisor iniciado pid=$$ porta=$PORT host=$HOST oom_adj=$ADJ_NOTE"

restarts=0
while true; do
  started=$(date +%s)
  [ "$restarts" -gt 0 ] && log "restart #$restarts — subindo preview de novo"

  "${CHILDREN_PRIO[@]}" npx astro preview --port "$PORT" --host "$HOST" >>"$PREVIEW_LOG" 2>&1
  rc=$?
  lived=$(( $(date +%s) - started ))
  restarts=$((restarts + 1))
  log "preview saiu rc=$rc apos ${lived}s (restart #$restarts)"

  # Crash imediato (porta ocupada, dist/ ausente) nao pode virar laco apertado
  # que enche o disco de log: nesse caso espera crescente, teto 10s.
  if [ "$lived" -lt 5 ]; then
    backoff=$(( restarts * 2 )); [ "$backoff" -gt 10 ] && backoff=10
    log "saida rapida (<5s) — backoff ${backoff}s"
    sleep "$backoff"
  else
    sleep 1
  fi
done
