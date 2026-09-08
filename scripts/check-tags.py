#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-tags.py — guardião do vocabulário de tags do LifeLog (Opção C).

FONTE DE VERDADE: src/lib/tag-vocab.ts (parseado aqui — lista NÃO duplicada).
Regra: slug canônico único por conceito, EN como língua franca técnica,
tag structural do projeto sempre presente, PT/EN com slugs idênticos.

Modos:
  (padrão)   reporta desvios
  --fix      corrige: canonicaliza (aliases), garante tag do projeto,
             unifica PT/EN (união, ordem PT primeiro), dedupe, single-line
  --strict   exit 1 se houver qualquer erro E* (uso no CI)
  --skip N   basename a pular (arquivo de outra sessão; repetível)

Erros (E) e warnings (W):
  E1 tag fora do vocab (após alias)          E4 tags multi-line (block YAML)
  E2 tag do projeto ausente                  E5 duplicata dentro do post
  E3 PT/EN divergentes                       E6 project fora do vocab
  W1 tag com 1 ocorrência global (ruído)     W2 post sem contraparte PT/EN
"""
import argparse
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path("/home/samuel/projetos/lifelog")
POSTS_PT = ROOT / "src" / "content" / "posts"
POSTS_EN = POSTS_PT / "en"
VOCAB_TS = ROOT / "src" / "lib" / "tag-vocab.ts"

# Posts em edição por outra sessão/agente — o --strict NÃO reprova por eles.
# Remover daqui quando a outra sessão commitar (07/09, migração Opção C).
IGNORE_FILES = {
    "lifelog-o-ciclo-do-nao.mdx",
    "en/lifelog-o-ciclo-do-nao.mdx",
}


def load_vocab():
    text = VOCAB_TS.read_text(encoding="utf-8")
    slugs = set(re.findall(r"\{ slug: '([^']+)'", text))
    aliases = {}
    m = re.search(r"TAG_ALIASES[^=]*=\s*\{(.*?)\n\}", text, re.S)
    if m:
        for k, v in re.findall(r"'([^']+)':\s*'([^']+)'", m.group(1)):
            aliases[k] = v
    return slugs, aliases


def norm(tag: str) -> str:
    t = tag.strip().strip("'\"").lower().strip()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = t.replace(" ", "-").replace("_", "-")
    t = re.sub(r"-{2,}", "-", t).strip("-")
    return t


def canonical(tag: str, slugs, aliases):
    t = norm(tag)
    if t in slugs:
        return t
    if t in aliases:
        return aliases[t]
    return None


FM_RE = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n", re.S)
TAGS_LINE_RE = re.compile(r"^tags:\s*\[([^\]]*?)\]\s*$", re.M)
TAGS_BLOCK_RE = re.compile(r"^tags:\s*\r?\n(^\s*- .*\r?\n?)+", re.M)
PROJECT_RE = re.compile(r"^project:\s*['\"]?([\w-]+)['\"]?\s*$", re.M)


def parse_post(path: Path):
    with path.open("r", encoding="utf-8", newline="") as f:
        raw = f.read()
    fm_m = FM_RE.match(raw)
    if not fm_m:
        return None
    fm = fm_m.group(1)
    block_tags = bool(TAGS_BLOCK_RE.search(fm))
    tags_m = TAGS_LINE_RE.search(fm)
    tags = None
    if tags_m:
        raw_list = tags_m.group(1).strip()
        tags = [t.strip().strip("'\"").strip() for t in raw_list.split(",") if t.strip()] if raw_list else []
    proj_m = PROJECT_RE.search(fm)
    project = proj_m.group(1) if proj_m else None
    return {"raw": raw, "fm": fm, "tags": tags, "block_tags": block_tags, "project": project}


def fm_replace_tags(post, new_tags):
    """Reescreve a linha tags: preservando CRLF (restaura \\r consumido por \\s*$)."""
    line = "tags: [" + ", ".join(new_tags) + "]\r"
    new_raw, n = re.subn(r"^tags:\s*\[[^\]]*?\]\s*$", lambda m: line, post["raw"], count=1, flags=re.M)
    return new_raw if n else post["raw"]


def fm_append_tag(post, tag):
    """Adiciona tag ao final da linha tags: existente (CRLF preservado)."""
    m = TAGS_LINE_RE.search(post["fm"])
    cur = [t.strip() for t in m.group(1).split(",") if t.strip()] if m else []
    if tag in cur:
        return post["raw"]
    cur.append(tag)
    return fm_replace_tags(post, cur)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--skip", action="append", default=[])
    args = ap.parse_args()

    slugs, aliases = load_vocab()
    if not slugs or not aliases:
        print(f"FATAL: vocab parse falhou (slugs={len(slugs)}, aliases={len(aliases)})")
        return 2

    posts = {}
    for d, lang in ((POSTS_PT, "pt"), (POSTS_EN, "en")):
        for p in sorted(d.glob("*.mdx")):
            if p.stem in args.skip:
                continue
            rel_check = f"{p.parent.name}/{p.name}" if d == POSTS_EN else p.name
            if rel_check in IGNORE_FILES:
                continue
            parsed = parse_post(p)
            if parsed is None:
                print(f"FM-MISSING {p.relative_to(ROOT)}")
                continue
            posts[(lang, p.stem)] = parsed

    errors = []   # (code, relpath, detail)
    warns = []
    canon = {}    # (lang, stem) -> list[slug] canônica

    for key, post in sorted(posts.items()):
        lang, stem = key
        rel = str((POSTS_EN if lang == "en" else POSTS_PT).relative_to(ROOT) / f"{stem}.mdx")
        if post["block_tags"]:
            errors.append(("E4", rel, "tags em multi-line"))
        if post["tags"] is None:
            errors.append(("E4", rel, "sem linha tags:"))
            canon[key] = []
            continue
        ctags, seen = [], set()
        for t in post["tags"]:
            c = canonical(t, slugs, aliases)
            if c is None:
                errors.append(("E1", rel, f"tag fora do vocab: {t!r}"))
                c = norm(t)
            if t != c and norm(t) in aliases:
                errors.append(("E6", rel, f"alias não canonizado: {t!r} -> {c}"))
            if c in seen:
                errors.append(("E5", rel, f"duplicata: {c}"))
            else:
                seen.add(c)
                ctags.append(c)
        if post["project"]:
            if post["project"] not in slugs:
                errors.append(("E6", rel, f"project fora do vocab: {post['project']!r}"))
            if post["project"] not in ctags:
                errors.append(("E2", rel, f"tag do projeto ausente: {post['project']}"))
                ctags.append(post["project"])
        canon[key] = ctags

    # E3: pares PT/EN
    stems_pt = {s for (l, s) in posts if l == "pt"}
    stems_en = {s for (l, s) in posts if l == "en"}
    for stem in sorted(stems_pt | stems_en):
        has_pt, has_en = ("pt", stem) in posts, ("en", stem) in posts
        if has_pt != has_en:
            side = "EN" if has_en else "PT"
            warns.append(("W2", f"{stem}.mdx", f"sem contraparte {side}"))
            continue
        if canon.get(("pt", stem)) != canon.get(("en", stem)):
            errors.append(("E3", f"{stem}.mdx", f"PT={canon.get(('pt', stem))} EN={canon.get(('en', stem))}"))

    # W1: ruído (1 ocorrência global, pós-canonicalização, PT+EN do mesmo post = 2)
    cnt = Counter()
    for stem in stems_pt & stems_en:
        for t in canon.get(("pt", stem), []):
            cnt[t] += 2
    for (l, s), ts in canon.items():
        if s not in stems_pt or s not in stems_en:
            for t in ts:
                cnt[t] += 1
    for t, n in sorted(cnt.items()):
        if n == 1:
            warns.append(("W1", t, "tag com 1 ocorrência global (ruído)"))

    if args.fix:
        changed = 0
        for key, post in sorted(posts.items()):
            lang, stem = key
            target = list(canon[(lang, stem)])
            # união PT+EN (ordem PT primeiro) para pares; EN-só/PT-só usam a própria lista
            if lang == "en" and ("pt", stem) in posts:
                pt_list = list(canon[("pt", stem)])
                en_only = [t for t in target if t not in pt_list]
                target = pt_list + en_only
                if canon.get(("pt", stem)) != target:
                    canon[("pt", stem)] = list(target)  # PT recebe EN-only também
            path = POSTS_EN / f"{stem}.mdx" if lang == "en" else POSTS_PT / f"{stem}.mdx"
            new_raw = fm_replace_tags(post, target)
            if new_raw != post["raw"]:
                path.write_text(new_raw, encoding="utf-8", newline="")
                changed += 1
        print(f"FIX: {changed} frontmatters reescritos")
        return 0

    for code, where, detail in errors:
        print(f"{code} {where}: {detail}")
    for code, where, detail in warns:
        print(f"{code} {where}: {detail}")
    print(f"--- {len(posts)} posts | {len(errors)} erros | {len(warns)} warnings | vocab={len(slugs)} aliases={len(aliases)}")
    return 1 if (args.strict and errors) else 0


if __name__ == "__main__":
    sys.exit(main())
