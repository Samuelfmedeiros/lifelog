#!/usr/bin/env python3
"""Divide a sprite sheet do Samuel em poses individuais e recorta cada uma.

Pedido 06/11/2026 22:59: "vou mandar personagem em varias posicoes... recorta e
reusa todas daqui em diante". A sheet chegou como grade 2x3 em fundo branco.

Uso:
  python3 scripts/sheet-split.py <sheet.jpg> [--rows 2] [--cols 3]
                                  [--tol 24] [--prefix pose]

Faz: acha as marras brancas (linhas/colunas quase 100% brancas), corta cada
painel, recorta o personagem (flood fill da borda + maior componente + buracos,
mesmas funcoes de pose-cutout.py) e salva em public/sprites/poses/<prefix>-N.png
com uma chapa <prefix>-N-audit.jpg para conferir com visao.
"""
import importlib.util
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
LIFELOG_DIR = os.path.join(HERE, "..")
POSE_DIR = os.path.join(LIFELOG_DIR, "public/sprites/poses")

_spec = importlib.util.spec_from_file_location(
    "pose_cutout", os.path.join(HERE, "pose-cutout.py"))
pc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pc)


def arg(name, default=None):
    for a in sys.argv[1:]:
        if a.startswith(f"--{name}="):
            return a.split("=", 1)[1]
    return default


def dark_div_centers(dark_frac, thr=0.5, gap=15):
    """Clusters (inicio, fim) das linhas divisoras escuras.

    Medido na sheet do Samuel (06/11/2026): divisores em rows 352-353/361-362 e
    cols 423-424/432/847/855-856 — linhas finas e PRETAS, nao marras brancas.
    Retorna o CLUSTER (nao o centro): cortar no centro deixava pixels da
    divisora dentro do painel e a cor de fundo saido como [111,113,128]
    (mediana de branco + preto) — o flood fill entao nao achava fundo.
    """
    idx = [i for i, v in enumerate(dark_frac) if v > thr]
    if not idx:
        return []
    clusters, cur = [], [idx[0]]
    for i in idx[1:]:
        if i - cur[-1] <= gap:
            cur.append(i)
        else:
            clusters.append((cur[0], cur[-1]))
            cur = [i]
    clusters.append((cur[0], cur[-1]))
    return clusters


def split_panels(img, rows, cols):
    """Corta em rows xcols usando as divisoras escuras; fallback = corte regular."""
    a = np.asarray(img.convert("RGB")).astype(int)
    dark = a.max(axis=2) < 70
    rc = dark_div_centers(dark.mean(axis=1))
    cc = dark_div_centers(dark.mean(axis=0))
    h, w = a.shape[:2]
    if len(rc) != rows - 1 or len(cc) != cols - 1:
        ys = [round(i * h / rows) for i in range(rows + 1)]
        xs = [round(i * w / cols) for i in range(cols + 1)]
        print(f"divisoras: linhas={len(rc)} colunas={len(cc)} -> corte regular "
              f"{rows}x{cols}")
    else:
        # corta na BORDA do cluster (nao no centro): painel = so' conteudo
        ys = [0] + [e + 1 for _, e in rc] + [h]
        xs = [0] + [e + 1 for _, e in cc] + [w]
    inset = 1
    boxes = []
    for r in range(len(ys) - 1):
        for c in range(len(xs) - 1):
            boxes.append((xs[c] + inset, ys[r] + inset,
                          xs[c + 1] - inset, ys[r + 1] - inset))
    return boxes, (len(rc), len(cc))


def main():
    src = None
    for a in sys.argv[1:]:
        if not a.startswith("--") and os.path.exists(a):
            src = a
            break
    if src is None:
        raise SystemExit("uso: sheet-split.py <sheet> [--rows 2] [--cols 3]")
    rows = int(arg("rows", 2))
    cols = int(arg("cols", 3))
    tol = float(arg("tol", 24))
    prefix = arg("prefix", "pose")
    os.makedirs(POSE_DIR, exist_ok=True)

    im = Image.open(src).convert("RGB")
    if max(im.size) > 2400:
        im.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
    boxes, gm = split_panels(im, rows, cols)
    print(f"sheet {im.size} | marras linhas/colunas = {gm} | paineis = {len(boxes)}")

    made = []
    for i, (x0, y0, x1, y1) in enumerate(boxes, start=1):
        panel = im.crop((x0, y0, x1, y1))
        a = np.asarray(panel).astype(np.int16)
        if a.size == 0:
            continue
        bg = pc.background_mask(a, tol)
        person, n_main = pc.largest_component(~bg)
        if n_main == 0:
            print(f"painel {i}: fundo engoliu a imagem (tol={tol}); "
                  f"tente --tol menor")
            continue
        holes = int(pc.fill_holes(person).sum()) - n_main
        person = pc.fill_holes(person)
        person = (person | np.roll(person, 1, 0) | np.roll(person, -1, 0)
                  | np.roll(person, 1, 1) | np.roll(person, -1, 1))
        ys, xs = np.nonzero(person)
        pad = 2
        y0p, y1p = max(0, ys.min() - pad), min(a.shape[0], ys.max() + 1 + pad)
        x0p, x1p = max(0, xs.min() - pad), min(a.shape[1], xs.max() + 1 + pad)
        box = a[y0p:y1p, x0p:x1p].astype(np.uint8)
        alpha = (person[y0p:y1p, x0p:x1p].astype(np.uint8)) * 255
        alpha = np.asarray(Image.fromarray(alpha).filter(
            __import__("PIL.ImageFilter", fromlist=["ImageFilter"])
            .GaussianBlur(0.6)))
        rgba = np.dstack([box, alpha]).astype(np.uint8)
        out = os.path.join(POSE_DIR, f"{prefix}-{i}.png")
        Image.fromarray(rgba, "RGBA").save(out)
        ah = 1000
        aw = int(ah * (rgba.shape[1] / rgba.shape[0]))
        bgimg = Image.new("RGB", (aw, ah), (16, 18, 26))
        sp = Image.fromarray(rgba, "RGBA").resize(
            (int(rgba.shape[1] * min(aw / rgba.shape[1], ah / rgba.shape[0])),
             int(rgba.shape[0] * min(aw / rgba.shape[1], ah / rgba.shape[0]))),
            Image.Resampling.LANCZOS)
        bgimg.paste(sp, ((aw - sp.width) // 2, (ah - sp.height) // 2), sp)
        bgimg.save(os.path.join(POSE_DIR, f"{prefix}-{i}-audit.jpg"), quality=90)
        made.append(f"{prefix}-{i}")
        print(f"{prefix}-{i}: personagem {n_main} px, {holes} buracos corpais fechados, "
              f"box {rgba.shape[1]}x{rgba.shape[0]} -> {os.path.getsize(out)} bytes")
    print("poses: " + " ".join(made) if made else "nenhuma pose gerada")


if __name__ == "__main__":
    main()
