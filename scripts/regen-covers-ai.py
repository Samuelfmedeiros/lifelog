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
import json
import os
import re
import sys
import time
import urllib.error
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
    "arachne": {"prompt_suffix": "Cyberpunk theme, deep purple and violet neon, digital spiderweb patterns, dark moody atmosphere, 16:9 wallpaper", "colors": ["#7c3aed", "#a78bfa", "#2d1b69"]},
    "dogwalk": {"prompt_suffix": "Modern SaaS dashboard theme, deep indigo and violet with warm amber accents, clean geometric shapes, connected network nodes suggesting a service platform, premium tech aesthetic, 16:9 wallpaper", "colors": ["#7c3aed", "#f59e0b", "#1e1b4b"]},
    "portfolio": {"prompt_suffix": "Sci-fi HUD theme, cyan and electric blue, holographic grid overlays, futuristic interface aesthetic, 16:9 wallpaper", "colors": ["#00d4ff", "#22d3ee", "#0c4a6e"]},
    "capivara": {"prompt_suffix": "Tropical tech theme, warm amber and orange, sunset gradients with digital accents, Brazilian vibes, 16:9 wallpaper", "colors": ["#f59e0b", "#fbbf24", "#78350f"]},
    "tatuengine": {"prompt_suffix": "Wave physics theme, teal and turquoise, sine wave interference patterns, fluid dynamics visualization, abstract neural wavefields, 16:9 wallpaper", "colors": ["#14b8a6", "#2dd4bf", "#0f766e"]},
    "seguranca": {"prompt_suffix": "Security theme, deep red and crimson, shield patterns, matrix digital rain aesthetic, dark cybersecurity vibe, 16:9 wallpaper", "colors": ["#ef4444", "#dc2626", "#450a0a"]},
    "lifelog": {"prompt_suffix": "Journal theme, purple and magenta, abstract writing patterns, notebook aesthetic, creative tech vibe, 16:9 wallpaper", "colors": ["#a855f7", "#c084fc", "#3b0764"]},
    "estudos": {"prompt_suffix": "Academic blueprint theme, deep blue and cyan, technical drawing aesthetic, clean scholarly atmosphere, 16:9 wallpaper", "colors": ["#3b82f6", "#60a5fa", "#1e3a5f"]},
    "yurumi": {"prompt_suffix": "Pixel art adventure scene. Anthropomorphic giant anteater (tamanduá-bandeira) character with long tubular snout, small ears, huge bushy tail, black-and-white diagonal band across the shoulders, wearing green military-style jacket, cargo pants and large backpack, standing on a dirt path in the cerrado of Brasília, Brazil. Typical cerrado landscape: twisted trees (pequi, ipê), dry golden grasses, red earth, low shrubs. Cosmic night sky with planets, Saturn rings, nebulae, aurora borealis in the background. Camping gear (lantern, stove) nearby. Purple, teal and deep navy palette. Sense of wonder and exploration. 16:9 wallpaper", "colors": ["#e05a3c", "#7c3aed", "#22d3ee", "#0b1424"]},
    "descobertas": {"prompt_suffix": "Ethereal discovery theme, soft blue and violet, dreamy atmosphere with light particles, sense of wonder, 16:9 wallpaper", "colors": ["#38bdf8", "#818cf8", "#1e1b4b"]},
}

PROJECT_MOODS = {
    "arachne": "mysterious, crawling, interconnected web of data",
    "dogwalk": "clean, modern, premium SaaS platform, no animals, no pets, abstract service-network aesthetic",
    "portfolio": "futuristic, polished, luminous interface",
    "capivara": "warm, tropical, sunset over digital landscape",
    "tatuengine": "flowing, mathematical, hypnotic wave patterns",
    "seguranca": "vigilant, armored, red-alert intensity",
    "lifelog": "reflective, layered, ink bleeding into circuits",
    "estudos": "structured, precise, blueprint aesthetic",
    "yurumi": "cerrado, wonder, exploration, pixel art charm, Brazilian adventure",
    "descobertas": "curious, expansive, light breaking through darkness",
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
    comp_idx = hash(slug) % len(COMPOSITIONS)
    composition = COMPOSITIONS[comp_idx]
    mood = PROJECT_MOODS.get(project, "atmospheric, immersive, cinematic")
    return (
        f"Digital artwork. {title_context}"
        f"{style['prompt_suffix']}. {composition}. "
        f"Mood: {mood}. "
        f"Color palette: {', '.join(style['colors'])}. "
        f"No UI elements, no watermark, no raw text overlays."
    )


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
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                img = resp.read()
                with open(output_path, "wb") as f:
                    f.write(img)
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
    if len(sys.argv) > 1:
        slugs = sys.argv[1:]
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
