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
        "empty wide stone plateau at dusk under a teal sky, one single tall "
        "monolithic obelisk silhouette on the horizon, low fog, distant "
        "mountains, smooth open ground. Empty scene, no buildings, no machines, "
        "no cables, no panels, no characters, no animals, no people, no text."
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
        "empty wide moonlit grassland at night, one single broken stone column "
        "on the horizon, low ground mist, huge full moon, fireflies near the "
        "floor, smooth open ground. Empty scene, no walls, no rows of pillars, "
        "no runes, no carvings, no characters, no animals, no people, no text."
    ),
    "biblioteca-flutuante": (
        "wide sunrise grassland with a single big tree silhouette on the horizon, "
        "warm orange and gold sky, low mist on the ground, a few small floating "
        "light motes, wide clean empty sky above. "
        "Empty scene, no man-made structures, no characters, no animals, no "
        "people, no text."
    ),
    "ponte-lanternas": (
        "calm open lake at twilight, smooth water mirror, glowing rocks floating "
        "above the surface, distant mountains, clear gradient sky. "
        "Empty scene, no bridge, no lanterns, no ropes, no boats, no characters, "
        "no animals, no people, no text."
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
    "Clean natural landscape only, no man-made structures, no linear repeated "
    "patterns, no text."
)

# paleta por cena (topo -> base) usada pelo fundo procedural
PALETTE = {
    "cerrado-cosmico": [(18, 22, 48), (38, 44, 86), (84, 66, 96), (150, 104, 92)],
    "cerrado-amanhecer": [(28, 26, 62), (96, 72, 104), (196, 138, 110), (238, 196, 150)],
    "cerrado-chuva": [(22, 30, 52), (44, 62, 92), (92, 116, 140), (150, 172, 186)],
    "campo-estrelas": [(18, 16, 62), (46, 44, 116), (102, 92, 176), (176, 160, 216)],
    "torre-servidores": [(24, 30, 40), (38, 52, 66), (74, 94, 112), (132, 152, 168)],
    "floresta-nebulosa": [(12, 26, 26), (24, 52, 44), (48, 86, 62), (96, 124, 92)],
    "deserto-areia": [(48, 24, 56), (124, 48, 74), (204, 112, 70), (242, 192, 126)],
    "ruinas-runas": [(28, 10, 18), (72, 20, 30), (132, 44, 46), (204, 104, 74)],
    "biblioteca-flutuante": [(18, 46, 48), (44, 96, 88), (116, 172, 138), (206, 232, 190)],
    "ponte-lanternas": [(8, 14, 44), (22, 38, 88), (58, 84, 136), (142, 166, 206)],
    "caverna-cristais": [(14, 20, 44), (26, 42, 78), (52, 78, 120), (96, 124, 158)],
    "observatorio": [(12, 18, 40), (30, 44, 80), (70, 90, 120), (140, 154, 172)],
}


def procedural_bg(w, h, scene_key, seed_text=""):
    """Fundo deterministic: degradé + ruido de valor de BAIXA frequencia.

    Substitui o gerador de imagem (rodadas 1-4, 06/11/2026): o FLUX insistiu em
    correntes, lampioes, racks e listras mesmo com prompt positivo-only — Samuel
    reprovou 3x ("fundo tem algo como correntes e linhas" -> "linhas formando
    listras"). Aqui nao existe alta frequencia: so 4 oitavas em 4/8/16/32 blocos,
    amplitude decrescente, mais um brilho difuso. Sem linha dura, sem grade, sem repeticao.
    """
    import numpy as np
    up = getattr(getattr(Image, "Resampling", Image), "BILINEAR", 2)
    pal = np.array(PALETTE.get(scene_key, PALETTE["cerrado-cosmico"]), dtype=float) / 255.0
    rng = np.random.default_rng(abs(hash((scene_key, seed_text))) % (2 ** 32))

    field = np.zeros((h, w), dtype=float)
    total = 0.0
    for i, blocks in enumerate((4, 8, 16, 32)):
        g = rng.random((blocks + 1, blocks + 1))
        # BILINEAR + blur: BICUBIC/Lanczos nos grids pequenos cria RINGING
        # (contorno cinza em cada celula) — Samuel leu como "linhas formando
        # listras"/grade em 20:20. Reamostragem monotona nao produz contorno.
        up_img = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), up)
        up_img = up_img.filter(ImageFilter.GaussianBlur(3.0 + i))
        amp = (0.52, 0.26, 0.14, 0.08)[i]
        field += amp * (np.asarray(up_img, dtype=float) / 255.0)
        total += amp
    field /= total

    y = np.linspace(0.0, 1.0, h)[:, None]
    x = np.linspace(0.0, 1.0, w)[None, :]
    base = 0.62 * y + 0.38 * np.clip(1.25 - 0.55 * y - 0.45 * x, 0.0, 1.0)
    t = np.clip(base * 0.55 + field * 0.75, 0.0, 1.0)

    cx, cy = rng.uniform(0.15, 0.85), rng.uniform(0.05, 0.35)
    d = np.sqrt(((x - cx) * w) ** 2 + ((y - cy) * h) ** 2) / max(w, h)
    t = np.clip(t + np.exp(-((d / 0.55) ** 2)) * rng.uniform(0.10, 0.22) * 0.6, 0.0, 1.0)

    pos = t * (pal.shape[0] - 1)
    i0 = np.clip(np.floor(pos).astype(int), 0, pal.shape[0] - 2)
    frac = (pos - i0)[..., None]
    img = pal[i0] * (1.0 - frac) + pal[i0 + 1] * frac
    return Image.fromarray((np.clip(img, 0.0, 1.0) * 255).astype(np.uint8), "RGB")

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


def pixelate(img, grid=256, scene=None, enabled=True):
    """Grade de cor + (opcional) reducao/volta com NEAREST -> chunky pixel art."""
    if scene:
        img = apply_grade(img, scene)
    if not enabled:
        return img
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


def compose(cover_bg, sprite, w, h, sprite_h_ratio=0.92, scene=None, pixel=False):
    """Sprite ancorado embaixo/centro, com sombra de contato e vinheta inferior.

    `pixel=False` (padrao): fundo gerado pela IA entra liso — a pixelizacao
    NEAREST do fundo inteiro le como "grade/esquematico" (Samuel reprovou
    06/11/2026: "fundo tem algo como correntes e linhas"). O sprite continua
    em pixel art crisp; a integracao vem da sombra de contato + vinheta.
    """
    sprite = trim_alpha(sprite)
    cover = pixelate(cover_bg.convert("RGBA"), scene=scene, enabled=pixel).convert("RGBA")
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
    if "--bg=ai" in sys.argv:
        if not os.path.exists(bg_path):
            ok = gen_background(build_bg_prompt(scene, title), bg_path)
            if not ok:
                raise SystemExit("nao consegui gerar o fundo")
        bg = Image.open(bg_path).convert("RGB")
    else:
        # padrao: fundo procedural (sem artefato de gerador). Use --bg=ai para voltar ao FLUX.
        bg = procedural_bg(COVER_W, COVER_H, scene, seed_text=slug)

    cover = compose(cover_crop(bg, COVER_W, COVER_H), sprite, COVER_W, COVER_H,
                    scene=scene, pixel=("--pixel" in sys.argv))
    out = os.path.join(LIFELOG_DIR, f"public/covers/{slug}.webp")
    cover.save(out, "WEBP", quality=88, method=6)
    print(f"OK {out} scene={scene} bytes={os.path.getsize(out)}")


if __name__ == "__main__":
    main()
