#!/usr/bin/env python3
"""Gerador de capas do LifeLog em 2100x900 (21/9) — custo zero de API.

Regra que originou o script ( Samuel, 07/11/2026 00:55 ):
"ta quadrado e la nao vai caber quadrado". Medido no repo: o card exige
`aspect-ratio: 21/9` (PostCard.astro) e o hero do post usa `aspect-[21/9]`
(PostLayout.astro); capa 1024x1024 era cortada em ~26% da altura pelo CSS.

Paletas: medidas nas capas 2100x900 ja existentes em public/covers
(commit 5a729d7) + nas capas atuais dos posts afetados. Nada inventado:
projeto sem amostra medida cai no padrao e o script avisa no stdout.

Determinista: hash(slug) escolhe a composicao, entao regerar o mesmo slug
devolve a mesma imagem (sem drift visual entre rodadas).

Uso:
    python3 scripts/gerar-capas-21x9.py <slug> [<slug> ...]
    python3 scripts/gerar-capas-21x9.py --check    # audita frontmatter x arquivo
"""
import hashlib
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
LIFELOG_DIR = os.path.join(HERE, "..")
COVERS = os.path.join(LIFELOG_DIR, "public", "covers")
POST_DIRS = ("src/content/posts", "src/content/posts/en")

W, H = 2100, 900  # 21/9 exato, igual ao aspect do hero

# base (fundo), accent (forma principal), glow (brilho/linhas), ink (texto/traco)
# base/accent/glow medidos; ink derivado do contraste medido frente a base.
PALETTE = {
    "lifelog":     dict(base=(19, 12, 30),  accent=(168, 85, 247),  glow=(216, 180, 254), ink=(237, 233, 254)),
    # yurumi: acervo medido e escuro (base ~(21,17,32), brilho 33.3 em 6 capas).
    # A paleta antiga era creme (255,245,223) e gerava capa 5x mais clara que
    # o padrao — corrigido 09/11/2026 medindo as capas reais em public/covers.
    "yurumi":      dict(base=(21, 17, 32),  accent=(104, 1, 204),  glow=(234, 179, 8),   ink=(237, 233, 254)),
    "arachne":     dict(base=(19, 10, 11),  accent=(220, 38, 38),   glow=(252, 165, 165), ink=(254, 242, 242)),
    "tatuengine":  dict(base=(7, 23, 23),   accent=(45, 212, 191),  glow=(153, 246, 228), ink=(236, 254, 255)),
    "descobertas": dict(base=(25, 26, 45),  accent=(129, 140, 248), glow=(199, 210, 254), ink=(238, 242, 255)),
    "dogwalk":     dict(base=(25, 26, 45),  accent=(129, 140, 248), glow=(199, 210, 254), ink=(238, 242, 255)),
    "capivara":    dict(base=(19, 12, 30),  accent=(168, 85, 247),  glow=(216, 180, 254), ink=(237, 233, 254)),
    "seguranca":   dict(base=(19, 10, 11),  accent=(220, 38, 38),   glow=(252, 165, 165), ink=(254, 242, 242)),
}
DEFAULT_PROJECT = "lifelog"


def rnd(slug):
    # sha1 aqui e' semente deterministica de composicao visual, nao hash de seguranca.
    digest = hashlib.sha1(slug.encode("utf-8"), usedforsecurity=False).hexdigest()[:12]
    return np.random.default_rng(int(digest, 16))


def radial(w, h, base, accent, strength=0.55):
    """Fundo em gradiente radial: base nas bordas, accent fraco no centro."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w * 0.5) / (w * 0.62)) ** 2 + ((yy - h * 0.46) / (h * 0.62)) ** 2)
    d = np.clip(d, 0, 1)[..., None]
    b = np.array(base, dtype=np.float32)
    a = np.array(accent, dtype=np.float32)
    mix = b * (1 - strength) + a * strength
    return (b * (1 - 0.30 * (1 - d)) + mix * 0.30 * (1 - d)).astype(np.uint8)


def vignette(img, amount=0.35):
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    m = np.clip(1 - amount * (d - 0.55), 0.25, 1.0)[..., None]
    return Image.fromarray((np.asarray(img).astype(np.float32) * m).astype(np.uint8))


def blend(img, layer):
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def layer_for(img):
    return Image.new("RGBA", img.size, (0, 0, 0, 0))


def read_meta(slug):
    """Le project/title do frontmatter do post (PT primeiro, EN fallback)."""
    for d in POST_DIRS:
        p = os.path.join(LIFELOG_DIR, d, slug + ".mdx")
        if not os.path.exists(p):
            continue
        t = open(p, encoding="utf-8", errors="ignore").read()
        m = re.search(r"^---(.*?)^---", t, re.S | re.M)
        if not m:
            continue
        fm = m.group(1)
        proj = re.search(r"^project:\s*(\S+)", fm, re.M)
        title = re.search(r"^title:\s*(.+)$", fm, re.M)
        return (proj.group(1).strip('"\'') if proj else DEFAULT_PROJECT,
                title.group(1).strip().strip('"\'') if title else slug)
    return DEFAULT_PROJECT, slug


def frontmatter_cover(slug):
    for d in POST_DIRS:
        p = os.path.join(LIFELOG_DIR, d, slug + ".mdx")
        if not os.path.exists(p):
            continue
        t = open(p, encoding="utf-8", errors="ignore").read()
        m = re.search(r"^---(.*?)^---", t, re.S | re.M)
        if not m:
            continue
        c = re.search(r"^cover:\s*(\S+)", fm := m.group(1), re.M)
        if c:
            return c.group(1).strip('"\'')
    return None


# ---------- composicoes (todas 2100x900, sem texto, sem emoji) ----------

def comp_orbita(r, pal, dark):
    """Planeta + orbita: inspirado na capa creme do Yurumi ja aprovada."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.5 if dark else 0.35))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    cx, cy, rad = int(w * 0.30), int(h * 0.68), int(h * 0.40)
    d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=pal["accent"] + (255,), outline=pal["ink"] + (90,), width=6)
    # anel em volta do planeta (traco accent claro)
    for k, rr in enumerate([int(rad * 1.45), int(rad * 1.75)]):
        bbox = [cx - rr, cy - rr, cx + rr, cy + rr]
        d.arc(bbox, 200, 340, fill=pal["glow"] + (150 - k * 45,), width=5)
    # arco dourado saindo do topo do planeta (assinatura da capa aprovada)
    pts = 220
    for i in range(pts):
        t = i / pts
        x = cx + rad * 0.72 + (w * 0.42) * t
        y = cy - rad * 0.92 - (h * 0.30) * (1 - (2 * t - 1) ** 2)
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=pal["glow"] + (215,))
    lay = lay.filter(ImageFilter.GaussianBlur(0.6))
    img = blend(img, lay)
    return vignette(img, 0.30 if dark else 0.14)


def comp_ondas(r, pal, dark):
    """Ondas concentricas + grade fina: inspirado na capa escura do pipeline."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.62))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    # grade horizontal fraca
    for y in range(0, h, 46):
        d.line([(0, y), (w, y)], fill=pal["glow"] + (26,), width=2)
    # ondas concentricas fora de eixo
    cx, cy = int(w * 0.62), int(h * 0.52)
    for i in range(9):
        rr = int(h * 0.12) + i * int(h * 0.10)
        dash = 9 if i % 2 else 0
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  outline=pal["glow"] + (150 - i * 13,), width=5)
        if dash:
            d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 20, 160, fill=pal["accent"] + (120,), width=8)
    # barras verticais na base (ritmo, igual ao fundo aceito)
    bw = int(w / 90)
    for i in range(90):
        bh = int(h * (0.03 + 0.05 * abs(((i * 37) % 11) / 10)))
        d.rectangle([i * bw + 2, h - bh, i * bw + bw - 2, h], fill=pal["glow"] + (34,))
    lay = lay.filter(ImageFilter.GaussianBlur(1.1))
    img = blend(img, lay)
    # brilho no ponto focal
    g = layer_for(img)
    dg = ImageDraw.Draw(g)
    gr = int(h * 0.42)
    dg.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], fill=pal["accent"] + (70,))
    img = blend(img, g.filter(ImageFilter.GaussianBlur(90)))
    return vignette(img, 0.34)


def comp_orbitais(r, pal, dark):
    """Anéis deslocados + nodulos: composicao geometrica limpa."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.45))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    ang = r.uniform(0, 6.28)
    for i in range(5):
        rr = int(h * (0.20 + i * 0.13))
        cx = int(w * (0.34 + 0.09 * i))
        cy = int(h * 0.50)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=pal["accent"] + (200 - i * 30,), width=6)
        for k in range(3):
            a = ang + i * 1.1 + k * 2.09
            x = cx + rr * np.cos(a)
            y = cy + rr * np.sin(a) * 0.42
            d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=pal["glow"] + (235,))
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.5)))
    # faixa clara inferior para o sprite/titulo do card nao brigar
    f = layer_for(img)
    df = ImageDraw.Draw(f)
    df.rectangle([0, int(h * 0.86), w, h], fill=pal["ink"] + (26,))
    img = blend(img, f.filter(ImageFilter.GaussianBlur(24)))
    return vignette(img, 0.26 if dark else 0.12)


def comp_arco(r, pal, dark):
    """Arcos em leque + ponto final."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.40))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    cx, cy = int(w * 0.74), int(h * 1.05)
    for i in range(7):
        rr = int(h * (0.30 + 0.11 * i))
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 180, 360,
              fill=(pal["accent"] if i % 3 == 0 else pal["glow"]) + (200 - i * 16,), width=7)
    x = cx - int(h * 0.60)
    y = cy - int(h * 0.60)
    d.ellipse([x - 26, y - 26, x + 26, y + 26], fill=pal["glow"] + (240,))
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.7)))
    return vignette(img, 0.28 if dark else 0.12)


COMPOS = [comp_orbita, comp_ondas, comp_orbitais, comp_arco]


def gerar(slug, project=None, dry=False):
    # variantes cache-bust (…-v2.webp) herdam paleta do post base
    base = re.sub(r"-v\d+$", "", slug)
    project = project or read_meta(base)[0]
    pal = PALETTE.get(project)
    if pal is None:
        pal = PALETTE[DEFAULT_PROJECT]
        print(f"AVISO projeto nao mapeado ({project}) -> paleta padrao; meca e ajuste PALETTE")
    dark = sum(pal["base"]) / 3 < 128
    r = rnd(slug)
    comp = COMPOS[int(r.integers(0, len(COMPOS)))]
    img = comp(r, pal, dark)
    out = os.path.join(COVERS, slug + ".webp")
    if dry:
        return dict(slug=slug, project=project, comp=comp.__name__, dark=dark, out=out, dry=True)
    tmp = out + ".tmp.webp"
    img.save(tmp, "WEBP", quality=88, method=6)
    os.replace(tmp, out)
    return dict(slug=slug, project=project, comp=comp.__name__, dark=dark,
                out=out, bytes=os.path.getsize(out), dims=f"{img.size[0]}x{img.size[1]}")


def webp_dims(path):
    """Dimensoes de .webp (RIFF/VP8X/VP8/VP8L) e .avif (ftyp + ispe). 0x0 se ilegivel."""
    d = open(path, "rb").read(64)
    if d[4:8] == b"ftyp":  # AVIF/HEIF: o tamanho vive no box 'ispe'
        i = d.find(b"ispe")
        if i >= 0:
            return int.from_bytes(d[i + 8:i + 12], "big"), int.from_bytes(d[i + 12:i + 16], "big")
        return None
    if d[:4] != b"RIFF":
        return None
    t = d[12:16]
    if t == b"VP8X":
        return ((d[24] | d[25] << 8 | d[26] << 16) + 1, (d[27] | d[28] << 8 | d[29] << 16) + 1)
    if t == b"VP8 ":
        import struct as s
        return s.unpack("<H", d[26:28])[0] & 0x3FFF, s.unpack("<H", d[28:30])[0] & 0x3FFF
    if t == b"VP8L":
        n = int.from_bytes(d[21:25], "little")
        return (n & 0x3FFF) + 1, ((n >> 14) & 0x3FFF) + 1
    return None


def check():
    """Audita todo post com cover: aspect do arquivo vs 21/9 exigido pelo card."""
    import glob
    ruins = []
    for d in POST_DIRS:
        for p in glob.glob(os.path.join(LIFELOG_DIR, d, "*.mdx")):
            t = open(p, encoding="utf-8", errors="ignore").read()
            m = re.search(r"^---(.*?)^---", t, re.S | re.M)
            if not m:
                continue
            fm = m.group(1)
            c = re.search(r"^cover:\s*(\S+)", fm, re.M)
            slug = re.search(r'^slug:\s*(\S+)', fm, re.M)
            if not c:
                continue
            fp = os.path.join(LIFELOG_DIR, "public", c.group(1).strip('"\'').lstrip("/"))
            name = slug.group(1).strip('"\'') if slug else os.path.basename(p)[:-4]
            if not os.path.exists(fp):
                ruins.append((name, "AUSENTE", c.group(1)))
                continue
            w, h = webp_dims(fp) or (0, 0)
            if h == 0:
                ruins.append((name, "ILEGIVEL", c.group(1)))
                continue
            if abs(w / h - 21 / 9) > 0.02:
                ruins.append((name, f"{w}x{h}", c.group(1)))
    return ruins


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--check" in args:
        r = check()
        if not r:
            print("APTO: toda capa referenciada esta em 21/9")
            sys.exit(0)
        print(f"REPROVADO: {len(r)} capa(s) fora de 21/9")
        for n, dim, cov in r[:40]:
            print(f"  {dim:>9}  {n[:58]}  -> {cov}")
        sys.exit(1)
    if not args:
        raise SystemExit(__doc__)
    for slug in args:
        info = gerar(slug)
        print("OK %s  %-9s %-13s dark=%s  %s bytes  %s" % (
            info["slug"], info.get("dims", "-"), info["comp"], info["dark"], info.get("bytes", "-"), info["out"]))
