#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""capa-vetorial-fallback.py — capa vetorial de qualidade quando o Worker FLUX nao responde.

Motivo (07/11/2026): a cota diaria do Workers AI da conta estourou
(HTTP 429/500 com "you have used up your daily free allocation of 10,000 neurons"),
o NIM devolveu imagem preta de placeholder e o post do dia ia subir sem capa
decente. O fallback antigo (PIL) gera fundo escuro que o Samuel le como
"post sem capa".

Este gerador produz arte vetorial CLARA (brightness medida > 150) em WEBP,
com um emblema grande por projeto, no mesmo espirito do prompt FLUX do projeto.

Uso:
    python3 scripts/capa-vetorial-fallback.py <slug> [--project <id>] [--force]

Regra de cache-bust (skill lifelog-post-pipeline-ops): sobrescrever o MESMO
arquivo de capa nao adianta — o Vercel serve /covers/* com immutable. Este
script grava <slug>-v2.webp e imprime o caminho; o frontmatter precisa ser
atualizado nos dois idiomas.
"""

import argparse
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(REPO, "public", "covers")

# Emblema por projeto: (cor principal, funcao svg que desenha o interior)
EMBLEMAS = {
    "arachne": ("#6d28d9", "teia"),
    "dogwalk": ("#6d28d9", "tile"),
    "portfolio": ("#0ea5e9", "foguete"),
    "capivara": ("#f59e0b", "painel"),
    "tatuengine": ("#0f766e", "onda"),
    "seguranca": ("#ef4444", "escudo"),
    "lifelog": ("#6d28d9", "cartao"),
    "estudos": ("#1d4ed8", "livro"),
    "descobertas": ("#1d4ed8", "seta"),
}

CREME_ESCURO = "#fdfbf6"
FUNDO_A = "#fdfbf6"
FUNDO_B = "#f2ead9"


def interior(kind: str) -> str:
    """Desenha o miolo do emblema em creme sobre o disco colorido."""
    c = CREME_ESCURO
    if kind == "teia":
        linhas = "".join(
            f'<line x1="512" y1="474" x2="{512 + 360 * dx:.0f}" y2="{474 + 360 * dy:.0f}"/>'
            for dx, dy in [
                (0, -1), (0.95, -0.31), (0.59, 0.81), (-0.59, 0.81),
                (-0.95, -0.31), (0.59, -0.81), (-0.59, -0.81), (0.95, 0.31),
            ]
        )
        arcos = "".join(f'<circle cx="512" cy="474" r="{r}"/>' for r in (110, 200, 290))
        return (
            f'<g stroke="{c}" stroke-width="11" stroke-linecap="round" opacity="0.92">{linhas}</g>'
            f'<g stroke="{c}" stroke-width="11" fill="none" opacity="0.92">{arcos}</g>'
            f'<ellipse cx="512" cy="512" rx="62" ry="72" fill="{c}"/>'
            f'<ellipse cx="512" cy="440" rx="38" ry="40" fill="{c}"/>'
        )
    if kind == "escudo":
        return (
            f'<path d="M512 250 L700 320 C700 500 620 590 512 640 C404 590 324 500 324 320 Z" fill="{c}"/>'
            f'<path d="M512 300 L652 350 C652 480 590 550 512 592 C434 550 372 480 372 350 Z" fill="#ef4444" opacity="0.25"/>'
        )
    if kind == "foguete":
        return (
            f'<path d="M512 230 C580 320 600 430 590 540 L434 540 C424 430 444 320 512 230 Z" fill="{c}"/>'
            f'<circle cx="512" cy="400" r="52" fill="#0ea5e9"/>'
            f'<path d="M512 560 L470 640 L554 640 Z" fill="#f59e0b"/>'
        )
    if kind == "onda":
        return (
            f'<path d="M300 540 C360 440 440 440 512 520 C584 600 664 600 724 500" fill="none" '
            f'stroke="{c}" stroke-width="46" stroke-linecap="round"/>'
            f'<path d="M320 620 C380 540 452 540 512 610" fill="none" stroke="{c}" stroke-width="26" '
            f'stroke-linecap="round" opacity="0.6"/>'
        )
    if kind == "painel":
        return (
            f'<rect x="330" y="330" width="364" height="270" rx="26" fill="{c}"/>'
            f'<rect x="366" y="366" width="292" height="34" rx="17" fill="#f59e0b" opacity="0.35"/>'
            f'<rect x="366" y="418" width="200" height="26" rx="13" fill="#f59e0b" opacity="0.25"/>'
            f'<rect x="366" y="462" width="250" height="26" rx="13" fill="#f59e0b" opacity="0.25"/>'
        )
    if kind == "cartao":
        return (
            f'<rect x="360" y="290" width="304" height="380" rx="26" fill="{c}"/>'
            f'<rect x="360" y="560" width="304" height="60" fill="#6d28d9" opacity="0.18"/>'
            f'<rect x="396" y="332" width="180" height="20" rx="10" fill="#f59e0b"/>'
        )
    if kind == "livro":
        return (
            f'<path d="M512 360 C440 320 360 320 300 350 L300 600 C360 570 440 570 512 610 Z" fill="{c}"/>'
            f'<path d="M512 360 C584 320 664 320 724 350 L724 600 C664 570 584 570 512 610 Z" fill="{c}"/>'
        )
    if kind == "seta":
        return (
            f'<path d="M340 620 C400 420 620 400 690 380" fill="none" stroke="{c}" '
            f'stroke-width="52" stroke-linecap="round"/>'
            f'<path d="M690 380 L610 356 L666 300 Z" fill="{c}"/>'
        )
    # tile / default
    return (
        f'<rect x="320" y="320" width="384" height="308" rx="60" fill="{c}"/>'
        f'<rect x="320" y="520" width="384" height="108" fill="#f59e0b" opacity="0.5"/>'
    )


def gerar(slug: str, project: str, saida: str) -> int:
    cor, kind = EMBLEMAS.get(project, ("#6d28d9", "tile"))
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{FUNDO_A}"/>
      <stop offset="1" stop-color="{FUNDO_B}"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.48" r="0.5">
      <stop offset="0" stop-color="{cor}" stop-opacity="0.26"/>
      <stop offset="0.7" stop-color="{cor}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="{cor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="474" r="470" fill="url(#halo)"/>
  <circle cx="512" cy="474" r="372" fill="{cor}"/>
  <circle cx="512" cy="474" r="372" fill="none" stroke="{cor}" stroke-width="10" opacity="0.5"/>
  {interior(kind)}
</svg>
"""
    tmp = saida + ".png"
    r = subprocess.run(["rsvg-convert", "-w", "1024", "-h", "1024", "-o", tmp],
                       input=svg.encode(), capture_output=True)
    if r.returncode != 0:
        print("rsvg-convert falhou:", r.stderr.decode()[:200])
        return 1
    r = subprocess.run(["ffmpeg", "-y", "-i", tmp, "-c:v", "libwebp", "-q:v", "92", saida],
                       capture_output=True)
    if r.returncode != 0:
        print("ffmpeg falhou:", r.stderr.decode()[:200])
        return 1
    os.remove(tmp)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--project", default="")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    project = args.project
    if not project:
        for base in (os.path.join(REPO, "src/content/posts"),):
            for f in (f"{base}/{args.slug}.mdx", f"{base}/en/{args.slug}.mdx"):
                if os.path.exists(f):
                    for line in open(f, encoding="utf-8"):
                        if line.startswith("project:"):
                            project = line.split(":", 1)[1].strip().strip('"').strip("'")
                            break
                if project:
                    break
        if not project:
            print("project nao informado e nao encontrado no frontmatter")
            return 2

    saida = os.path.join(COVERS, f"{args.slug}-v2.webp")
    if os.path.exists(saida) and not args.force:
        print(f"ja existe: {saida}")
        return 0
    if gerar(args.slug, project, saida) != 0:
        return 1
    kb = os.path.getsize(saida) / 1024
    print(f"OK {saida} ({kb:.0f} KB) projeto={project}")
    print(f"ATENCAO: atualize cover: em src/content/posts/{args.slug}.mdx e en/{args.slug}.mdx")
    return 0


if __name__ == "__main__":
    sys.exit(main())
