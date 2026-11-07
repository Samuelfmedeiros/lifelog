#!/usr/bin/env python3
"""Recorta o personagem de qualquer imagem que o Samuel mandar e guarda a pose.

Fluxo pedido por Samuel (06/11/2026 22:59): "vou mandar personagem em varias
posicoes... recorta e reusa todas daqui em diante". Entao:

  1. receba a imagem (PNG/JPG/WebP) em qualquer pasta;
  2. rode:  python3 scripts/pose-cutout.py <imagem> [--name pose-1]
  3. sai um PNG RGBA limpo em public/sprites/poses/<name>.png e o
     cover-sprite-compose.py passa a distribuir as poses por post.

Metodo do recorte (sem servico externo, sem rembg): amostra a cor da borda,
faz flood fill da borda com tolerancia de cor + consistencia local, fica so com
o maior componente conexo (o personagem), fecha buracos internos e corta no bbox.

Uso:
  python3 scripts/pose-cutout.py <arquivo> [--name NOME] [--tol 34]
                                   [--solido] [--keep-todos]

Saidas: public/sprites/poses/<name>.png + <name>-audit.png (checagem em fundo
escuro, para conferir com o VLM antes de usar).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
LIFELOG_DIR = os.path.join(HERE, "..")
POSE_DIR = os.path.join(LIFELOG_DIR, "public/sprites/poses")
DEFAULT_NAME = "pose-1"


def arg(name, default=None):
    for a in sys.argv[1:]:
        if a.startswith(f"--{name}="):
            return a.split("=", 1)[1]
    return default


def has(name):
    return any(a == f"--{name}" for a in sys.argv[1:])


def border_ring(a, step=4):
    """Paleta de cores do fundo: anel da borda + primeira/ultima coluna."""
    h, w, _ = a.shape
    ring = np.concatenate([
        a[0, ::step].reshape(-1, 3), a[-1, ::step].reshape(-1, 3),
        a[::step, 0].reshape(-1, 3), a[::step, -1].reshape(-1, 3),
    ])
    return ring


def dominant_color(ring, step=8):
    """Cor mais frequente do anel (quantizada). Fundo domina a borda, entao
    mode funciona onde mediana falha (borda mista branco+preto = mediana cinza).
    """
    q = (ring // step * step).astype(np.int32)
    key = q[:, 0] * 65536 + q[:, 1] * 256 + q[:, 2]
    vals, counts = np.unique(key, return_counts=True)
    k = int(vals[counts.argmax()])
    # os canais ja estao em 0..255 (quantizados); so' volta ao centro do balde
    return np.array([k // 65536 + step // 2,
                     (k // 256) % 256 + step // 2,
                     k % 256 + step // 2], dtype=np.float64)


def background_mask(a, tol):
    """Flood fill da borda: fundo = cor proxima do fundo OU do vizinho de fundo.

    Referencia = cor DOMINANTE do anel. (Antes usava faixa min/max: com borda
    mista — fundo branco + linha divisora preta — a faixa virava -22..277, pegava
    a imagem inteira e o personagem SUMIA. Depois usei mediana: borda meio a meio
    dava cinza [111,113,128] e tambem nao pegava fundo. Medido 06/11/2026 na
    sprite sheet 2x3 do Samuel.)
    """
    h, w, _ = a.shape
    bgc = dominant_color(border_ring(a))
    d = np.abs(a - bgc).max(axis=2)
    seed = np.zeros((h, w), dtype=bool)
    seed[0, :] = d[0] <= tol
    seed[-1, :] = d[-1] <= tol
    seed[:, 0] = d[:, 0] <= tol
    seed[:, -1] = d[:, -1] <= tol
    seen = seed.copy()
    q = deque(map(tuple, np.argwhere(seed)))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                px = a[ny, nx]
                near_bg = np.abs(px - bgc).max() <= tol
                near_nb = (np.abs(px - a[y, x]).max() <= tol
                           and np.abs(px - bgc).max() <= tol * 2)
                if near_bg or near_nb:
                    seen[ny, nx] = True
                    q.append((ny, nx))
    return seen  # True = fundo


def largest_component(mask):
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    best, best_n = None, 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        comp = []
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1),
                           (-1, -1), (-1, 1), (1, -1), (1, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] \
                        and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        if len(comp) > best_n:
            best, best_n = comp, len(comp)
    if best_n == 0:
        raise SystemExit("nao sobrou personagem: o fundo engoliu a imagem. "
                         "Tente --tol menor (ex.: --tol 18) ou --keep-todos.")
    out = np.zeros((h, w), dtype=bool)
    for y, x in best:
        out[y, x] = True
    return out, best_n


def transparent_components(mask):
    """Componentes conexas de transparencia (mask=False) com area e toca-borda."""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    out = []
    ys, xs = np.nonzero(~mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        comp = []
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] \
                        and not mask[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        out.append(comp)
    return out


def fill_holes(mask, max_area=None):
    """Fecha buracos DENTRO do personagem (ex.: olho, vao entre braco e corpo).

    Regra aprendida na porrada (06/11/2026, sheet do Samuel): so' conta buraco o
    componente de transparencia que (a) NAO toca a borda da imagem e (b) tem
    area <= max_area (default: 6% dos pixels do personagem). Sem (b), quando o
    personagem encosta na borda do painel o FUNDO inteiro fica "cercado" pelo
    corpo e o fill engolia a paisagem: medido = 123.705 'buracos' numa pose de
    31.886 px e caixa saindo 161x310 (painel inteiro).
    """
    h, w = mask.shape
    n_person = int(mask.sum())
    if max_area is None:
        max_area = max(2000, int(n_person * 0.06))
    holes = []
    for comp in transparent_components(mask):
        ys = [c[0] for c in comp]
        xs = [c[1] for c in comp]
        touches = (min(ys) == 0 or max(ys) == h - 1
                   or min(xs) == 0 or max(xs) == w - 1)
        if not touches and len(comp) <= max_area:
            holes.extend(comp)
    out = mask.copy()
    for y, x in holes:
        out[y, x] = True
    return out


def main():
    src = None
    for a in sys.argv[1:]:
        if not a.startswith("--") and os.path.exists(a):
            src = a
            break
    if src is None:
        raise SystemExit("uso: pose-cutout.py <imagem> [--name pose-1] "
                         "[--tol 34] [--solido] [--keep-todos]")
    name = arg("name", DEFAULT_NAME)
    tol = float(arg("tol", 34))
    os.makedirs(POSE_DIR, exist_ok=True)
    out = os.path.join(POSE_DIR, f"{name}.png")
    if os.path.exists(out) and not has("force"):
        raise SystemExit(f"ja existe: {out} (use --force para sobrescrever)")

    im = Image.open(src).convert("RGB")
    if max(im.size) > 1400:
        im.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
    a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape

    bg = background_mask(a, tol)
    person = ~bg
    person, n_main = largest_component(person)
    before_holes = int((~fill_holes(person)).sum())
    person = fill_holes(person)
    # reconecta halo de 1px na borda para nao serrilhar
    person = (person | np.roll(person, 1, 0) | np.roll(person, -1, 0)
              | np.roll(person, 1, 1) | np.roll(person, -1, 1))

    ys, xs = np.nonzero(person)
    if len(ys) == 0:
        raise SystemExit("nao achei personagem: fundo nao separa com essa "
                         f"tolerancia ({tol}). Tente --tol menor/maior ou "
                         "--solido.")
    pad = 2
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + 1 + pad)
    box = a[y0:y1, x0:x1].copy()
    alpha = (person[y0:y1, x0:x1].astype(np.uint8)) * 255
    # suaviza 1px da borda (menos serrilho, sem engordar o personagem)
    alpha = np.asarray(Image.fromarray(alpha).filter(
        ImageFilter.GaussianBlur(0.6)))

    rgba = np.dstack([box.astype(np.uint8), alpha]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    img.save(out)

    # chapa de auditoria (fundo escuro) para o VLM conferir antes de publicar
    ah = 1200
    aw = int(ah * (img.width / img.height))
    bgimg = Image.new("RGB", (aw, ah), (16, 18, 26))
    scale = min(aw / img.width, ah / img.height)
    sp = img.resize((int(img.width * scale), int(img.height * scale)),
                    Image.Resampling.LANCZOS)
    bgimg.paste(sp, ((aw - sp.width) // 2, (ah - sp.height) // 2), sp)
    audit = os.path.join(POSE_DIR, f"{name}-audit.jpg")
    bgimg.save(audit, quality=90)

    print(f"fundo separado: {int(bg.sum())} px | personagem: {n_main} px "
          f"({100 * n_main / (h * w):.1f}% da imagem)")
    print(f"buracos internos antes do fill: {before_holes} | depois: "
          f"{int((~fill_holes(person[y0:y1, x0:x1])).sum())}")
    print(f"box {x0},{y0} -> {x1},{y1} | saida {out} "
          f"({img.width}x{img.height}, {os.path.getsize(out)} bytes)")
    print(f"auditoria: {audit}")


if __name__ == "__main__":
    main()
