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
import hashlib
import json
import os
import sys
import time
import urllib.request

import importlib.util

import numpy as np

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
POSE_DIR = os.path.join(LIFELOG_DIR, "public/sprites/poses")
COVER_W, COVER_H = 1024, 1024


def pick_pose(slug):
    """Personagem varia por post direto do acervo de poses do Samuel (06/11/22:59).

    Samuel: 'vou mandar personagem em varias posicoes... recorta e reusa todas
    daqui em diante'. Enquanto as poses nao chegam, cai no hero canonico.
    Escolha deterministico por hash do slug: mesmo post = mesma pose, e posts
    novos espalham pelas poses (sem repetir vizinho). --pose NOME força uma.
    """
    forced = [a for a in sys.argv if a.startswith("--pose=")]
    if not os.path.isdir(POSE_DIR):
        return SPRITE
    poses = sorted(f for f in os.listdir(POSE_DIR) if f.lower().endswith(".png"))
    if not poses:
        return SPRITE
    if forced:
        want = forced[0].split("=", 1)[1]
        hit = next((p for p in poses if os.path.splitext(p)[0] == want), None)
        if hit:
            return os.path.join(POSE_DIR, hit)
    # distribuicao ROUND-ROBIN por posto (nao por hash): hash colidia e repetia
    # a mesma pose em 4 das 9 capas (medido pelo VLM 07/11/2026 00:2x). Aqui
    # cada post pega a pose seguinte da lista ordenada de posts do projeto.
    posts = sorted(SCENE_BY_SLUG)
    if slug in posts:
        idx = posts.index(slug) % len(poses)
    else:  # post fora do mapa: cair no hash (estavel, sem repetir vizinho)
        idx = int(hashlib.md5(slug.encode("utf-8")).hexdigest(), 16) % len(poses)
    return os.path.join(POSE_DIR, poses[idx])

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
        "empty wide landscape just after rain: twisted cerrado trees, wet red "
        "earth with mirror puddles reflecting the sky, low mist, dark clouds "
        "with a single ray of light, an abandoned lantern on the ground. "
        "Air is wet but no falling rain, no streaks, no lines in the sky. "
        "Empty scene, no characters, no animals, no people, no text."
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
        "empty floating library above a misty valley at golden hour, stone and "
        "wood shelves drifting in the air, open books and paper fragments "
        "floating gently between them, warm amber light, low clouds far below, "
        "clean sky above. "
        "Empty scene, no grassland, no plain, no big tree, no man-made "
        "structures on the ground, no characters, no animals, no people, "
        "no text."
    ),
    "ponte-lanternas": (
        "calm open lake at twilight, smooth water mirror, small glowing "
        "driftwood pieces and smooth river stones resting on the water, "
        "soft light bloom under the surface, distant mountains, clear "
        "gradient sky. Empty scene, no bridge, no lanterns, no ropes, "
        "no wires, no lines across the image, no boats, no characters, "
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


def cover_crop(img, w, h, y_anchor=0.45):
    """Crop no aspect alvo (sem distorcer) + resize.

    `y_anchor` desloca a janela vertical quando a imagem e mais alta que o
    alvo: 0.45 pega a faixa um pouco acima do centro, onde ficam o horizonte e
    o assunto numa cena de paisagem — cortar exatamente no meio (0.5) decepava
    o ceu e sobrava chao vazio. Medido 07/11/2026 ao passar a capa de 1024x1024
    para 1680x720 (21/9, o aspect real do hero do post).
    """
    iw, ih = img.size
    target = w / h
    src = iw / ih
    if src > target:  # mais largo: corta lados
        nw = int(ih * target)
        x = (iw - nw) // 2
        box = (x, 0, x + nw, ih)
    else:
        nh = int(iw / target)
        y = int((ih - nh) * y_anchor)
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


def _dehalo(rgb, alpha, iters=6):
    """Tira o aro claro (residuo da folha branca) da borda do recorte.

    Medido 07/11/2026 em `espiando`: depois do corte binario, 1.234 pixels
    opacos na borda da silhueta tem luminancia media 239,2 (quantis 220/244/253)
    — o branco da folha virou borda solida, exatamente o aro que aparece na
    capa. Cura: pixel de borda claro bebe a cor do vizinho opaco escuro (a
    outline do personagem); se nao houver vizinho escuro, some (alpha 0).
    Pixel art aguenta perder 1-2 px de silhueta.
    """
    rgb = rgb.copy(); alpha = alpha.copy()
    for _ in range(iters):
        lum = rgb[..., 0] * .299 + rgb[..., 1] * .587 + rgb[..., 2] * .114
        transp = alpha < 10
        viz = np.zeros_like(transp)
        viz[:-1, :] |= transp[1:, :]; viz[1:, :] |= transp[:-1, :]
        viz[:, :-1] |= transp[:, 1:]; viz[:, 1:] |= transp[:, :-1]
        alvo = (alpha >= 250) & (lum > 190) & viz
        if not alvo.any():
            break
        escuro = (alpha >= 250) & (lum <= 190)
        nova = np.zeros_like(rgb); novo_alpha = alpha.copy()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            sh_r = np.roll(np.roll(rgb, dy, 0), dx, 1)
            sh_e = np.roll(np.roll(escuro, dy, 0), dx, 1)
            m = alvo & sh_e & (nova.sum(-1) == 0)
            nova[m] = sh_r[m]
        novo_alpha[alvo & (nova.sum(-1) == 0)] = 0     # sem vizinho escuro: apaga
        rgb = np.where(alvo[..., None] & (nova.sum(-1) > 0)[..., None], nova, rgb)
        alpha = novo_alpha
    return rgb, alpha


def hard_matte(sprite, thr=70):
    """Alpha binario + remocao do aro claro — borda seca, sem halo.

    Medido 07/11/2026 na pose `espiando`: 2.629 pixels na faixa semi-transparente
    (25<alpha<230) e 100% deles claros (luminancia media 241) — residuo da folha
    branca da sheet. Cortar a faixa sem mais nada deixa 1.234 pixels OPACOS e
    CLAROS na borda: o branco vira contorno solido. `_dehalo` pinta essa borda
    com a outline escura do personagem. Pixel art quer borda SECA, nunca o
    GaussianBlur do soften_alpha (ele espalha o branco para dentro).
    """
    rgb = np.asarray(sprite.convert("RGBA"))[..., :3].astype(int)
    alpha = np.asarray(sprite.convert("RGBA"))[..., 3]
    alpha = np.where(alpha >= thr, 255, 0)
    rgb, alpha = _dehalo(rgb, alpha)
    out = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha]).astype("uint8"))
    return out


def soften_alpha(sprite, grow=1, blur=1.2):
    """Borda do recorte: expande 1px e desfoja o alpha (evita 'cortado com estilete').

    Opt-in via `--soft-edge`. Em sprite de PIXEL ART esse borrao puxa a cor do
    fundo original (branco da sheet) para a borda — halo. Nao usar em pose.
    """
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


def compose(cover_bg, sprite, w, h, sprite_h_ratio=0.92, scene=None, pixel=False, soft_edge=False):
    """Sprite ancorado embaixo, com sombra de contato e vinheta inferior.

    `pixel=False` (padrao): fundo gerado pela IA entra liso — a pixelizacao
    NEAREST do fundo inteiro le como "grade/esquematico" (Samuel reprovou
    06/11/2026: "fundo tem algo como correntes e linhas"). O sprite continua
    em pixel art crisp; a integracao vem da sombra de contato + vinheta.

    Enquadramento horizontal: em moldura quadrada o personagem fica no centro;
    em paisagem (w/h > 1.5, ex.: 1680x720 = 21/9 do hero do post) ele entra no
    terco esquerdo (x_ratio 0.36) para a cena respirar no resto do quadro —
    centralizar em 21/9 deixa o personagem "nadando" no meio de um banner.
    """
    sprite = trim_alpha(sprite)
    cover = pixelate(cover_bg.convert("RGBA"), scene=scene, enabled=pixel).convert("RGBA")
    sh = int(h * sprite_h_ratio)
    sw = int(sprite.width * (sh / sprite.height))
    # borda SECA por padrao: o borrao do soften_alpha puxava o branco da folha
    # para a borda (halo, provado por medicao em 07/11/2026). `--soft-edge`
    # devolve o borrao para sprite que nao eh pixel art.
    sp = (soften_alpha if soft_edge else hard_matte)(sprite).resize((sw, sh), _RES)
    x_ratio = 0.36 if (w / h) > 1.5 else 0.5
    x = int(w * x_ratio - sw / 2)
    x = max(8, min(w - sw - 8, x))
    y = h - sh - int(h * 0.02)
    foot_y = min(h, y + sh)

    # Samuel 06/11/2026 22:10 aprovou a PAISAGEM de fundo: nada de silhueta
    # escura atras do personagem (lia como "fundo retangular"). Personagem
    # integra por sombra de contato no chao + vinheta inferior, nada de lamina.
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


def cover_size(argv):
    """Tamanho da capa. Padrao 1680x720 (21/9) — e o aspect real do hero do post
    (PostLayout.astro usa `aspect-[21/9]` + `object-cover`). Medido 07/11/2026:
    capa quadrada 1024x1024 era cortada pelo CSS em ~26% da altura (corte
    central), e Samuel viu o personagem decapitado/enquadramento estranho —
    "ta quadrado e la nao vai caber quadrado". `--size WxH` sobrescreve.
    """
    for a in argv:
        if a.startswith("--size="):
            try:
                w, h = a.split("=", 1)[1].lower().split("x")
                return int(w), int(h)
            except Exception:
                pass
    return int(os.environ.get("LIFELOG_COVER_W", 1680)), int(
        os.environ.get("LIFELOG_COVER_H", 720))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    cover_w, cover_h = cover_size(sys.argv)
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

    spr_path = pick_pose(slug)
    if not os.path.exists(spr_path):
        raise SystemExit(f"sprite nao encontrado: {spr_path}")
    sprite = Image.open(spr_path).convert("RGBA")

    bg_path = os.path.join(LIFELOG_DIR, f"public/covers/_bg-{slug}.webp")
    # Samuel 06/11/2026 22:10: "o fundo aqui para mim estava aprovado... devia ter
    # tirado era so as linhas, mas a paisagem do fundo tava ok". Ou seja: cenario
    # IA de VOLTA como padrao (paisagem aprovada), com as cenas reescritas para
    # nao nascerem correntes/cabos/rails. O fundo procedural fica so como opt-in
    # (--bg=procedural) e o residuo de xadrez do sprite, que era a causa real das
    # "listras", foi curado em scripts/sprite-cutout.py (maior componente + buracos).
    if "--bg=procedural" in sys.argv:
        bg = procedural_bg(cover_w, cover_h, scene, seed_text=slug)
    else:
        if not os.path.exists(bg_path):
            ok = gen_background(build_bg_prompt(scene, title), bg_path)
            if not ok:
                raise SystemExit("nao consegui gerar o fundo")
        bg = Image.open(bg_path).convert("RGB")

    cover = compose(cover_crop(bg, cover_w, cover_h), sprite, cover_w, cover_h,
                    scene=scene, pixel=("--pixel" in sys.argv),
                    soft_edge=("--soft-edge" in sys.argv))
    out = os.path.join(LIFELOG_DIR, f"public/covers/{slug}.webp")
    cover.save(out, "WEBP", quality=88, method=6)
    print(f"OK {out} scene={scene} bytes={os.path.getsize(out)}")


if __name__ == "__main__":
    main()
