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

LIFELOG_DIR = os.path.expanduser("~/lifelog")
POSTS_DIR = os.path.join(LIFELOG_DIR, "src/content/posts")
COVERS_DIR = os.path.join(LIFELOG_DIR, "public/covers")
WORKER_URL = "https://lifelog-capa.samuelandrademedeiros.workers.dev"
API_KEY = "lifelog_capa_2026"

# Project styles for prompts
PROJECT_STYLES = {
    "arachne": {
        "prompt_suffix": "Cyberpunk theme, deep purple and violet neon, digital spiderweb patterns, dark moody atmosphere, 16:9 wallpaper",
        "colors": ["#7c3aed", "#a78bfa", "#2d1b69"],
    },
    "dogwalk": {
        "prompt_suffix": "Nature-tech theme, vibrant green and emerald, organic shapes with digital overlay, forest meets technology, 16:9 wallpaper",
        "colors": ["#22c55e", "#84cc16", "#166534"],
    },
    "portfolio": {
        "prompt_suffix": "Sci-fi HUD theme, cyan and electric blue, holographic grid overlays, futuristic interface aesthetic, 16:9 wallpaper",
        "colors": ["#00d4ff", "#22d3ee", "#0c4a6e"],
    },
    "capivara": {
        "prompt_suffix": "Tropical tech theme, warm amber and orange, sunset gradients with digital accents, Brazilian vibes, 16:9 wallpaper",
        "colors": ["#f59e0b", "#fbbf24", "#78350f"],
    },
    "estudos": {
        "prompt_suffix": "Academic blueprint theme, deep blue and cyan, technical drawing aesthetic, clean scholarly atmosphere, 16:9 wallpaper",
        "colors": ["#3b82f6", "#60a5fa", "#1e3a5f"],
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


def generate_cover(slug, project="descobertas"):
    """Generate cover image via Cloudflare Worker."""
    os.makedirs(COVERS_DIR, exist_ok=True)
    output_path = os.path.join(COVERS_DIR, f"{slug}.webp")

    if os.path.exists(output_path):
        log(f"Capa já existe: {slug}.webp")
        return True

    style = PROJECT_STYLES.get(project, PROJECT_STYLES["descobertas"])
    prompt = (
        f"Digital artwork in {project} theme. "
        f"{style['prompt_suffix']}. "
        f"Mood: technological, immersive, atmospheric. "
        f"Color palette: {', '.join(style['colors'])}. "
        f"No text, no typography, no letters, no UI elements."
    )

    log(f"Gerando capa para '{slug}' (projeto: {project})...")
    log(f"Prompt: {prompt[:100]}...")

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
