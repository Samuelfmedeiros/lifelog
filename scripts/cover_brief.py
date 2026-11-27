#!/usr/bin/env python3
"""Fonte única de verdade para prompts de capa do LifeLog (27/11/2026).

Antes, `PROJECT_STYLES` vivia duplicado em `regen-covers-ai.py` e
`generate-cover.py` (com valores divergentes), e os prompts usavam UMA cena
fixa por projeto — todos os posts do mesmo projeto saíam parecidos. Aqui o
assunto do post entra de verdade:

    cena do motivo (tags) + tese (title/description) + cor do projeto

O mapa `TAG_MOTIF` e o `read_brief()` vêm de `gerar-capas-21x9.py` (09/11),
onde já estavam validados no gerador vetorial. Nada de ícone fixo de projeto:
a identidade do projeto fica na paleta, não na forma.

Determinismo: sha1 do slug escolhe a variação DENTRO do motivo, para dois posts
do mesmo assunto não saírem idênticos sem virar sorteio por processo.
"""
import hashlib
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
LIFELOG_DIR = os.path.join(HERE, "..")
POST_DIRS = ("src/content/posts", "src/content/posts/en")

DEFAULT_PROJECT = "lifelog"

# Paletas do gerador vetorial (medidas em design-system.css/themes.css e nas
# capas 2100x900 do acervo). Mantidas idênticas para os dois geradores não
# divergirem de cor.
PALETTE = {
    "lifelog":     dict(base=(19, 9, 30),  accent=(168, 85, 247),  glow=(205, 156, 252), ink=(245, 242, 247)),  # #a855f7
    "yurumi":      dict(base=(24, 19, 14), accent=(185, 138, 94),  glow=(225, 203, 183), ink=(246, 245, 244)),  # #b98a5e
    "arachne":     dict(base=(17, 9, 29),  accent=(124, 58, 237),  glow=(192, 159, 249), ink=(244, 242, 247)),  # #7c3aed
    "tatuengine":  dict(base=(10, 29, 27), accent=(20, 184, 166),  glow=(161, 247, 238), ink=(243, 247, 247)),  # #14b8a6
    "descobertas": dict(base=(9, 23, 30),  accent=(56, 189, 248),  glow=(156, 223, 252), ink=(242, 246, 247)),  # #38bdf8
    "dogwalk":     dict(base=(11, 27, 17), accent=(34, 197, 94),   glow=(166, 242, 194), ink=(243, 247, 244)),  # #22c55e
    "capivara":    dict(base=(30, 22, 9),  accent=(245, 158, 11),  glow=(252, 216, 156), ink=(247, 245, 242)),  # #f59e0b
    "seguranca":   dict(base=(29, 9, 9),   accent=(239, 68, 68),   glow=(249, 159, 159), ink=(247, 242, 242)),  # #ef4444
    "portfolio":   dict(base=(9, 26, 30),  accent=(0, 212, 255),   glow=(156, 236, 252), ink=(242, 247, 248)),  # #00d4ff
    "estudos":     dict(base=(9, 17, 30),  accent=(59, 130, 246),  glow=(156, 192, 252), ink=(242, 244, 247)),  # #3b82f6
}
PAL_FALLBACK = dict(base=(20, 22, 28), accent=(148, 163, 184), glow=(203, 213, 225), ink=(241, 245, 249))

# Cores/clima do projeto — a identidade agora e' ANCORA DE COR, nao a forma.
# 27/11: yurumi trocou #0b1424 (escuro) por #fde68a para nao brigar com o
# guardrail "no dark areas" (causa conhecida de capa escura em 31/08).
PROJECT_STYLES = {
    "arachne":     dict(colors=["#6d28d9", "#a78bfa", "#fde68a"], mood="mysterious, interconnected data"),
    "dogwalk":     dict(colors=["#6d28d9", "#f59e0b", "#fde68a"], mood="clean, modern, premium SaaS"),
    "portfolio":   dict(colors=["#0ea5e9", "#0369a1", "#bae6fd"], mood="futuristic, polished, luminous"),
    "capivara":    dict(colors=["#f59e0b", "#fb923c", "#fde68a"], mood="warm, tropical, attentive"),
    "tatuengine":  dict(colors=["#0f766e", "#2dd4bf", "#fde68a"], mood="flowing, mathematical, clean"),
    "seguranca":   dict(colors=["#ef4444", "#fca5a5", "#fde68a"], mood="vigilant, armored, alert"),
    "lifelog":     dict(colors=["#6d28d9", "#a855f7", "#fde68a"], mood="reflective, clear, bright"),
    "estudos":     dict(colors=["#1d4ed8", "#38bdf8", "#fde68a"], mood="clear, scholarly, bright"),
    "yurumi":      dict(colors=["#b98a5e", "#22d3ee", "#fde68a"], mood="wonder, exploration, bright rainforest"),
    "descobertas": dict(colors=["#1d4ed8", "#38bdf8", "#fde68a"], mood="curious, bright, clear discovery"),
}
FALLBACK_STYLE = dict(colors=["#1d4ed8", "#38bdf8", "#fde68a"], mood="bright, clear, curious")

# Motivo -> cena DESCRITIVA (antes o motivo só escolhia uma função de desenho).
MOTIF_SCENE = {
    "alvo":     "concentric rings with one precise marker at the center, measurement and verdict",
    "escudo":   "a closed protective form wrapping a luminous core, with one visible gap or open latch at its edge",
    "ruptura":  "a continuous line that breaks at one point and resumes, the break itself illuminated",
    "fluxo":    "a chain of clean connected stages carrying a signal forward, one stage visibly changing or disengaging",
    "pulso":    "a steady time-series line against a threshold, with a marker placed on the healthy part of the line",
    "rede":     "a connected network of nodes, some paths bright and active, others dim or absent",
    "camadas":  "stacked layers of a polished surface, with a signal crossing them or narrowing through a tight funnel",
    "orbita":   "an abstract arrangement of orbiting shapes, balanced and luminous",
}
MOTIF_DESC = {
    "alvo": "medicao/veredito: aneis + marcador no centro",
    "escudo": "defesa: forma fechada em volta de nucleo",
    "ruptura": "falha/causa: linha que quebra e retoma",
    "fluxo": "entrega: etapas encadeadas",
    "pulso": "vigia/estado: serie no tempo contra limiar",
    "rede": "conhecimento: nos conectados",
    "camadas": "construcao: camadas empilhadas",
    "orbita": "abstrato (sem tag mapeada)",
}

# Mapa de assunto -> motivo (copiado de gerar-capas-21x9.py, 09/11/2026).
# Tags de PROJETO ficam de fora: eram a causa de todo post do mesmo projeto
# sair com a mesma cara.
TAG_MOTIF = {
    "testing": "alvo", "pytest": "alvo", "quality-gate": "alvo",
    "e2e": "alvo", "vrt": "alvo", "qa": "alvo", "benchmark": "alvo",
    "metrics": "alvo", "eval": "alvo", "medicao": "alvo",
    "security": "escudo", "seguranca": "escudo", "auth": "escudo",
    "lgpd": "escudo", "secrets": "escudo", "gitleaks": "escudo",
    "debugging": "ruptura", "bug": "ruptura", "incident": "ruptura",
    "postmortem": "ruptura", "lessons": "ruptura", "regression": "ruptura",
    "ci-cd": "fluxo", "deploy": "fluxo", "pipeline": "fluxo",
    "github-actions": "fluxo", "vercel": "fluxo", "automation": "fluxo",
    "monitoring": "pulso", "observability": "pulso", "watchdog": "pulso",
    "reliability": "pulso", "performance": "pulso",
    "rag": "rede", "memory": "rede", "search": "rede", "embeddings": "rede",
    "retrieval": "rede", "vector": "rede",
    "refactoring": "camadas", "architecture": "camadas", "frontend": "camadas",
    "react": "camadas", "nextjs": "camadas", "design-system": "camadas",
    "python": "camadas", "fastapi": "camadas", "typescript": "camadas",
    "ssm": "camadas", "mamba": "camadas", "bitmamba": "camadas",
    "pytorch": "camadas", "training": "camadas", "sft": "camadas",
    "fine-tuning": "camadas", "ternary": "camadas", "model": "camadas",
    "wave-field": "camadas", "wave-field-theory": "camadas", "fase4": "camadas",
    "cuda": "alvo", "gpu": "alvo", "vram": "alvo", "quantization": "alvo",
    "validation": "alvo", "metric": "alvo", "evaluation": "alvo",
    "accessibility": "camadas", "wcag": "camadas", "a11y": "camadas",
    "axe-core": "camadas", "contrast": "camadas", "ui": "camadas",
    "ux": "camadas", "astro": "camadas", "css": "camadas", "design": "camadas",
    "documentation": "rede", "studies": "rede", "study": "rede",
    "learning": "rede", "knowledge": "rede", "scraping": "rede",
    "crawl4ai": "rede", "crawler": "rede", "agents": "rede",
    "ecosystem": "rede", "projects": "rede", "research": "rede",
    "infrastructure": "fluxo", "docker": "fluxo", "kubernetes": "fluxo",
    "cloudflare": "fluxo", "checkpoint": "fluxo", "backup": "fluxo",
    "update": "fluxo", "migration": "fluxo",
    "ollama": "pulso", "vlm": "pulso", "stability": "pulso",
    "stability-testing": "pulso", "bench": "pulso", "boot": "pulso",
    "tools": "fluxo", "dev": "fluxo", "productivity": "fluxo", "ops": "fluxo",
    "configuration": "fluxo", "networking": "fluxo", "wsl": "fluxo",
    "wslg": "fluxo", "hermes": "fluxo", "computer-use": "fluxo",
    "cua-driver": "fluxo", "state": "fluxo",
    "marketplace": "camadas", "showcase": "camadas", "gamification": "camadas",
    "games": "camadas", "improvement": "camadas", "beginning": "camadas",
    "pets": "camadas", "build": "camadas", "repo": "camadas",
    "git": "escudo", "privacy": "escudo",
}
TAGS_DE_PROJETO = {
    "yurumi", "arachne", "capivara", "dogwalk", "patapass", "portfolio",
    "portifolio", "lifelog", "tatuengine", "estudos", "seguranca",
    "descobertas", "forgetgate", "ecossistema",
}

# Variação leve de enquadramento DENTRO do motivo (3, não as 6 aleatórias
# antigas). sha1 e' estável entre processos, ao contrário de hash().
FRAMINGS = [
    "wide environmental view, subject filling most of the frame",
    "close detail of the same scene, shallow depth of field",
    "asymmetric angle, subject slightly off-center with breathing room",
]
# Detalhe DISTINCTO por slug, sorteado num slice diferente do hash — evita que
# dois posts do mesmo motivo e mesmo enquadramento caiam no prompt idêntico.
DETAILS = [
    "one strong diagonal highlight crossing the composition",
    "a cluster of small companion shapes near the main subject",
    "a subtle second echo of the main form behind it",
    "soft rays entering from one corner",
    "a thin contour trace around the main form",
    "a light gradient shifting from one edge",
    "one small element detached and floating apart",
    "a gentle repetition of the form at smaller scale",
]

# Guardrails que já funcionam — preservados integralmente.
GUARDRAILS = (
    "Light cream background, bright and luminous, high key lighting, "
    "decisive color contrast, absolutely no dark areas. "
    "No UI elements, no watermark, no raw text overlays, no letters. "
    "No characters, no people, no animals, no mascots, no anthropomorphic figures, "
    "absolutely no humans, no human silhouettes, no scale figures, no crowds. "
    "Centered composition: keep the subject inside the middle third of the frame, "
    "with breathing room above and below (the image is cropped to a wide 21:9 banner)."
)

_STOP = {
    "com", "que", "dos", "das", "para", "como", "mais", "pelo", "pela", "por",
    "uma", "uns", "uma", "nos", "nas", "the", "and", "for", "with", "from",
    "that", "this", "was", "were", "into", "seu", "sua", "sem", "sobre",
}


def read_brief(slug):
    """Le title/description/project/tags do post. PT primeiro, EN fallback.

    Nunca levanta: post sem frontmatter cai no default e o chamador avisa.
    """
    base = re.sub(r"-v\d+$", "", slug)
    for d in POST_DIRS:
        p = os.path.join(LIFELOG_DIR, d, base + ".mdx")
        if not os.path.exists(p):
            continue
        with open(p, encoding="utf-8", errors="ignore") as fh:
            t = fh.read()
        m = re.search(r"^---(.*?)^---", t, re.S | re.M)
        if not m:
            continue
        fm = m.group(1)

        def campo(nome):
            mm = re.search(r"^%s:\s*(.+)$" % nome, fm, re.M)
            return mm.group(1).strip().strip('"').strip("'") if mm else ""

        tags_raw = campo("tags")
        tags = [x.strip().strip('"').strip("'").lower()
                for x in tags_raw.strip("[]").split(",") if x.strip()]
        return {
            "slug": base,
            "title": campo("title"),
            "description": campo("description"),
            "project": campo("project") or DEFAULT_PROJECT,
            "tags": tags,
        }
    return {"slug": base, "title": "", "description": "",
            "project": DEFAULT_PROJECT, "tags": []}


def pick_motif(brief):
    """Primeira tag de ASSUNTO decide o motivo. Tag de projeto nao conta.

    Se so houver tags de projeto (ou nenhuma), cai em `orbita` — abstrato
    declarado, sem fingir que entendeu o assunto.
    """
    for t in brief["tags"]:
        if t in TAGS_DE_PROJETO:
            continue
        if t in TAG_MOTIF:
            return TAG_MOTIF[t], t
    return "orbita", ""


def _words(text, limit):
    tokens = re.findall(r"[A-Za-zÀ-ÿ0-9]+", text.lower())
    return [w for w in tokens if len(w) > 3 and w not in _STOP][:limit]


def build_thesis(brief):
    """Tese em nível de conceito — sem caminhos, nomes internos ou números."""
    title_words = _words(brief.get("title", ""), 10)
    desc_words = _words(brief.get("description", ""), 18)
    if not title_words and not desc_words:
        return ""
    parts = []
    if title_words:
        parts.append("post topic: %s" % " ".join(title_words))
    if desc_words:
        parts.append("what happened: %s" % " ".join(desc_words))
    return "Subject of the post — %s. " % "; ".join(parts)


def build_prompt(slug, project=None, title=None, brief=None):
    """Prompt completo: motivo + tese + paleta do projeto + guardrails.

    `brief` pode vir pronto de read_brief(); se ausente, e' lido do slug.
    `title` e' aceito por compatibilidade com chamadores antigos.
    """
    if brief is None:
        brief = read_brief(slug)
    project = project or brief["project"]
    if title and not brief.get("title"):
        brief = dict(brief, title=title)
    motivo, _tag = pick_motif(brief)
    style = PROJECT_STYLES.get(project, FALLBACK_STYLE)
    digest = hashlib.sha1(slug.encode("utf-8"), usedforsecurity=False).hexdigest()
    idx = int(digest[:8], 16) % len(FRAMINGS)
    detail = DETAILS[int(digest[8:16], 16) % len(DETAILS)]
    scene = MOTIF_SCENE[motivo]
    return (
        "Digital artwork. "
        "Scene: %s. " % scene
        + build_thesis(brief)
        + "%s. " % FRAMINGS[idx]
        + "Distinctive detail: %s. " % detail
        + "Mood: %s. " % style["mood"]
        + "Color palette: %s. " % ", ".join(style["colors"])
        + GUARDRAILS
    )
