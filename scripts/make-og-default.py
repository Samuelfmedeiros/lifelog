#!/usr/bin/env python3
"""make-og-default.py — gera public/og-default.png (1200x630).

Imagem OG padrao do site (todas as paginas sem capa de post: home, /en/,
/arquivo, /sobre, /tag/*). Sem og:image o LinkedIn ignora o card e cai em
busca pelo dominio (bug Arachne 14/09) — esta imagem e o fallback.

Estilo: tema dark do blog (fundo navy, acento roxo da paleta purple,
grid sutil). Fonte Inter (mesma do site). Sem emojis (regra global).

Uso: python3 scripts/make-og-default.py   (a partir da raiz do repo)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og-default.png"

W, H = 1200, 630
BG_TOP = (11, 16, 32)        # navy escuro (fundo dark do blog)
BG_BOT = (17, 12, 38)
ACCENT = (167, 139, 250)     # #a78bfa — accent dark da paleta purple
ACCENT_DEEP = (124, 58, 237)  # #7c3aed
TEXT = (241, 245, 249)       # slate-100
MUTED = (148, 163, 184)      # slate-400

FONT_DIR = Path("/usr/share/fonts/opentype/inter")


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = {
        "bold": ["Inter-Bold.otf", "Inter-ExtraBold.otf", "DejaVuSans-Bold.ttf"],
        "semi": ["Inter-SemiBold.otf", "Inter-Bold.otf", "DejaVuSans.ttf"],
        "regular": ["Inter-Regular.otf", "Inter-Medium.otf", "DejaVuSans.ttf"],
    }[weight]
    for name in candidates:
        p = FONT_DIR / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default(size)


def lerp(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def main() -> None:
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)

    # gradiente vertical base
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(BG_TOP, BG_BOT, y / H))

    # grid sutil (eco do cockpit do portfolio, bem discreto) via overlay alpha
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    grid = (255, 255, 255, 10)
    for gx in range(0, W, 48):
        od.line([(gx, 0), (gx, H)], fill=grid)
    for gy in range(0, H, 48):
        od.line([(0, gy), (W, gy)], fill=grid)

    # glow radial roxo no canto direito
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    cx, cy, r = 980, 140, 420
    for rr in range(r, 0, -6):
        a = int(70 * (1 - rr / r))
        gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=a)
    glow_rgb = Image.new("RGBA", (W, H))
    glow_rgb.paste(Image.new("RGB", (W, H), ACCENT_DEEP), (0, 0))
    glow_rgb.putalpha(glow)

    img = img.convert("RGBA")
    img = Image.alpha_composite(img, glow_rgb)
    img = Image.alpha_composite(img, overlay)
    d = ImageDraw.Draw(img)

    # marca: LifeLog (Life claro + Log acento)
    f_brand = font("bold", 92)
    tag = "LifeLog"
    d.text((88, 196), "Life", font=f_brand, fill=TEXT)
    life_w = d.textlength("Life", font=f_brand)
    d.text((88 + life_w, 196), "Log", font=f_brand, fill=ACCENT)

    # barra de acento
    d.rounded_rectangle([88, 322, 168, 330], radius=4, fill=ACCENT_DEEP)

    # tagline
    d.text((88, 356), "A jornada de aprendizado de Samuel Medeiros",
           font=font("semi", 30), fill=MUTED)

    # dominio no rodape
    d.text((88, 528), "lifelog.seu.pet", font=font("regular", 24), fill=(100, 116, 139))

    img.convert("RGB").save(OUT, "PNG")
    print(f"OK {OUT} {img.size}")


if __name__ == "__main__":
    main()
