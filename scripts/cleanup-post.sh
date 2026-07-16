#!/usr/bin/env bash
# cleanup-post.sh — Remove artefatos temporários/debug após publicação
#
# Uso: scripts/cleanup-post.sh              # limpa raiz + public/
#      scripts/cleanup-post.sh --dist        # limpa dist/ também (CI)
#      scripts/cleanup-post.sh --dry-run     # só mostra o que seria deletado
#
# Remove automaticamente:
#   - .preview-*.mdx          (preview gerado antes do publish)
#   - public/demo-*.mp4       (vídeos de demonstração)
#   - public/demo-*.webm
#   - public/test-light*.png  (screenshots de teste de tema)
#   - public/light_*.png
#   - public/*-test*.png
#   - public/page-*.webm
#   - raiz/demo-*.mp4
#   - raiz/demo-*.webm
#   - raiz/*.webm
#   - raiz/.tmp_frames/       (frames temporários)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

DRY_RUN=false
CLEAN_DIST=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --dist)    CLEAN_DIST=true ;;
  esac
done

RM="rm -rf"
$DRY_RUN && RM="echo [dry-run] rm -rf"

echo "🧹 LifeLog — Post-publish cleanup"
echo "   Root: $PROJECT_ROOT"
$DRY_RUN && echo "   [DRY RUN — nothing will be deleted]"
echo ""

# ── 1. Preview files ──────────────────────────────────────────────
echo "── Preview files ──"
PREVIEWS=( .preview-*.mdx )
if [ -f "${PREVIEWS[0]}" ] 2>/dev/null || [ -n "$(echo ${PREVIEWS[0]} | grep -v '\.preview-\*\.mdx')" ]; then
  for f in "${PREVIEWS[@]}"; do
    [ -f "$f" ] && echo "  🗑️  $f" && $RM "$f"
  done
else
  echo "  ✅ Nenhum .preview-*.mdx encontrado"
fi

# ── 2. Debug files on public/ ──────────────────────────────────────
echo ""
echo "── public/ debug files ──"
PUBLIC_GLOBS=(
  "public/demo-*.mp4"
  "public/demo-*.webm"
  "public/test-light*.png"
  "public/light_*.png"
  "public/page-*.webm"
)
found_any=false
for glob in "${PUBLIC_GLOBS[@]}"; do
  for f in $glob; do
    [ -f "$f" ] && echo "  🗑️  $f" && $RM "$f" && found_any=true
  done
done
$found_any || echo "  ✅ Nenhum debug file em public/"

# ── 3. Root debug files ────────────────────────────────────────────
echo ""
echo "── Root debug files ──"
ROOT_GLOBS=(
  "demo-*.mp4"
  "demo-*.webm"
)
found_any=false
for glob in "${ROOT_GLOBS[@]}"; do
  # Skip if glob matches itself (no files)
  for f in $glob; do
    if [ -f "$f" ]; then
      case "$f" in
        demo-*.mp4|demo-*.webm) echo "  🗑️  $f" && $RM "$f" && found_any=true ;;
      esac
    fi
  done
done
$found_any || echo "  ✅ Nenhum debug file na raiz"

# ── 4. .tmp_frames/ ────────────────────────────────────────────────
echo ""
echo "── Temp frames ──"
[ -d ".tmp_frames" ] && echo "  🗑️  .tmp_frames/" && $RM ".tmp_frames" || echo "  ✅ .tmp_frames/ não existe"

# ── 5. dist/ cleanup (belt-and-suspenders for CI) ──────────────────
if $CLEAN_DIST && [ -d "dist" ]; then
  echo ""
  echo "── dist/ leaked files ──"
  DIST_GLOBS=(
    "dist/demo-*.mp4"
    "dist/demo-*.webm"
    "dist/test-light*.png"
  )
  found_any=false
  for glob in "${DIST_GLOBS[@]}"; do
    for f in $glob; do
      [ -f "$f" ] && echo "  🗑️  $f" && $RM "$f" && found_any=true
    done
  done
  $found_any || echo "  ✅ Nenhum leaked file em dist/"
elif $CLEAN_DIST && [ ! -d "dist" ]; then
  echo ""
  echo "── dist/ — diretório não existe, pulando"
fi

echo ""
echo "✅ Cleanup concluído"
