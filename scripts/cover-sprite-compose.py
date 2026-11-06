#!/usr/bin/env python3
"""Capa com o personagem recortado + fundo gerado por IA (sprite sobre cena).

Direcao do Samuel (06/11/2026): "pegar o personagem, recortar ele e colocar nos
fundos diferenciados em cada postagem". Ou seja: o personagem NAO e gerado por IA
(e sai torto, com bico, roupa errada) - ele e o asset fixo recortado do sprite
 canonico. O que varia por post e o FUNDO.

Uso:
  python3 scripts/cover-sprite-compose.py <slug> [--scene CHAVE] [--force]

Saida: public/covers/<slug>.webp (WebP, 1024x1024, sprite ancorado embaixo/centro).

- sprite: public/sprites/yurumi-hero.png (PNG RGBA, recorte do xadrez em
  scripts/sprite-cutout.py)
- fundo: worker FLUX com prompt de CENA VAZIA (sem personagem/animal/pessoa)
- cena: registrada em SCENES (chave -> tema). Default por projeto.
"""
import json
import os
import sys
import time
import urllib.request

import importlib.util

from PIL import Image, ImageDraw, ImageFilter  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
LIFELOG_DIR = os.path.join(HERE, "..")
_spec = importlib.util.spec_from_file_location(
    "regen_covers_ai", os.path.join(HERE, "regen-covers-ai.py"))
rc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rc)

try:  # Pillow >= 10 moveu os filtros para Image.Resampling
    _RES = Image.Resampling.LANCZOS
except AttributeError:  # pragma: no cover - Pillow antigo
    _RES = Image.LANCZOS
try:
    _NEAREST = Image.Resampling.NEAREST
except AttributeError:  # pragma: no cover - Pillow antigo
    _NEAREST = Image.NEAREST

SPRITE = os.path.join(LIFELOG_DIR, "public/sprites/yurumi-hero.png")
COVER_W, COVER_H = 1024, 1024

# Fundos diferenciados por postagem: chave -> descricao da cena (sem personagem)
SCENES = {
    "cerrado-cosmico": (
        "empty wide landscape at night: twisted cerrado trees (pequi and ipe), "
        "golden dry grass, red earth, camping lanterns and a small tent on the "
        "ground, cosmic sky with a huge ringed planet, nebula and aurora. "
        "Empty scene, no characters, no animals, no people, no sprite, no text."
    ),
    "cerrado-amanhecer": (
        "empty wide landscape at dawn: twisted cerrado trees, morning mist over "
        "red earth, warm golden light, dew on golden grass, nobody around. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "cerrado-chuva": (
        "empty wide landscape under rain: twisted cerrado trees, wet red earth, "
        "rain streaks and puddles, dark clouds with a single ray of light, "
        "abandoned lantern. Empty scene, no characters, no animals, no people, no text."
    ),
    "campo-estrelas": (
        "empty highland field at night, millions of stars, milky way arch, "
        "silhouetted twisted trees on the horizon, a stone trail. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "torre-servidores": (
        "empty corridor of a data center, rows of dark server racks, small green "
        "and amber LEDs, cool blue light on the floor, no one in the corridor. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "floresta-nebulosa": (
        "empty dense forest clearing at night, giant twisted trees, bioluminescent "
        "moss, blue nebula visible through the canopy, fireflies. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "deserto-areia": (
        "empty desert of red sand at sunset, tall dunes, wind-carved rocks, "
        "two distant moons on the horizon. Empty scene, no characters, no animals, "
        "no people, no text."
    ),
    "ruinas-runas": (
        "empty ruins of an ancient stone temple at night, broken columns, "
        "glowing runic carvings, moss and fireflies, full moon. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "biblioteca-flutuante": (
        "empty abandoned library interior, tall wooden shelves, open books and "
        "scrolls floating in the air, warm lantern light, dust motes. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "ponte-lanternas": (
        "empty old wooden bridge over a still lake at night, rows of paper "
        "lanterns reflected in the water, mist, mountains in the distance. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "caverna-cristais": (
        "empty crystal cave, giant blue and violet crystals growing from the "
        "rock, underground pool reflecting the glow, small glowing spores. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
    "observatorio": (
        "empty hilltop observatory with a brass telescope, open dome to a "
        "nebula-filled sky, stone path, night. "
        "Empty scene, no characters, no animals, no people, no text."
    ),
}

# cena padrao por projeto quando --scene nao e informado
DEFAULT_SCENE = {"yurumi": "cerrado-cosmico"}

# fundo diferenciado por postagem (Samuel 06/11/2026: cada post com fundo diferente)
SCENE_BY_SLUG = {
    "yurumi-a-janela-que-o-subconjunto-aprovou": "cerrado-cosmico",
    "yurumi-a-memoria-que-aprendeu-a-ser-agente": "floresta-nebulosa",
    "yurumi-a-memoria-que-precisava-esquecer": "campo-estrelas",
    "yurumi-a-mensagem-que-saiu-sem-recibo": "cerrado-chuva",
    "yurumi-a-config-que-dava-razao-ao-arquivo": "torre-servidores",
    "yurumi-o-dry-run-que-gravava": "ponte-lanternas",
    "yurumi-o-guard-que-mede-o-resultado": "deserto-areia",
    "yurumi-o-indice-cego-para-as-proprias-skills": "biblioteca-flutuante",
    "yurumi-o-loop-de-consolidacao-de-memoria-que-nao-dorme": "ruinas-runas",
}

# grade de cor por cena (multipliers RGB) — fundos visualmente distintos por post
GRADE = {
    "cerrado-cosmico": (1.00, 0.98, 1.12),
    "floresta-nebulosa": (0.82, 1.14, 0.98),
    "campo-estrelas": (1.16, 1.00, 0.84),
    "cerrado-chuva": (0.84, 0.96, 1.18),
    "torre-servidores": (1.10, 1.10, 1.06),
    "ponte-lanternas": (1.20, 1.02, 0.86),
    "deserto-areia": (1.22, 0.96, 0.80),
    "ruinas-runas": (1.02, 0.88, 1.14),
    "biblioteca-flutuante": (1.14, 0.98, 0.90),
    "caverna-cristais": (0.86, 0.98, 1.16),
    "observatorio": (1.06, 1.02, 1.10),
}

NEGATIVE_TAIL = (
    "No chains, no ropes, no cables, no wires, no fences, no railings, no grids, "
    "no lattice, no net, no mesh, no hatching, no stripes, no scratches, no "
    "graffiti, no scaffolding, no ladders, no brackets, no jagged or abstract "
    "line patterns, no wireframe, no puzzle pieces, no frames, no borders, no "
    "vignette, no overlays, no checkered pattern, no diagonal lines, no repeated "
    "linear motifs. Smooth natural environment only."
)

STYLE_TAIL = (
    "16-bit pixel art game background, chunky visible pixels, limited palette of "
    "warm tan, deep navy and teal, crisp dithering, wide landscape composition, "
    "cinematic lighting, no characters, no UI, no text."
)


def build_bg_prompt(scene_key, title=""):
    scene = SCENES.get(scene_key)
    if not scene:
        raise SystemExit(f"cena desconhecida: {scene_key} (use --scene)")
    return f"{scene} {STYLE_TAIL} {NEGATIVE_TAIL}"


def gen_background(prompt, path, tries=3):
    """Gera o fundo no worker (sem personagem)."""
    worker = rc.load_worker_url()
    key = rc.load_api_key()
    if not (worker and key):
        raise SystemExit("worker/key do lifelog nao configurados (.env)")
    for i in range(tries):
        data = json.dumps({"prompt": prompt}).encode("utf-8")
        req = urllib.request.Request(worker, data=data, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "User-Agent": "LifeLog-Cover-Sprite/1.0",
        })
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                raw = resp.read()
            with open(path, "wb") as f:
                f.write(raw)
            rc.normalize_to_webp(path)
            return True
        except Exception as e:
            print(f"fundo falhou ({i+1}/{tries}): {e}")
            time.sleep(3)
    return False


def cover_crop(img, w, h):
    """Crop central no aspect alvo (sem distorcer) + resize."""
    iw, ih = img.size
    target = w / h
    src = iw / ih
    if src > target:  # mais largo: corta lados
        nw = int(ih * target)
        x = (iw - nw) // 2
        box = (x, 0, x + nw, ih)
    else:
        nh = int(iw / target)
        y = (ih - nh) // 2
        box = (0, y, iw, y + nh)
    return img.crop(box).resize((w, h), _RES)


def pixelate(img, grid=256, scene=None):
    """Reduz a resolucao e volta com NEAREST -> chunky pixel art (casa com o sprite)."""
    if scene:
        img = apply_grade(img, scene)
    w, h = img.size
    small = img.resize((grid, max(1, int(grid * h / w))), _RES)
    return small.resize((w, h), _NEAREST)


def soften_alpha(sprite, grow=1, blur=1.2):
    """Borda do recorte: expande 1px e desfoja o alpha (evita 'cortado com estilete')."""
    a = sprite.getchannel("A")
    a = a.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    a = a.filter(ImageFilter.GaussianBlur(blur))
    out = sprite.copy()
    out.putalpha(a)
    return out


def trim_alpha(sprite, pad=6):
    """Corta o padding transparente do sprite (o personagem ocupa ~14% do box)."""
    bbox = sprite.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        return sprite
    x0, y0, x1, y1 = bbox
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(sprite.width, x1 + pad), min(sprite.height, y1 + pad)
    return sprite.crop((x0, y0, x1, y1))


def apply_grade(bg, scene):
    """Grade de cor por cena — diferencia visualmente os fundos entre posts."""
    r, g, b = GRADE.get(scene, (1.0, 1.0, 1.0))
    out = bg.copy()
    ch = out.split()
    out.putdata(list(zip(
        [min(255, int(round(v * r))) for v in ch[0].getdata()],
        [min(255, int(round(v * g))) for v in ch[1].getdata()],
        [min(255, int(round(v * b))) for v in ch[2].getdata()],
    )))
    return out


def compose(cover_bg, sprite, w, h, sprite_h_ratio=0.92, scene=None):
    """Sprite ancorado embaixo/centro, com sombra de contato e vinheta inferior."""
    sprite = trim_alpha(sprite)
    cover = pixelate(cover_bg.convert("RGBA"), scene=scene).convert("RGBA")
    # blur leve no fundo pixelado: remove a leitura de "grade/esquematico"
    # (o bloco duro do NEAREST li como blueprint de linhas finas)
    cover = cover.filter(ImageFilter.GaussianBlur(1.1))
    sh = int(h * sprite_h_ratio)
    sw = int(sprite.width * (sh / sprite.height))
    sp = soften_alpha(sprite).resize((sw, sh), _RES)
    x = (w - sw) // 2
    y = h - sh - int(h * 0.02)
    foot_y = min(h, y + sh)

    # sombra/rima escura logo atras do personagem (da peso e tira o 'flutuando')
    rim = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rm = sprite.convert("L").point(lambda v: 255 if v > 40 else 0)
    rm = rm.resize((sw, sh), _RES).filter(ImageFilter.GaussianBlur(6))
    black = Image.new("RGBA", (sw, sh), (6, 10, 20, 120))
    rim.paste(black, (x - 4, y + 3), rm.resize((sw, sh), _RES))
    rim = rim.filter(ImageFilter.GaussianBlur(5))
    cover = Image.alpha_composite(cover, rim)

    # sombra de contato projetada no chao (aparece dos dois lados dos pes)
    sh_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh_layer)
    d.ellipse((x - sw * 0.10, foot_y - int(h * 0.040),
               x + sw * 1.10, foot_y + int(h * 0.010)),
              fill=(0, 0, 0, 165))
    sh_layer = sh_layer.filter(ImageFilter.GaussianBlur(16))
    cover = Image.alpha_composite(cover, sh_layer)

    cover.paste(sp, (x, y), sp)

    # faixa escura onde os pes encontram o chao (amarra o sprite ao solo)
    band = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    db = ImageDraw.Draw(band)
    db.rectangle((x - sw * 0.10, foot_y - 4, x + sw * 1.10, foot_y + 6),
                 fill=(4, 8, 16, 130))
    band = band.filter(ImageFilter.GaussianBlur(4))
    cover = Image.alpha_composite(cover, band)

    # vinheta inferior suave para o sprite "entrar" na cena
    vg = Image.new("L", (w, h), 0)
    dv = ImageDraw.Draw(vg)
    dv.rectangle((0, int(h * 0.78), w, h), fill=48)
    vg = vg.filter(ImageFilter.GaussianBlur(80))
    dark = Image.new("RGBA", (w, h), (8, 12, 24, 255))
    cover = Image.composite(dark, cover, vg.point(lambda v: v))
    return cover.convert("RGB")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    scene = "cerrado-cosmico"
    if "--scene" in sys.argv:
        scene = sys.argv[sys.argv.index("--scene") + 1]
    if not args:
        raise SystemExit("uso: cover-sprite-compose.py <slug> [--scene CHAVE]")
    slug = args[0]

    project, title = rc.read_meta(slug)
    if "--scene" not in sys.argv:
        if slug in SCENE_BY_SLUG:
            scene = SCENE_BY_SLUG[slug]
        else:
            scene = DEFAULT_SCENE.get(project, scene)

    spr_path = SPRITE
    if not os.path.exists(spr_path):
        raise SystemExit(f"sprite nao encontrado: {spr_path}")
    sprite = Image.open(spr_path).convert("RGBA")

    bg_path = os.path.join(LIFELOG_DIR, f"public/covers/_bg-{slug}.webp")
    if not os.path.exists(bg_path):
        ok = gen_background(build_bg_prompt(scene, title), bg_path)
        if not ok:
            raise SystemExit("nao consegui gerar o fundo")
    bg = Image.open(bg_path).convert("RGB")

    cover = compose(cover_crop(bg, COVER_W, COVER_H), sprite, COVER_W, COVER_H, scene=scene)
    out = os.path.join(LIFELOG_DIR, f"public/covers/{slug}.webp")
    cover.save(out, "WEBP", quality=88, method=6)
    print(f"OK {out} scene={scene} bytes={os.path.getsize(out)}")


if __name__ == "__main__":
    main()
