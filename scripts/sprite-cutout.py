#!/usr/bin/env python3
"""Recorte do personagem: flood fill do xadrez + keep da MAIOR componente.

O recorte anterior (16:03) removeu 85,8% do fundo mas deixou RESTOS de xadrez
espalhados: 129.540 px opacos (14,2%) com bbox cobrindo a tela inteira e TODO
bloco 32x32 com pixel opaco. Na composicao (sprite a 942px de altura) isso
cobria o fundo inteiro — Samuel leu como "linhas formando listras" (20:20,
06/11/2026).

A correcao: depois do flood fill (criterio do recorte antigo, que funciona),
fica APENAS a maior componente conexa (o personagem). Qualquer resto isolado
(peca de xadrez, halo solto) e descartado. Saida = personagem compacto.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "sprite-work", "sprite.jpg")
DST = os.path.join(HERE, "..", "public", "sprites", "yurumi-hero.png")


def checker_mask(a):
    """Pixels do xadrez: neutros (sem cor) perto dos 2 cinzes do xadrez."""
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    neutral = (mx - mn) <= 12
    gray = (np.abs(mx - 144) <= 42) | (np.abs(mx - 40) <= 42)
    return neutral & gray


def flood_from_border(mask):
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def largest_component(keep):
    """Deixa so a maior componente conexa (o personagem); resto e sujeira."""
    h, w = keep.shape
    lab = np.zeros((h, w), dtype=bool)
    best, best_n = np.zeros((h, w), dtype=bool), 0
    q = deque()
    for y in range(h):
        for x in range(w):
            if keep[y, x] and not lab[y, x]:
                cur, nxt = [], deque([(y, x)])
                lab[y, x] = True
                while nxt:
                    cy, cx = nxt.popleft()
                    cur.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and keep[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = True
                            nxt.append((ny, nx))
                if len(cur) > best_n:
                    best_n = len(cur)
                    best = np.zeros((h, w), dtype=bool)
                    for cy, cx in cur:
                        best[cy, cx] = True
    return best, best_n


def fill_holes(mask):
    """Fecha buracos internos: transparencia cercada por pixel opaco."""
    h, w = mask.shape
    inv = ~mask
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if inv[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if inv[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and inv[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return mask | (inv & ~seen)


def main():
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im).astype(np.int16)

    bg = flood_from_border(checker_mask(a))
    person, n = largest_component(~bg)
    if n == 0:
        raise SystemExit("recorte vazio")

    # fecha buracos internos (transparencia cercada por opaco): a maior
    # componente sozinha deixava 1 buraco de 1.284 px (lum 92, sat 0 no fonte
    # = casaco escuro) e Samuel leu "personagem com buraco no meio" (22:10:29).
    person = fill_holes(person)

    # reconecta pixels do personagem que tocam a componente (halo de 2px): evita
    # borda serrada sem voltar a puxar o xadrez
    halo = person.copy()
    person = halo | np.roll(person, 1, 0) | np.roll(person, -1, 0) \
        | np.roll(person, 1, 1) | np.roll(person, -1, 1)
    person = fill_holes(person)

    ys, xs = np.where(person)
    x0, x1 = max(0, xs.min() - 3), min(person.shape[1], xs.max() + 4)
    y0, y1 = max(0, ys.min() - 3), min(person.shape[0], ys.max() + 4)
    bbox = (int(x0), int(y0), int(x1), int(y1))

    rgba = np.dstack([a.astype(np.uint8), (person * 255).astype(np.uint8)])
    out = Image.fromarray(rgba, "RGBA").crop(bbox)
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    out.save(DST)
    print(f"xadrez removido {int(bg.sum())} px ({100.0 * bg.sum() / person.size:.1f}%) | "
          f"personagem {int(person.sum())} px ({100.0 * person.sum() / person.size:.1f}%) | "
          f"box {bbox} -> {out.size} | salvo {DST}")


if __name__ == "__main__":
    sys.exit(main())
