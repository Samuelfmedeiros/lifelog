#!/usr/bin/env python3
"""Gate de pixels para capas AI do LifeLog (27/11/2026).

Motivo: o Worker FLUX Schnell NAO e' determinístico (seed ignorado). Medido em
10 capas de exemplo: 7 passaram no gate, 3 saíram escuras ou com fundo branco.
Antes deste modulo, `regen-covers-ai.py` aceitava a primeira imagem que voltava.
Agora ele tenta ate TRIES variantes e so' salva uma que passe aqui.

Criterios (calibrados em 27/11 com o acervo e com as 10 capas de exemplo):
    dims       2100x900 (padrao 21:9 do acervo)
    brightness >= 80%  (site de tema claro; <50% = capa escura)
    branco     <= 1%   (FLUX as vezes renderiza fundo branco puro)
    borda      soma RGB >= 120 nas duas colunas de 40px (sem letterbox)

Nunca alterar estes limites para "passar" uma capa ruim: o gate existe para
impedir que capa branca/escura entre no ar. Se nenhuma variante passar, a
geracaofalha alto e o chamador decide — nunca salvar a melhor das ruins.
"""
import os

from PIL import Image

DIMS = (2100, 900)
BRIGHTNESS_MIN = 80.0
WHITE_MAX = 1.0
BORDER_MIN = 120
TRIES = max(1, int(os.environ.get("LIFELOG_COVER_TRIES", "3")))


def medir(path):
    """Mede dimensao, brightness, branco e bordas de uma capa 21:9."""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    small = im.resize((100, 100))
    px = list(small.getdata())
    branco = sum(1 for r, g, b in px if r > 230 and g > 230 and b > 230) / len(px) * 100
    gray = im.convert("L").resize((100, 100))
    brightness = sum(gray.getdata()) / 10000 / 255 * 100
    esq = im.crop((0, 0, 40, h)).resize((1, 1)).getpixel((0, 0))
    dir_ = im.crop((w - 40, 0, w, h)).resize((1, 1)).getpixel((0, 0))
    return {
        "dims": (w, h),
        "brightness": round(brightness, 1),
        "white": round(branco, 2),
        "borda_esq": sum(esq),
        "borda_dir": sum(dir_),
    }


def passa(m):
    """True so' se TODOS os criterios estiverem dentro do padrao."""
    return (
        m["dims"] == DIMS
        and m["brightness"] >= BRIGHTNESS_MIN
        and m["white"] <= WHITE_MAX
        and m["borda_esq"] >= BORDER_MIN
        and m["borda_dir"] >= BORDER_MIN
    )


def score(m):
    """Distancia ao padrao — usada SOMENTE para diagnostico/relatorio.

    Nunca para escolher capa para publicar: se nenhuma passou, a geracao falha.
    """
    return abs(BRIGHTNESS_MIN - m["brightness"]) + m["white"] * 2


def motivo_reprovacao(m):
    """Texto curto explicando POR QUE a capa foi reprovada."""
    motivos = []
    if m["dims"] != DIMS:
        motivos.append("dims=%sx%s" % m["dims"])
    if m["brightness"] < BRIGHTNESS_MIN:
        motivos.append("escura %.1f%%" % m["brightness"])
    if m["white"] > WHITE_MAX:
        motivos.append("branca %.2f%%" % m["white"])
    if m["borda_esq"] < BORDER_MIN or m["borda_dir"] < BORDER_MIN:
        motivos.append("borda %s/%s" % (m["borda_esq"], m["borda_dir"]))
    return ", ".join(motivos) or "ok"
