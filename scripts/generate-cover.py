#!/usr/bin/env python3
"""
LifeLog — Geração de Capas AI via Cloudflare Worker (FLUX.1 Schnell)

Uso:
  python3 generate_cover.py <slug>           # Gera capa para um post
  python3 generate_cover.py --list-missing   # Lista posts sem capa
  python3 generate_cover.py --all            # Gera capas para todos sem capa
"""

import json
import os
import sys
import re
import urllib.request
import urllib.error
from pathlib import Path

LIFELOG_DIR = os.path.expanduser("~/projetos/lifelog")
POSTS_DIR = os.path.join(LIFELOG_DIR, "src/content/posts")
COVERS_DIR = os.path.join(LIFELOG_DIR, "public/covers")
WORKER_URL = os.environ.get("LIFELOG_COVER_WORKER_URL", "")
if not WORKER_URL:
    try:
        for line in open(os.path.join(os.path.dirname(__file__), "..", ".env"), encoding="utf-8"):
            line = line.strip()
            if line.startswith("LIFELOG_COVER_WORKER_URL="):
                WORKER_URL = line.split("=", 1)[1].strip().strip('"')
                break
    except FileNotFoundError:
        pass
API_KEY = os.environ.get("LIFELOG_COVER_API_KEY")
if not API_KEY:
    # Fallback: load from .env file
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k == "LIFELOG_COVER_API_KEY":
                        API_KEY = v
                        break
if not API_KEY:
    API_KEY = "dev-capa-key"

# Project styles for prompts
PROJECT_STYLES = {
    "arachne": {
        "prompt_suffix": "Cyberpunk theme, deep purple and violet neon, digital spiderweb patterns, dark moody atmosphere, 16:9 wallpaper",
        "colors": ["#7c3aed", "#a78bfa", "#2d1b69"],
    },
    "dogwalk": {
        "prompt_suffix": "Modern SaaS dashboard theme, deep indigo and violet with warm amber accents, clean geometric shapes, connected network nodes suggesting a service platform, premium tech aesthetic, 16:9 wallpaper",
        "colors": ["#7c3aed", "#f59e0b", "#1e1b4b"],
    },
    "portfolio": {
        "prompt_suffix": "Sci-fi HUD theme, cyan and electric blue, holographic grid overlays, futuristic interface aesthetic, 16:9 wallpaper",
        "colors": ["#00d4ff", "#22d3ee", "#0c4a6e"],
    },
    "capivara": {
        "prompt_suffix": "Tropical tech theme, warm amber and orange, sunset gradients with digital accents, Brazilian vibes, 16:9 wallpaper",
        "colors": ["#f59e0b", "#fbbf24", "#78350f"],
    },
    "tatuengine": {
        "prompt_suffix": "Wave physics theme, teal and turquoise, sine wave interference patterns, fluid dynamics visualization, abstract neural wavefields, 16:9 wallpaper",
        "colors": ["#14b8a6", "#2dd4bf", "#0f766e"],
    },
    "seguranca": {
        "prompt_suffix": "Security theme, deep red and crimson, shield patterns, matrix digital rain aesthetic, dark cybersecurity vibe, 16:9 wallpaper",
        "colors": ["#ef4444", "#dc2626", "#450a0a"],
    },
    "lifelog": {
        "prompt_suffix": "Journal theme, purple and magenta, abstract writing patterns, notebook aesthetic, creative tech vibe, 16:9 wallpaper",
        "colors": ["#a855f7", "#c084fc", "#3b0764"],
    },
    "estudos": {
        "prompt_suffix": "Academic blueprint theme, deep blue and cyan, technical drawing aesthetic, clean scholarly atmosphere, 16:9 wallpaper",
        "colors": ["#3b82f6", "#60a5fa", "#1e3a5f"],
    },
    "yurumi": {
        "prompt_suffix": "Pixel art adventure scene. Anthropomorphic giant anteater (tamanduá-bandeira) character with long tubular snout, small ears, huge bushy tail, black-and-white diagonal band across the shoulders, wearing green military-style jacket, cargo pants and large backpack, standing on a dirt path in the cerrado of Brasília, Brazil. Typical cerrado landscape: twisted trees (pequi, ipê), dry golden grasses, red earth, low shrubs. Cosmic night sky with planets, Saturn rings, nebulae, aurora borealis in the background. Camping gear (lantern, stove) nearby. Warm tan and deep navy palette. Sense of wonder and exploration. 16:9 wallpaper",
        "colors": ["#b98a5e", "#22d3ee", "#0b1424"],
    },
    "descobertas": {
        "prompt_suffix": "Ethereal discovery theme, soft blue and violet, dreamy atmosphere with light particles, sense of wonder, 16:9 wallpaper",
        "colors": ["#38bdf8", "#818cf8", "#1e1b4b"],
    },
}


def log(msg):
    print(f"[covers] {msg}")


def parse_frontmatter(content):
    """Extract frontmatter fields from MDX."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        return {}
    fm = match.group(1)
    fields = {}
    for line in fm.split("\n"):
        if ":" in line:
            key, _, val = line.partition(":")
            fields[key.strip()] = val.strip().strip('"').strip("'")
    return fields


def find_posts_without_cover():
    """List posts that don't have a cover image."""
    missing = []
    for fname in sorted(os.listdir(POSTS_DIR)):
        if not fname.endswith(".mdx"):
            continue
        slug = fname.replace(".mdx", "")
        cover_path = os.path.join(COVERS_DIR, f"{slug}.webp")
        if os.path.exists(cover_path):
            continue
        
        with open(os.path.join(POSTS_DIR, fname)) as f:
            content = f.read()
        fm = parse_frontmatter(content)
        missing.append({
            "slug": slug,
            "title": fm.get("title", slug),
            "project": fm.get("project", "descobertas"),
        })
    return missing


def _extract_title_from_mdx(slug):
    """Try to read the post title from its MDX frontmatter."""
    mdx_path = os.path.join(POSTS_DIR, f"{slug}.mdx")
    if not os.path.exists(mdx_path):
        return None
    with open(mdx_path) as f:
        fm = parse_frontmatter(f.read())
    return fm.get("title", None)


def generate_cover(slug, project="descobertas", title=None, force=False):
    """Generate cover image via Cloudflare Worker."""
    os.makedirs(COVERS_DIR, exist_ok=True)
    output_path = os.path.join(COVERS_DIR, f"{slug}.webp")

    if os.path.exists(output_path) and not force:
        log(f"Capa já existe: {slug}.webp")
        return True

    # Auto-detect title from MDX if not provided
    if not title:
        title = _extract_title_from_mdx(slug)

    style = PROJECT_STYLES.get(project, PROJECT_STYLES["descobertas"])

    # --- Build title-based visual context ---
    title_context = ""
    if title:
        clean = title.strip('"').strip("'")
        # Extract 6-8 meaningful keywords as visual direction
        words = [w for w in clean.lower().split() if len(w) > 3 and w not in
                 ("com", "que", "dos", "das", "para", "como", "mais", "pelo", "pela",
                  "and", "the", "for", "with", "from", "that", "this", "was", "were")][:8]
        if words:
            title_context = f"Visual metaphor for: {' '.join(words)}. "

    # --- Composition variety (deterministic per slug, cycles through 6 styles) ---
    compositions = [
        "Wide cinematic shot, deep depth of field, environmental scale",
        "Close-up macro composition, shallow depth of field, abstract details",
        "Diagonal dynamic angle, motion blur, action perspective",
        "Overhead flat lay, geometric arrangement, top-down view",
        "Low-angle heroic perspective, dramatic lighting, towering elements",
        "Dutch angle tilt, asymmetric balance, tension in framing",
    ]
    comp_idx = hash(slug) % len(compositions)
    composition = compositions[comp_idx]

    # --- Project-specific moods ---
    project_moods = {
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
    mood = project_moods.get(project, "atmospheric, immersive, cinematic")

    prompt = (
        f"Digital artwork. "
        f"{title_context}"
        f"{style['prompt_suffix']}. "
        f"{composition}. "
        f"Mood: {mood}. "
        f"Color palette: {', '.join(style['colors'])}. "
        f"No UI elements, no watermark, no raw text overlays."
    )

    log(f"Gerando capa para '{slug}' (projeto: {project})...")
    log(f"Prompt: {prompt[:150]}...")

    import base64  # noqa: F811

    data = json.dumps({"prompt": prompt}).encode("utf-8")
    req = urllib.request.Request(
        WORKER_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
            "User-Agent": "LifeLog-Cover-Generator/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            image_data = resp.read()
            with open(output_path, "wb") as f:
                f.write(image_data)
            log(f"✅ Capa salva: {output_path} ({len(image_data)} bytes)")
            return True
    except urllib.error.HTTPError as e:
        log(f"❌ HTTP {e.code}: {e.reason}")
        return False
    except urllib.error.URLError as e:
        log(f"❌ URL Error: {e.reason}")
        return False
    except Exception as e:
        log(f"❌ Erro: {e}")
        return False


def main():
    if "--list-missing" in sys.argv:
        missing = find_posts_without_cover()
        if not missing:
            print("✅ Todos os posts têm capa!")
        else:
            print(f"📋 Posts sem capa ({len(missing)}):")
            for p in missing:
                print(f"  {p['slug']} ({p['project']})")
        return

    if "--all" in sys.argv:
        force = "--force" in sys.argv
        if force:
            # List ALL posts (not just missing ones)
            all_posts = []
            for fname in sorted(os.listdir(POSTS_DIR)):
                if not fname.endswith(".mdx"):
                    continue
                slug = fname.replace(".mdx", "")
                with open(os.path.join(POSTS_DIR, fname)) as f:
                    fm = parse_frontmatter(f.read())
                all_posts.append({
                    "slug": slug,
                    "title": fm.get("title", slug),
                    "project": fm.get("project", "descobertas"),
                })
            print(f"🔄 Regenerando TODAS as {len(all_posts)} capas (--force)...")
            for p in all_posts:
                generate_cover(p["slug"], p["project"], force=True)
            return
        
        missing = find_posts_without_cover()
        if not missing:
            print("✅ Todos os posts têm capa!")
            return
        print(f"🔄 Gerando capas para {len(missing)} posts...")
        for p in missing:
            generate_cover(p["slug"], p["project"])
        return

    if len(sys.argv) < 2:
        print(__doc__)
        return

    slug = sys.argv[1]
    # Try to detect project from frontmatter
    project = "descobertas"
    mdx_path = os.path.join(POSTS_DIR, f"{slug}.mdx")
    draft_path = os.path.join(LIFELOG_DIR, "src/content/drafts", f"{slug}.mdx")
    
    for path in [mdx_path, draft_path]:
        if os.path.exists(path):
            with open(path) as f:
                content = f.read()
            fm = parse_frontmatter(content)
            project = fm.get("project", project)
            break

    generate_cover(slug, project)


if __name__ == "__main__":
    main()
