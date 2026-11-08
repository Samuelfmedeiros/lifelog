#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""normalizar-capas-21x9.py — poe TODA capa do LifeLog no padrao 21/9 (2100x900).

Contexto (Samuel, 08/11/2026): 40 capas estavam 1024x1024 quadradas. O card
(PostCard.astro) e o hero usam `aspect-ratio: 21/9`, entao quadrada e cortada em
~52% da altura. Tres posts foram RECUSADOS por causa disso ("Arrumar capa").

Duas estrategias, escolhidas pela qualidade da fonte:
  1. AI boa (>= AI_MIN_KB e brilho >= 140) -> composicao: a arte entra inteira
     (contain) sobre um fundo dela mesma ampliada, desfocada e escurecida.
     Nao corta conteudo e nao upscala a arte (evita borrao).
  2. PIL/escura/faltante -> regera com scripts/gerar-capas-21x9.py (custo zero,
     determinista, paleta do projeto).

Uso:
    python3 scripts/normalizar-capas-21x9.py            # corrige todas
    python3 scripts/normalizar-capas-21x9.py --dry-run   # so lista
    python3 scripts/normalizar-capas-21x9.py --only slug1,slug2
"""
import argparse
import glob
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
COVERS = os.path.join(REPO, "public", "covers")
POST_DIRS = ("src/content/posts", "src/content/posts/en")
W, H = 2100, 900
TARGET = W / H
AI_MIN_KB = 100      # abaixo disso a arte e fraca/placeholder
AI_MIN_BRIGHT = 120  # brilho medio minimo para aceitar a arte original


def frontmatter(slug):
    for d in POST_DIRS:
        p = os.path.join(REPO, d, slug + ".mdx")
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                return f.read()[:1200]
    return ""


def needs_fix(path):
    try:
        w, h = Image.open(path).size
    except Exception:
        return True
    return abs(w / h - TARGET) > 0.05


def is_good_art(path):
    try:
        kb = os.path.getsize(path) / 1024
        im = Image.open(path).convert("RGB")
        bright = float(np.array(im).mean())
    except Exception:
        return False
    return kb >= AI_MIN_KB and bright >= AI_MIN_BRIGHT


def compose_21x9(src, dst):
    """Arte inteira (contain) sobre fundo dela mesma ampliada + blur + escurecida."""
    art = Image.open(src).convert("RGB")

    # fundo: cobre o canvas inteiro (cover), depois desfoca e escurece
    bg = art.copy()
    s = max(W / bg.width, H / bg.height)
    bg = bg.resize((max(1, int(bg.width * s)), max(1, int(bg.height * s))), Image.LANCZOS)
    left = (bg.width - W) // 2
    top = (bg.height - H) // 2
    bg = bg.crop((left, top, left + W, top + H))
    bg = bg.filter(ImageFilter.GaussianBlur(radius=38))
    bg = ImageEnhance.Brightness(bg).enhance(0.42)
    bg = ImageEnhance.Color(bg).enhance(1.15)

    # arte: cabe inteira na altura do canvas
    s2 = H / art.height
    fg = art.resize((max(1, int(art.width * s2)), H), Image.LANCZOS)
    if fg.width > W:  # arte muito larga: limita pela largura
        s3 = W / fg.width
        fg = fg.resize((W, max(1, int(fg.height * s3))), Image.LANCZOS)

    # Mistura suave nas bordas laterais: sem isso o quadrado da arte aparece com
    # borda dura sobre o fundo desfocado (medido no VLM em 08/11/2026).
    feather = max(24, int(fg.width * 0.10))
    mask = Image.new("L", (fg.width, H), 255)
    px = mask.load()
    for x in range(feather):
        v = int(255 * (x / feather))
        for y in range(0, H, 1):
            px[x, y] = v
            px[fg.width - 1 - x, y] = v

    canvas = bg
    x = (W - fg.width) // 2
    y = (H - fg.height) // 2
    canvas.paste(fg, (x, y), mask)
    canvas.save(dst, "WEBP", quality=92, method=6)
    return canvas.size


def regen_pil(slugs):
    """Roda o gerador 21/9 do proprio repo (custo zero, determinista)."""
    gen = os.path.join(HERE, "gerar-capas-21x9.py")
    if not slugs:
        return 0
    proc = subprocess.run([sys.executable, gen, *slugs], capture_output=True, text=True)
    ok = proc.stdout.count("OK ")
    if proc.returncode != 0:
        print("  AVISO gerador rc=", proc.returncode, (proc.stderr or "")[-300:])
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="")
    args = ap.parse_args()

    only = {s.strip() for s in args.only.split(",") if s.strip()}
    all_covers = sorted(glob.glob(os.path.join(COVERS, "*.webp")))
    if only:
        all_covers = [c for c in all_covers if os.path.basename(c)[:-5] in only]

    # inclui posts cujo frontmatter aponta capa que nao existe
    faltando = []
    for d in POST_DIRS:
        for p in glob.glob(os.path.join(REPO, d, "*.mdx")):
            fm = open(p, encoding="utf-8").read()[:1200]
            m = __import__("re").search(r"^cover:\s*/covers/([^/\s]+)\.(webp|png|jpg)", fm, __import__("re").M)
            if m and not os.path.exists(os.path.join(COVERS, m.group(1) + ".webp")):
                faltando.append(m.group(1))

    fix = [c for c in all_covers if needs_fix(c)]
    bones = sorted(set(faltando) - {os.path.basename(c)[:-5] for c in all_covers})

    print(f"total webp: {len(all_covers)} | fora do 21/9: {len(fix)} | sem arquivo: {len(bones)}")
    if args.dry_run:
        for c in fix:
            s = os.path.basename(c)[:-5]
            print(f"  {'COMPOR' if is_good_art(c) else 'REGEN ':7} {s}")
        for s in bones:
            print(f"  {'REGEN  '} {s}  (arquivo ausente)")
        return 0

    compostas, regeradas, erros = [], [], []
    for c in fix:
        slug = os.path.basename(c)[:-5]
        if is_good_art(c):
            try:
                compose_21x9(c, c)
                compostas.append(slug)
            except Exception as e:
                erros.append((slug, str(e)))
                regeradas.append(slug)
        else:
            regeradas.append(slug)

    ok = regen_pil(list(dict.fromkeys(regeradas + bones)))

    print(f"\ncompostas (arte preservada): {len(compostas)}")
    print(f"regeradas pelo gerador 21/9: {ok} de {len(set(regeradas + bones))}")
    if erros:
        print(f"erros de composicao: {len(erros)}")
        for s, e in erros[:5]:
            print("  ", s, e)

    # verificacao final
    restam = [c for c in glob.glob(os.path.join(COVERS, "*.webp")) if needs_fix(c)]
    print(f"\nVERIFICACAO: ainda fora do 21/9 = {len(restam)}")
    for c in restam[:10]:
        print("  ", os.path.basename(c), Image.open(c).size)
    return 0 if not restam else 1


if __name__ == "__main__":
    sys.exit(main())
