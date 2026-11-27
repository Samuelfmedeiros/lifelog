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

import cover_brief  # noqa: F401  (modulo carregado cedo, ver build_prompt)
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


from cover_brief import build_prompt, read_brief
import cover_gate



def _compose_21x9(path, w=2100, h=900):
    """Reenquadra a arte do Worker (quadrada) para o padrao 21:9 do acervo.

    CROP FILL: escala a arte para COBRIR 2100x900 e corta o excedente vertical
    no centro. A arte preenche o quadro inteiro.

    Histórico: a versão anterior fazia letterbox (arte quadrada inteira ao
    centro, fundo blur nas laterais). Samuel reprovou em 15/11/2026 — "capa tá
    no formato errado": sobravam duas faixas borradas de ~600px e o assunto
    ficava pequeno no meio. Capa de LifeLog é arte cheia, sem barra.
    """
    try:
        from PIL import Image
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

    scale = max(w / art.width, h / art.height)
    nw, nh = max(w, int(round(art.width * scale))), max(h, int(round(art.height * scale)))
    art = art.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    art = art.crop((left, top, left + w, top + h))
    art.save(path, "WEBP", quality=92, method=6)
    print(f"  crop fill 21:9 aplicado: {w}x{h} (escala {scale:.2f})")
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
    brief = read_brief(slug)
    project = brief["project"]
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
    prompt = build_prompt(slug, brief=brief)
    print(f"\n=== {slug} ({project}) ===")
    print(f"PROMPT: {prompt[:200]}...")
    data = json.dumps({"prompt": prompt}).encode("utf-8")
    # Guarda de esquema (B310): so http/https entram no urlopen.
    if urllib.parse.urlparse(worker_url).scheme not in ("http", "https"):
        print(f"[{slug}] ESQUEMA NAO PERMITIDO em worker_url: {worker_url!r}")
        return False
    # Worker FLUX nao e' determinístico (seed ignorado). Tentar ate TRIES
    # variantes e so' salvar a que passar no gate de pixels. Nunca salvar
    # "a melhor das ruins" — isso era o que deixava capa branca/escura no ar.
    melhor = None
    for tentativa in range(cover_gate.TRIES):
        img = None
        for attempt in range(3):
            req = urllib.request.Request(
                worker_url, data=data,
                headers={"Content-Type": "application/json",
                         "Authorization": f"Bearer {api_key}",
                         "User-Agent": "LifeLog-Cover-Generator/1.0"})
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:  # nosec B310 - esquema validado acima
                    img = resp.read()
                break
            except urllib.error.HTTPError as e:
                print(f"HTTP {e.code}: {e.reason}")
                # 500 do Worker e' transiente (medido 02/09 e 27/11); so'
                # 429 e 5xx merecem retry — 401/403/404 sao definitivos.
                if e.code == 429 or 500 <= e.code < 600:
                    time.sleep(5)
                    continue
                break
            except Exception as e:
                print(f"ERRO: {e}")
                time.sleep(5)
        if not img:
            continue
        tmp = output_path + f".try{tentativa}.tmp"
        try:
            with open(tmp, "wb") as f:
                f.write(img)
            normalize_to_webp(tmp)
            # Padrao do acervo e 21:9 (2100x900); o Worker entrega quadrado.
            # Sem isto a capa nova vai quadrada e o gate de aspect do build
            # a registra no baseline de "legado fora de 21/9" (aconteceu
            # 11/11/2026: capa AI virou excecao permanente do baseline).
            _compose_21x9(tmp)
            m = cover_gate.medir(tmp)
            print(f"  variante {tentativa+1}/{cover_gate.TRIES}: "
                  f"{cover_gate.motivo_reprovacao(m)}")
            if cover_gate.passa(m):
                os.replace(tmp, output_path)
                print(f"OK {slug} ({os.path.getsize(output_path)} bytes)")
                return True
            if melhor is None or cover_gate.score(m) < cover_gate.score(melhor[1]):
                melhor = (tmp, m)
        except Exception as e:
            print(f"  AVISO: falha ao processar variante ({type(e).__name__}: {e})")
            if os.path.exists(tmp):
                os.unlink(tmp)
    if melhor:
        tmp, m = melhor
        print(f"REPROVADA {slug}: nenhuma das {cover_gate.TRIES} variantes passou "
              f"no gate ({cover_gate.motivo_reprovacao(m)}); capa NAO salva")
        if os.path.exists(tmp):
            os.unlink(tmp)
    return False


if __name__ == "__main__":
    # --help/-h NAO pode gerar capa: sem este guard o script caia na lista
    # default e sobrescrevia 4 capas versionadas do acervo (medido 22/11/2026:
    # rodar "--help" reescreveu a-historia-do-estudos, a-historia-do-seguranca,
    # dogwalk-o-backup-que-mentia e lifelog-a-saga-da-animacao-de-tema).
    if any(a in ("-h", "--help") for a in sys.argv[1:]):
        print("uso: python3 scripts/regen-covers-ai.py <slug> [<slug> ...]")
        print("     (sem argumentos regenera as capas de referencia listadas abaixo)")
        print("     slugs default:", ", ".join([
            "a-historia-do-seguranca",
            "a-historia-do-estudos",
            "lifelog-a-saga-da-animacao-de-tema-o-desfecho",
            "dogwalk-o-backup-que-mentia",
        ]))
        sys.exit(0)
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
