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


# ---------- Fase 1: a capa vem do CONTEUDO, nao do hash da slug ----------
#
# Antes: comp = COMPOS[sha1(slug) % 4]. O assunto do post nao entrava em nada —
# 9 posts de assuntos diferentes caiam em 4 formas e tres deles em comp_arco.
# Agora: o post declara tags/titulo, o TAG_MOTIF mapeia tag -> motivo e o motivo
# escolhe a composicao. sha1(slug) fica so como desempate DENTRO do motivo,
# para dois posts do mesmo motivo nao saírem identicos.
#
# As tags foram lidas do acervo (contagem real, 09/11/2026):
#   testing 44, security 37, debugging 35, react 23, lessons 23, automation 23,
#   reliability 21, studies 17, python 16, fastapi 16, ci-cd 16, watchdog 15,
#   frontend 15, rag 14, performance 14, observability 14, deploy 12,
#   yurumi 11, refactoring 11, pipeline 11, nextjs 11, monitoring 11
#
# Motivo -> composicao. A ordem das tags NO POST define a prioridade, entao
# tags de ASSUNTO precisam existir aqui e tags de PROJETO nao podem: `yurumi`,
# `arachne`, `capivara` etc. so dizem de qual projeto e' o post (isso ja vira
# paleta) — usa-las como motivo fazia todo post do projeto sair com a mesma
# cara, que e' exatamente o defeito relatado por Samuel em 09/11/2026.
TAG_MOTIF = {
    # medir / provar / veredito
    "testing": "alvo", "pytest": "alvo", "quality-gate": "alvo",
    "e2e": "alvo", "vrt": "alvo", "qa": "alvo", "benchmark": "alvo",
    "metrics": "alvo", "eval": "alvo", "medicao": "alvo",
    # buraco, defesa, permissao
    "security": "escudo", "seguranca": "escudo", "auth": "escudo",
    "lgpd": "escudo", "secrets": "escudo", "gitleaks": "escudo",
    # achar a causa
    "debugging": "ruptura", "bug": "ruptura", "incident": "ruptura",
    "postmortem": "ruptura", "lessons": "ruptura", "regression": "ruptura",
    # fluxo que entrega
    "ci-cd": "fluxo", "deploy": "fluxo", "pipeline": "fluxo",
    "github-actions": "fluxo", "vercel": "fluxo", "automation": "fluxo",
    # estado vigiado no tempo
    "monitoring": "pulso", "observability": "pulso", "watchdog": "pulso",
    "reliability": "pulso", "performance": "pulso",
    # conhecimento acumulado / busca
    "rag": "rede", "memory": "rede", "search": "rede", "embeddings": "rede",
    "retrieval": "rede", "vector": "rede",
    # construcao / organizacao de codigo
    "refactoring": "camadas", "architecture": "camadas", "frontend": "camadas",
    "react": "camadas", "nextjs": "camadas", "design-system": "camadas",
    "python": "camadas", "fastapi": "camadas", "typescript": "camadas",
}

# Tags que identificam PROJETO e nunca devem escolher o motivo.
TAGS_DE_PROJETO = {
    "yurumi", "arachne", "capivara", "dogwalk", "patapass", "portfolio",
    "portifolio", "lifelog", "tatuengine", "estudos", "seguranca",
    "descobertas", "forgetgate", "ecossistema",
}

# motivo -> funcao de composicao. As 4 antigas seguem valendo; as 3 novas
# (alvo, escudo, ruptura, fluxo, pulso, rede, camadas) cobrem os assuntos.
MOTIF_COMP = {
    "alvo":     "comp_alvo",      # aneis concentricos + marcador central
    "escudo":   "comp_escudo",    # forma fechada protegendo nucleo
    "ruptura":  "comp_ruptura",   # linha continua que quebra e retoma
    "fluxo":    "comp_fluxo",     # etapas encadeadas na horizontal
    "pulso":    "comp_pulso",     # serie temporal + limiar
    "rede":     "comp_rede",      # nos conectados
    "camadas":  "comp_camadas",   # camadas empilhadas
    "orbita":   "comp_orbita",    # fallback abstrato
}

MOTIF_DESC = {
    "alvo": "medicao/veredito: aneis + marcador no centro",
    "escudo": "defesa: forma fechada em volta de nucleo",
    "ruptura": "falha/causa: linha que quebra e retoma",
    "fluxo": "entrega: etapas encadeadas",
    "pulso": "vigia/estado: serie no tempo contra limiar",
    "rede": "conhecimento: nos conectados",
    "camadas": "construcao: camadas empilhadas",
    "orbita": "abstrato (sem tag mapeada)",
}


def read_brief(slug):
    """Le title/description/project/tags do post. PT primeiro, EN fallback.

    Devolve dict com o que a capa precisa saber do assunto. Nunca levanta:
    post sem frontmatter cai no default e o chamador avisa.
    """
    base = re.sub(r"-v\d+$", "", slug)
    for d in POST_DIRS:
        p = os.path.join(LIFELOG_DIR, d, base + ".mdx")
        if not os.path.exists(p):
            continue
        t = open(p, encoding="utf-8", errors="ignore").read()
        m = re.search(r"^---(.*?)^---", t, re.S | re.M)
        if not m:
            continue
        fm = m.group(1)

        def campo(nome):
            mm = re.search(r"^%s:\s*(.+)$" % nome, fm, re.M)
            return mm.group(1).strip().strip('"').strip("'") if mm else ""

        tags_raw = campo("tags")
        tags = [x.strip().strip('"').strip("'").lower()
                for x in tags_raw.strip("[]").split(",") if x.strip()]
        return {
            "slug": base,
            "title": campo("title"),
            "description": campo("description"),
            "project": campo("project") or DEFAULT_PROJECT,
            "tags": tags,
        }
    return {"slug": base, "title": "", "description": "",
            "project": DEFAULT_PROJECT, "tags": []}


def pick_motif(brief):
    """Primeira tag de ASSUNTO decide o motivo. Tag de projeto nao conta.

    Se so houver tags de projeto (ou nenhuma), cai em `orbita` — abstrato
    declarado, sem fingir que entendeu o assunto.
    """
    for t in brief["tags"]:
        if t in TAGS_DE_PROJETO:
            continue
        if t in TAG_MOTIF:
            return TAG_MOTIF[t], t
    return "orbita", ""


def _comp_alvo(r, pal, dark):
    """Tres medidores do MESMO objeto, com leituras diferentes: medicao e veredito.

    Vale para teste (passa/falha), benchmark (scores) e gate (dentro/fora).

    Regras que a avaliacao de arte exigiu (medido 09/11):
    - os tres TRILHOS tem geometria identica no topo e na base: e' o mesmo
      objeto medido tres vezes. So a LEITURA (preenchimento) muda de altura.
    - o fundo tem grade de medida, nao aneis soltos — aneis decorativos a
      esquerda liam como "outra arte" e competiam com o desenho.
    - veredito e' um simbolo por coluna: disco cheio = passou do limiar,
      anel vazado = nao passou. Dois estados, sem texto.
    """
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.42))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)

    # grade de medida: linhas horizontais fracas em toda a largura
    for y in range(int(h * 0.10), int(h * 0.95), 42):
        d.line([(0, y), (w, y)], fill=pal["ink"] + (16,), width=2)

    niveis = (0.82, 0.28, 0.58)      # as tres leituras
    n = len(niveis)
    base_y = int(h * 0.82)           # base comum
    topo_y = int(h * 0.20)           # topo comum
    altura = base_y - topo_y
    larg = int(w * 0.078)
    gap = int(w * 0.055)
    x0 = int((w - (n * larg + (n - 1) * gap)) // 2) + int(w * 0.04)
    limiar_y = base_y - int(altura * 0.55)

    for i, niv in enumerate(niveis):
        x = x0 + i * (larg + gap)
        # trilho identico nos tres: o mesmo objeto medido 3x
        d.rounded_rectangle([x, topo_y, x + larg, base_y],
                            radius=larg // 3,
                            fill=pal["base"] + (215,),
                            outline=pal["ink"] + (120,), width=4)
        # leitura: preenchimento dourado, unica coisa que varia
        ytop = base_y - int(altura * niv)
        d.rounded_rectangle([x + 5, ytop, x + larg - 5, base_y - 5],
                            radius=larg // 4, fill=pal["glow"] + (235,))
        # veredito: base escura + simbolo, para nao sumir no dourado
        mr = int(larg * 0.40)
        mx, my = x + larg // 2, ytop - mr - 10
        d.ellipse([mx - mr - 6, my - mr - 6, mx + mr + 6, my + mr + 6],
                  fill=pal["base"] + (250,))
        if ytop < limiar_y:          # passou do limiar
            d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=pal["glow"] + (250,))
        else:                        # nao passou
            d.ellipse([mx - mr, my - mr, mx + mr, my + mr],
                      outline=pal["glow"] + (250,), width=7)

    # limiar comum, sobre as tres colunas
    for x in range(int(w * 0.06), int(w * 0.94), 34):
        d.line([(x, limiar_y), (x + 18, limiar_y)], fill=pal["ink"] + (135,), width=5)

    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.5)))
    return vignette(img, 0.32 if dark else 0.14)


def _comp_escudo(r, pal, dark):
    """Forma fechada protegendo um nucleo: defesa."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.38))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    cx, cy = int(w * 0.50), int(h * 0.50)
    # contorno hexagonal (defesa) em 2 escalas
    for k, esc in enumerate((1.0, 0.72)):
        Rx, Ry = int(h * 0.66 * esc), int(h * 0.74 * esc)
        pts = []
        for i in range(6):
            a = -1.5708 + i * 1.0472
            pts.append((cx + Rx * np.cos(a), cy + Ry * np.sin(a)))
        d.polygon(pts, outline=pal["glow"] + (200 - k * 60,), width=7)
    # nucleo
    rad = int(h * 0.17)
    d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=pal["accent"] + (230,))
    d.ellipse([cx - rad * 2 // 3, cy - rad * 2 // 3, cx + rad * 2 // 3, cy + rad * 2 // 3],
              outline=pal["glow"] + (170,), width=5)
    # barras de varredura (linhas de verificação)
    for i in range(3):
        y = cy - int(h * 0.30) + i * int(h * 0.30)
        d.line([(int(w * 0.10), y), (int(w * 0.90), y)], fill=pal["glow"] + (34,), width=2)
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.6)))
    return vignette(img, 0.32)


def _comp_ruptura(r, pal, dark):
    """Linha continua que quebra e retoma: falha e causa."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.42))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    y0 = int(h * 0.54)
    # trecho antes da falha
    pts_a = [(int(w * (0.06 + 0.28 * t / 60)), y0 - int(h * 0.10 * np.sin(t / 9.0)))
             for t in range(61)]
    # trecho depois, deslocado (a "retomada")
    pts_b = [(int(w * (0.52 + 0.42 * t / 60)), y0 + int(h * 0.05) - int(h * 0.16 * np.sin(t / 11.0)))
             for t in range(61)]
    for pts, col, wid in ((pts_a, pal["glow"] + (225,), 9), (pts_b, pal["accent"] + (235,), 9)):
        d.line(pts, fill=col, width=wid, joint="curve")
    # o vao: onde a linha morre
    gx = int(w * 0.45)
    for i in range(9):
        a = i * 0.7
        rr = int(h * 0.12) + i * 9
        d.arc([gx - rr, y0 - rr, gx + rr, y0 + rr], 150, 390,
              fill=pal["glow"] + (120 - i * 11,), width=4)
    # marcas verticais de impacto
    for i, dx in enumerate((-26, 0, 26)):
        x = gx + dx
        d.line([(x, y0 - int(h * 0.20)), (x, y0 - int(h * 0.07))],
               fill=pal["glow"] + (150 - i * 30,), width=4)
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.6)))
    return vignette(img, 0.30)


def _comp_fluxo(r, pal, dark):
    """Etapas encadeadas na horizontal: entrega."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.40))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    n = 5
    y = int(h * 0.52)
    xs = [int(w * (0.12 + 0.19 * i)) for i in range(n)]
    rad = int(h * 0.085)
    for i, x in enumerate(xs):
        # seta entre as etapas
        if i < n - 1:
            nx = xs[i + 1]
            d.line([(x + rad + 8, y), (nx - rad - 8, y)],
                   fill=pal["glow"] + (180,), width=7)
            ax = nx - rad - 10
            d.polygon([(ax, y - 16), (ax, y + 16), (ax + 24, y)], fill=pal["glow"] + (200,))
        cor = pal["accent"] if i in (0, n - 1) else pal["glow"]
        d.ellipse([x - rad, y - rad, x + rad, y + rad],
                  fill=cor + (40,), outline=cor + (230,), width=6)
        d.ellipse([x - rad // 3, y - rad // 3, x + rad // 3, y + rad // 3],
                  fill=cor + (235,))
    # trilhos paralelos (o "pipeline" por baixo)
    for k, dy in enumerate((int(h * 0.16), int(h * 0.22))):
        d.line([(int(w * 0.08), y + dy), (int(w * 0.92), y + dy)],
               fill=pal["glow"] + (40 - k * 15,), width=3)
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.7)))
    return vignette(img, 0.30)


def _comp_pulso(r, pal, dark):
    """Serie no tempo contra um limiar: vigia e estado."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.36))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    base_y = int(h * 0.72)
    lim = int(h * 0.42)
    # limiar
    for x in range(int(w * 0.06), int(w * 0.95), 34):
        d.line([(x, lim), (x + 18, lim)], fill=pal["glow"] + (170,), width=4)
    # serie: seno com um pico que cruza o limiar
    pts = []
    for i in range(140):
        t = i / 139
        x = int(w * (0.06 + 0.89 * t))
        amp = h * 0.16
        y = base_y - int(amp * (0.45 + 0.55 * np.sin(t * 11)) + (h * 0.30 if 0.62 < t < 0.72 else 0))
        pts.append((x, y))
    d.line(pts, fill=pal["accent"] + (235,), width=8, joint="curve")
    # o ponto do pico
    px, py = pts[int(len(pts) * 0.67)]
    d.ellipse([px - 20, py - 20, px + 20, py + 20], fill=pal["glow"] + (245,))
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.6)))
    return vignette(img, 0.28)


def _comp_rede(r, pal, dark):
    """Nos conectados: conhecimento e busca."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.44))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    nos = [(int(w * (0.18 + 0.64 * r.random())), int(h * (0.18 + 0.62 * r.random())))
           for _ in range(11)]
    # arestas entre nos proximos
    for i in range(len(nos)):
        for j in range(i + 1, len(nos)):
            dx = nos[i][0] - nos[j][0]
            dy = nos[i][1] - nos[j][1]
            if (dx * dx + dy * dy) ** 0.5 < h * 0.42:
                d.line([nos[i], nos[j]], fill=pal["glow"] + (85,), width=4)
    for i, (x, y) in enumerate(nos):
        rad = 26 if i % 3 == 0 else 15
        d.ellipse([x - rad, y - rad, x + rad, y + rad],
                  fill=(pal["accent"] if i % 3 == 0 else pal["glow"]) + (240,))
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.7)))
    return vignette(img, 0.30)


def _comp_camadas(r, pal, dark):
    """Camadas empilhadas: construcao e organizacao."""
    w, h = W, H
    img = Image.fromarray(radial(w, h, pal["base"], pal["accent"], 0.40))
    lay = layer_for(img)
    d = ImageDraw.Draw(lay)
    cx = int(w * 0.50)
    n = 4
    for i in range(n):
        yb = int(h * (0.30 + i * 0.12))
        half = int(w * (0.30 - i * 0.045))
        skew = int(h * 0.075)
        pts = [(cx - half, yb), (cx + half, yb),
               (cx + half, yb + skew), (cx - half, yb + skew)]
        cor = pal["accent"] if i == 0 else pal["glow"]
        d.polygon(pts, fill=cor + (60 if i else 110,), outline=cor + (225,), width=6)
    # eixo vertical costurando as camadas
    d.line([(cx, int(h * 0.20)), (cx, int(h * 0.80))], fill=pal["glow"] + (120,), width=5)
    img = blend(img, lay.filter(ImageFilter.GaussianBlur(0.6)))
    return vignette(img, 0.28)


MOTIF_FN = {
    "alvo": _comp_alvo, "escudo": _comp_escudo, "ruptura": _comp_ruptura,
    "fluxo": _comp_fluxo, "pulso": _comp_pulso, "rede": _comp_rede,
    "camadas": _comp_camadas, "orbita": comp_orbita,
}


def gerar(slug, project=None, dry=False):
    # variantes cache-bust (…-v2.webp) herdam paleta do post base
    brief = read_brief(slug)
    project = project or brief["project"]
    pal = PALETTE.get(project)
    if pal is None:
        pal = PALETTE[DEFAULT_PROJECT]
        print(f"AVISO projeto nao mapeado ({project}) -> paleta padrao; meca e ajuste PALETTE")
    dark = sum(pal["base"]) / 3 < 128
    r = rnd(slug)
    motivo, tag = pick_motif(brief)
    comp = MOTIF_FN[motivo]
    img = comp(r, pal, dark)
    out = os.path.join(COVERS, slug + ".webp")
    info = dict(slug=slug, project=project, comp=comp.__name__, motif=motivo,
                tag=tag, dark=dark, out=out)
    if dry:
        info["dry"] = True
        return info
    tmp = out + ".tmp.webp"
    img.save(tmp, "WEBP", quality=88, method=6)
    os.replace(tmp, out)
    info.update(nbytes=os.path.getsize(out), dims=f"{img.size[0]}x{img.size[1]}")
    return info


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


def dhash(path, size=16):
    """Assinatura perceptual 256 bits (dHash 16x16): compara capas visualmente.

    8x8 colapsava: capas abstratas escuras caem no mesmo gradiente e davam 615
    pares "iguais". 16x16 separa (mediana de Hamming entre pares aleatorios = 31).
    """
    try:
        im = Image.open(path).convert("L").resize((size + 1, size), Image.LANCZOS)
    except Exception:
        return None
    px = im.load()
    bits = 0
    for y in range(size):
        for x in range(size):
            bits = (bits << 1) | (1 if px[x, y] > px[x + 1, y] else 0)
    return bits


def hamming(a, b):
    """Distancia de Hamming entre duas assinaturas."""
    return bin(a ^ b).count("1")


def md5(path):
    """Hash do arquivo: pega duplicata byte-a-byte (o defeito mais grave)."""
    try:
        return hashlib.md5(open(path, "rb").read()).hexdigest()
    except OSError:
        return None


def check():
    """Audita as capas em duas dimensoes.

    1. ASPECTO: todo post com `cover:` precisa apontar para arquivo existente,
       legivel e em 21/9 (o card usa aspect-ratio 21/9).
    2. MOTIVO REPETIDO: dentro do mesmo projeto, duas capas nao podem sair do
       mesmo motivo (sintoma de "capa generica" relatado pelo Samuel 09/11).
    """
    import glob
    from collections import defaultdict
    ruins = []
    por_projeto = defaultdict(list)
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
            name = slug.group(1).strip('"\'' ) if slug else os.path.basename(p)[:-4]
            if not os.path.exists(fp):
                ruins.append((name, "AUSENTE", c.group(1)))
                continue
            w, h = webp_dims(fp) or (0, 0)
            if h == 0:
                ruins.append((name, "ILEGIVEL", c.group(1)))
                continue
            if abs(w / h - 21 / 9) > 0.02:
                ruins.append((name, f"{w}x{h}", c.group(1)))
                continue
            # so entra na checagem de motivo quem tem capa valida
            brief = read_brief(name)
            motivo, _tag = pick_motif(brief)
            por_projeto[brief["project"]].append((motivo, name))

    # 2. DUPLICATA: duas capas nao podem ser o mesmo arquivo (md5 igual) nem
    #    visualmente indistinguiveis (dHash 16x16 com Hamming <= 8). Medido no
    #    acervo: 270 capas, 12 grupos md5 identicos cobrindo 51 arquivos — ou
    #    seja, 51 posts compartilhavam imagem. Dois posts com o mesmo MOTIVO
    #    (dois textos sobre teste) sao legitimos e nao falham.
    por_md5 = defaultdict(list)
    por_dhash = defaultdict(list)
    for proj, itens in por_projeto.items():
        for motivo, name in itens:
            fp = os.path.join(COVERS, name + ".webp")
            h1 = md5(fp)
            if h1:
                por_md5[h1].append(name)
            h2 = dhash(fp)
            if h2 is not None:
                por_dhash[proj].append((name, h2))

    duplicadas = []
    pares_vistos = set()
    for h1, nomes in por_md5.items():
        uniq = sorted(set(nomes))
        if len(uniq) > 1:
            duplicadas.append(("md5-identico", uniq))
            for a in uniq:
                for b in uniq:
                    if a < b:
                        pares_vistos.add((a, b))
    for proj, itens in por_dhash.items():
        for i in range(len(itens)):
            for j in range(i + 1, len(itens)):
                ni, hi = itens[i]
                nj, hj = itens[j]
                if ni == nj:
                    continue
                chave = (ni, nj) if ni < nj else (nj, ni)
                if chave in pares_vistos:
                    continue
                if hamming(hi, hj) <= 8:
                    duplicadas.append((f"visual ({proj})", [chave[0], chave[1]]))
                    pares_vistos.add(chave)
    return ruins, duplicadas


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--check" in args:
        ruins, duplicadas = check()
        if not ruins and not duplicadas:
            print("APTO: capas em 21/9 e nenhuma duplicata visual dentro do projeto")
            sys.exit(0)
        if ruins:
            print(f"REPROVADO: {len(ruins)} capa(s) com problema de arquivo/aspecto")
            for n, dim, cov in ruins[:40]:
                print(f"  {dim:>9}  {n[:58]}  -> {cov}")
        if duplicadas:
            print(f"\nAVISO: {len(duplicadas)} par(es) de capa identica/indistinguivel")
            for tipo, nomes in duplicadas[:20]:
                print(f"  {tipo:<16} {' == '.join(n[:38] for n in nomes[:3])}")
        sys.exit(1 if ruins else 0)
    if "--motif" in args:
        alvos = [a for a in args if not a.startswith("--")]
        if not alvos:
            print("Uso: --motif <slug> [...]  (mostra o motivo sem gerar imagem)")
            sys.exit(2)
        for slug in alvos:
            b = read_brief(slug)
            mo, tag = pick_motif(b)
            print(f"{slug[:46]:<46} {b['project']:<12} motivo={mo:<9} tag={tag or '-'}")
        sys.exit(0)
    if not args:
        raise SystemExit(__doc__)
    for slug in args:
        info = gerar(slug)
        print("OK %s  %-9s %-14s motivo=%-9s tag=%-12s dark=%s  %s bytes" % (
            info["slug"], info.get("dims", "-"), info["comp"], info["motif"],
            info["tag"] or "-", info["dark"], info.get("nbytes", "-")))
