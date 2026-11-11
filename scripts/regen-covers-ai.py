#!/usr/bin/env python3
"""Regenera capas AI (Worker Cloudflare FLUX) para slugs específicos — sem depender do WSL.

Uso:
  python3 regen-covers-ai.py                      # alvos padrão (3 últimos + dogwalk)
  python3 regen-covers-ai.py <slug1> <slug2>      # só os informados (project/title lidos do frontmatter)

Requisitos:
  - `.env` do lifelog com LIFELOG_COVER_API_KEY (ou env var)
  - Rede disponível (Worker HTTP — funciona mesmo se `wsl -e` estiver morto, desde que
    o script rode num Python que enxergue o repo: nativo Windows via UNC ou WSL)

A saída é WEBP 1024x1024 gravada em public/covers/<slug>.webp (force=True sobrescreve).

Baseado na sessão 14/08/2026: capas PIL regeneradas com draw_project_icon ficaram
com brightness ~28 (parecem "sem imagem"); capas AI do Worker ficam ~130+.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# Repo físico: trocar para \\\\wsl$\\kali-linux\\home\\samuel\\projetos\\lifelog no Windows nativo
LIFELOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
COVERS_DIR = os.path.join(LIFELOG_DIR, "public/covers")
POSTS_DIR = os.path.join(LIFELOG_DIR, "src/content/posts")
WORKER_URL = os.environ.get("LIFELOG_COVER_WORKER_URL", "")


def load_worker_url():
    url = os.environ.get("LIFELOG_COVER_WORKER_URL", "")
    if url:
        return url
    env_path = os.path.join(LIFELOG_DIR, ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            line = line.strip()
            if line.startswith("LIFELOG_COVER_WORKER_URL"):
                return line.split("=", 1)[1].strip()
    return ""


def load_api_key():
    key = os.environ.get("LIFELOG_COVER_API_KEY")
    if key:
        return key
    env_path = os.path.join(LIFELOG_DIR, ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            line = line.strip()
            if line.startswith("LIFELOG_COVER_API_KEY"):
                return line.split("=", 1)[1].strip()
    return None


def parse_frontmatter(content):
    m = re.search(r"^---\s*\n(.*?)\n---", content, re.S)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm


def read_meta(slug):
    """Lê project + title do frontmatter do post (procura na raiz e em en/)."""
    for sub in ("", "en/"):
        p = os.path.join(POSTS_DIR, sub, f"{slug}.mdx")
        if os.path.exists(p):
            fm = parse_frontmatter(open(p, encoding="utf-8").read())
            return fm.get("project", "descobertas"), fm.get("title", slug)
    return "descobertas", slug


PROJECT_STYLES = {
    "arachne": {"prompt_suffix": "Minimal flat illustration, one single large solid circular web emblem in deep violet with thick bold radial spokes and a solid spider silhouette at the center, filling most of the frame, on a plain light cream background, bright and luminous, high key lighting, decisive color contrast, clean composition, absolutely no dark areas, no thin hairline strokes, no small marks, no text, 16:9 wallpaper", "colors": ["#6d28d9", "#a78bfa", "#fde68a"]},
    "dogwalk": {"prompt_suffix": "Minimal flat illustration, one single large solid rounded app-tile shape in strong violet with a bold warm amber accent band across it, filling most of the frame, on a plain light cream background, bright and luminous, high key lighting, decisive color contrast, clean composition, absolutely no dark areas, no text, 16:9 wallpaper", "colors": ["#6d28d9", "#f59e0b", "#fde68a"]},
    "portfolio": {"prompt_suffix": "Minimal flat illustration, one single large solid rocket shape in vivid cyan-blue on a plain light cream background, bright and luminous, high key lighting, soft pastel gradient, vast empty space, clean composition, absolutely no dark areas, no text, 16:9 wallpaper", "colors": ["#0ea5e9", "#67e8f9", "#bae6fd"]},
    "capivara": {"prompt_suffix": "Minimal flat illustration, one single large solid rounded monitoring-panel shape in vivid amber-orange with a bold darker accent bar across it, filling most of the frame, on a plain light cream background, bright and luminous, high key lighting, decisive color contrast, clean composition, absolutely no dark areas, no text, 16:9 wallpaper", "colors": ["#f59e0b", "#fb923c", "#fde68a"]},
    "tatuengine": {"prompt_suffix": "Minimal flat illustration, one single large solid breaking-wave shape in deep teal with a bold lighter teal accent band across it, filling most of the frame, on a plain light cream background, bright and luminous, high key lighting, decisive color contrast, clean composition, absolutely no dark areas, solid flat fill, no interior detail, no small marks, no text, 16:9 wallpaper", "colors": ["#0f766e", "#2dd4bf", "#fde68a"]},
    "seguranca": {"prompt_suffix": "Minimal flat illustration, one single large solid shield shape in vivid red on a plain light cream background, bright and luminous, high key lighting, soft pastel gradient, vast empty space, clean composition, absolutely no dark areas, 16:9 wallpaper", "colors": ["#ef4444", "#fca5a5", "#fde68a"]},
    "lifelog": {"prompt_suffix": "Minimal flat illustration, one single large solid vertical page-card shape in vivid violet with a bold amber accent band across its lower third, filling most of the frame, on a plain light cream background, bright and luminous, high key lighting, decisive color contrast, flat solid colors only, no interior detail, no lines, no small marks, clean composition, absolutely no dark areas, no text, 16:9 wallpaper", "colors": ["#6d28d9", "#a855f7", "#fde68a"]},
    "estudos": {"prompt_suffix": "Minimal flat illustration, one single large solid open book shape in deep cobalt blue with a bold azure accent band across it, filling most of the frame, on a plain light cream background, bright and luminous, high key lighting, decisive color contrast, flat solid colors only, no interior detail, no small marks, clean composition, absolutely no dark areas, no text, 16:9 wallpaper", "colors": ["#1d4ed8", "#38bdf8", "#fde68a"]},
    "yurumi": {"prompt_suffix": "Pixel art adventure scene. Anthropomorphic giant anteater (tamanduá-bandeira) character with long tubular snout, small ears, huge bushy tail, black-and-white diagonal band across the shoulders, wearing green military-style jacket, cargo pants and large backpack, standing on a dirt path in the cerrado of Brasília, Brazil. Typical cerrado landscape: twisted trees (pequi, ipê), dry golden grasses, red earth, low shrubs. Cosmic night sky with planets, Saturn rings, nebulae, aurora borealis in the background. Camping gear (lantern, stove) nearby. Warm tan and deep navy palette. Sense of wonder and exploration. 16:9 wallpaper", "colors": ["#b98a5e", "#22d3ee", "#0b1424"]},
    "descobertas": {"prompt_suffix": "Minimal flat illustration, one single large solid curved arrow shape in vivid azure blue bending back on itself, filling most of the frame, on a plain light cream background, bright and luminous, high key lighting, decisive color contrast, flat solid colors only, no interior detail, no small marks, clean composition, absolutely no dark areas, no text, 16:9 wallpaper", "colors": ["#1d4ed8", "#38bdf8", "#fde68a"]},
}

PROJECT_MOODS = {
    "arachne": "mysterious, crawling, interconnected web of data",
    "dogwalk": "clean, modern, premium SaaS platform, no animals, no pets, abstract service-network aesthetic",
    "portfolio": "futuristic, polished, luminous interface",
    "capivara": "warm, tropical, sunset over digital landscape",
    "tatuengine": "flowing, mathematical, clean, high key",
    "seguranca": "vigilant, armored, red-alert intensity",
    "lifelog": "reflective, clear, bright, high key",
    "estudos": "clear, scholarly, bright, high key",
    "yurumi": "cerrado, wonder, exploration, pixel art charm, Brazilian adventure",
    "descobertas": "curious, bright, clear discovery, high key",
}

COMPOSITIONS = [
    "Wide cinematic shot, deep depth of field, environmental scale",
    "Close-up macro composition, shallow depth of field, abstract details",
    "Diagonal dynamic angle, motion blur, action perspective",
    "Overhead flat lay, geometric arrangement, top-down view",
    "Low-angle heroic perspective, dramatic lighting, towering elements",
    "Dutch angle tilt, asymmetric balance, tension in framing",
]


def build_prompt(slug, project, title):
    style = PROJECT_STYLES.get(project, PROJECT_STYLES["descobertas"])
    title_context = ""
    if title:
        clean = title.strip('"').strip("'")
        words = [w for w in clean.lower().split() if len(w) > 3 and w not in
                 ("com", "que", "dos", "das", "para", "como", "mais", "pelo", "pela",
                  "and", "the", "for", "with", "from", "that", "this", "was", "were")][:8]
        if words:
            title_context = f"Visual metaphor for: {' '.join(words)}. "
    # hash() do Python e' randomizado por processo (PYTHONHASHSEED aleatorio):
    # a mesma slug escolhia composicao DIFERENTE a cada execucao, entao regerar
    # uma capa nunca devolvia a mesma imagem. sha1 e' estavel entre maquinas e
    # rodadas — determinismo e' requisito do repo (capas versionadas no git).
    comp_idx = int(hashlib.sha1(slug.encode("utf-8")).hexdigest()[:8], 16) % len(COMPOSITIONS)
    composition = COMPOSITIONS[comp_idx]
    mood = PROJECT_MOODS.get(project, "atmospheric, immersive, cinematic")
    return (
        f"Digital artwork. {title_context}"
        f"{style['prompt_suffix']}. {composition}. "
        f"Mood: {mood}. "
        f"Color palette: {', '.join(style['colors'])}. "
        f"No UI elements, no watermark, no raw text overlays."
    )


def _compose_21x9(path, w=2100, h=900):
    """Reenquadra a arte do Worker (quadrada) para o padrao 21:9 do acervo.

    Mesma composicao do normalizar-capas-21x9.py: arte inteira ao centro,
    fundo dela mesma ampliada + desfocada + escurecida, e mistura suave nas
    bordas laterais para o quadrado nao aparecer com aresta dura. Reimplementado
    aqui (e nao importado) porque aquele script e' CLI de varredura com
    efeitos colaterais; aqui so precisamos do recorte de uma capa recem-baixada.
    """
    try:
        from PIL import Image, ImageEnhance, ImageFilter
    except ImportError:
        print("  AVISO: PIL ausente, capa fica quadrada")
        return False
    try:
        art = Image.open(path).convert("RGB")
    except Exception as exc:
        print(f"  AVISO: nao abriu a capa para recorte 21:9 ({type(exc).__name__})")
        return False
    if abs(art.width / art.height - w / h) < 0.05:
        return True  # ja esta no padrao

    bg = art.copy()
    s = max(w / bg.width, h / bg.height)
    bg = bg.resize((max(1, int(bg.width * s)), max(1, int(bg.height * s))), Image.LANCZOS)
    left = (bg.width - w) // 2
    top = (bg.height - h) // 2
    bg = bg.crop((left, top, left + w, top + h))
    bg = bg.filter(ImageFilter.GaussianBlur(radius=38))
    bg = ImageEnhance.Brightness(bg).enhance(0.42)
    bg = ImageEnhance.Color(bg).enhance(1.15)

    s2 = h / art.height
    fg = art.resize((max(1, int(art.width * s2)), h), Image.LANCZOS)
    if fg.width > w:
        fg = fg.resize((w, max(1, int(fg.height * (w / fg.width)))), Image.LANCZOS)

    feather = max(24, int(fg.width * 0.10))
    mask = Image.new("L", (fg.width, h), 255)
    px = mask.load()
    for x in range(feather):
        v = int(255 * (x / feather))
        for y in range(h):
            px[x, y] = v
            px[fg.width - 1 - x, y] = v

    bg.paste(fg, ((w - fg.width) // 2, (h - fg.height) // 2), mask)
    bg.save(path, "WEBP", quality=92, method=6)
    print(f"  recorte 21:9 aplicado: {w}x{h}")
    return True


def normalize_to_webp(path):
    """Garante WEBP real no path: o Worker as vezes devolve JPEG cru.

    JPEG salvo com extensao .webp passa no browser (sniffing), mas confunde
    o watchdog de capas, que trata 'nao e webp real' como suspeita.
    """
    try:
        with open(path, "rb") as f:
            head = f.read(12)
    except OSError:
        return False
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return True
    if not shutil.which("ffmpeg"):
        print("  AVISO: arquivo nao e WEBP real e ffmpeg esta ausente")
        return False
    tmp = path + ".tmp.webp"
    origem_bytes = os.path.getsize(path)
    # Fonte JPEG comprime MUITO melhor que PNG/WebP num reencode WebP de
    # qualidade 92 — medido 11/11/2026: Worker devolveu JPEG 1024x1024 de
    # 336.169 bytes e o WebP saiu 70.934 (21%). O limite unico de 35%,
    # calibrado so para PNG, recusava esse reencode LEGITIMO e deixava um
    # JPEG com extensao .webp no repo (o normalizar-capas-21x9 entao
    # registrava a capa no baseline de "legado fora de 21/9" porque nao
    # conseguia nem abrir direito). Limite agora depende do formato de
    # origem; a checagem de dimensao abaixo e' a prova real de integridade.
    eh_jpeg = head[:2] == b"\xff\xd8"
    piso = 0.10 if eh_jpeg else 0.35
    # libwebp NAO usa -q:v (qscale do encoder de video): no libwebp a opcao de
    # qualidade e' -quality (0-100). Com -q:v 90 o resultado saiu 8 KB a partir
    # de uma arte de 135 KB — reencode destrutivo que depois fazia o
    # normalizar-capas-21x9.py classificar a capa como "arte fraca" (heuristica
    # de tamanho) e trocar a arte AI por um desenho PIL.
    rc = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", path,
         "-c:v", "libwebp", "-quality", "92", "-compression_level", "4", tmp]
    ).returncode
    if rc != 0 or not os.path.exists(tmp):
        print("  AVISO: reencode WEBP falhou, mantendo o original")
        return False
    novo_bytes = os.path.getsize(tmp)
    if origem_bytes and novo_bytes < origem_bytes * piso:
        print(f"  AVISO: reencode suspeito ({origem_bytes} -> {novo_bytes} bytes, "
              f"piso {piso:.0%} p/ {'JPEG' if eh_jpeg else 'PNG/WebP'}), mantendo original")
        os.unlink(tmp)
        return False
    os.replace(tmp, path)
    print(f"  reencode WEBP real: {novo_bytes} bytes")
    return True


def generate(slug, force=True):
    project, title = read_meta(slug)
    api_key = load_api_key()
    if not api_key:
        print(f"[{slug}] SEM LIFELOG_COVER_API_KEY")
        return False
    worker_url = load_worker_url()
    if not worker_url:
        print(f"[{slug}] SEM LIFELOG_COVER_WORKER_URL")
        return False
    os.makedirs(COVERS_DIR, exist_ok=True)
    output_path = os.path.join(COVERS_DIR, f"{slug}.webp")
    prompt = build_prompt(slug, project, title)
    print(f"\n=== {slug} ({project}) ===")
    print(f"PROMPT: {prompt[:200]}...")
    data = json.dumps({"prompt": prompt}).encode("utf-8")
    req = urllib.request.Request(
            worker_url, data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}",
                 "User-Agent": "LifeLog-Cover-Generator/1.0"},
    )
    # Guarda de esquema (B310): so http/https entram no urlopen.
    if urllib.parse.urlparse(worker_url).scheme not in ("http", "https"):
        print(f"[{slug}] ESQUEMA NAO PERMITIDO em worker_url: {worker_url!r}")
        return False
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:  # nosec B310 - esquema validado acima

                img = resp.read()
                with open(output_path, "wb") as f:
                    f.write(img)
                normalize_to_webp(output_path)
                # Padrao do acervo e 21:9 (2100x900); o Worker entrega quadrado.
                # Sem isto a capa nova vai quadrada e o gate de aspect do build
                # a registra no baseline de "legado fora de 21/9" (aconteceu
                # 11/11/2026: capa AI virou excecao permanente do baseline).
                _compose_21x9(output_path)
                print(f"OK {slug} ({len(img)} bytes)")
                return True
        except urllib.error.HTTPError as e:
            print(f"HTTP {e.code}: {e.reason}")
            if e.code == 429:
                time.sleep(5)
                continue
            return False
        except Exception as e:
            print(f"ERRO: {e}")
            time.sleep(5)
    return False


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        slugs = args
    else:
        slugs = [
            "a-historia-do-seguranca",
            "a-historia-do-estudos",
            "lifelog-a-saga-da-animacao-de-tema-o-desfecho",
            "dogwalk-o-backup-que-mentia",
        ]
    ok = 0
    for s in slugs:
        if generate(s):
            ok += 1
    print(f"\n{ok}/{len(slugs)} capas geradas")
