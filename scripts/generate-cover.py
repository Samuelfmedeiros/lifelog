#!/usr/bin/env python3
"""
LifeLog — Geração de Capas AI via Cloudflare Worker (FLUX.1 Schnell)

Uso:
  python3 generate_cover.py <slug>           # Gera capa para um post
  python3 generate_cover.py --list-missing   # Lista posts sem capa
  python3 generate_cover.py --all            # Gera capas para todos sem capa
"""

import hashlib
import json
import os
import sys
import re
import urllib.request
import urllib.error
import urllib.parse

import cover_brief  # noqa: F401from pathlib import Path

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
    # Nunca inventar credencial: uma chave falsa so' troca "sem chave" por um
    # 401 indistinguível no Worker. Falhar com causa clara (medido 27/11/2026).
    API_KEY = None

from cover_brief import build_prompt, read_brief


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
    """Gera capa AI via Worker, com prompt contextual do post."""
    if not API_KEY:
        log("SEM LIFELOG_COVER_API_KEY — defina no .env do repo ou no ambiente")
        return False
    os.makedirs(COVERS_DIR, exist_ok=True)
    output_path = os.path.join(COVERS_DIR, f"{slug}.webp")

    if os.path.exists(output_path) and not force:
        log(f"Capa já existe: {slug}.webp")
        return True

    brief = read_brief(slug)
    project = project or brief["project"]
    prompt = build_prompt(slug, project, title, brief=brief)

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

    # Guarda de esquema: so http/https (B310 do bandit). Sem isto, uma URL vinda de
    # ambiente poderia pedir file:// ou esquema custom no urlopen.
    if urllib.parse.urlparse(WORKER_URL).scheme not in ("http", "https"):
        log(f"❌ Esquema nao permitido em LIFELOG_COVER_WORKER_URL: {WORKER_URL!r}")
        return False

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:  # nosec B310 - esquema validado acima

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
    if slug.startswith("-"):
        print("Uso: generate-cover.py <slug>  (slug sem flags; use --list-missing ou --all)")
        return
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
