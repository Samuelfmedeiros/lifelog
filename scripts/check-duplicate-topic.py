#!/usr/bin/env python3
"""Bloqueia post novo cujo TEMA ja foi coberto por outro post hidden do mesmo dia.

A selecao por carencia (contagem + gap de 2 dias) nao ve duplicidade de ASSUNTO:
ela garante distribuicao de projetos, nao de temas. Dois slots do mesmo dia podem
cair no mesmo projeto E no mesmo assunto -- foi o que aconteceu em 03/10/2026, com
o Post B escolhendo Dogwalk enquanto o Post A (08h) e o Refazer (12:18) ja tinham
escrito sobre 'zonas de cobertura'.

Este guard roda no CI (logo apos check-lang-sync.py) e falha se o post novo
compartilhar `date:` com outro post ja existente E repetir o mesmo tema.

Como comparar tema sem embeddings? Barato e deterministico: os termos de maior
peso do titulo (stopwords removidas), normalizados, em PT e EN via as duas
versoes do mesmo par. Um postNovo conflita quando:
  - compartilha `date:` com outro post, E
  - a sobreposicao de termos de conteudo do titulo >= LIMIAR (padrao 0.5)
    usando o titulo do par ja existente (PT ou EN, o que tiver mais termos).

Heuristica documentada e limitada: e uma barreira contra o modo de falha comum
(mesmo assunto, mesmo dia), nao um detector de plagio. Erro humano continua
sendo humano.

Uso:  python3 scripts/check-duplicate-topic.py [--min-overlap 0.5]
Exit: 0 = ok, 1 = conflito, 2 = erro de execucao.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
POSTS = ROOT / "src" / "content" / "posts"

STOPWORDS = {
    # PT
    "a", "o", "as", "os", "um", "uma", "de", "do", "da", "dos", "das", "em", "no",
    "na", "nos", "nas", "por", "que", "com", "sem", "para", "pra", "pro", "ao",
    "aos", "e", "ou", "se", "nao", "na", "mais", "menos", "muito", "sobre",
    "como", "quando", "onde", "qual", "quais", "eu", "voce", "meu", "minha",
    "foi", "era", "sao", "ate", "apos", "entre", "contra", "desde", "cada",
    "isso", "isto", "aquilo", "pelo", "pela", "isso", "entao", "ja", "so",
    # EN
    "the", "of", "to", "in", "on", "at", "for", "and", "or", "but", "is", "are",
    "was", "were", "be", "been", "it", "its", "that", "this", "these", "those",
    "i", "we", "my", "our", "you", "your", "he", "she", "they", "them", "their",
    "not", "no", "never", "how", "when", "where", "which", "what", "why",
    "from", "with", "without", "into", "about", "after", "before", "between",
    "than", "then", "there", "here", "only", "just", "very", "much", "can",
    # PT genericos que sozinhos nao caracterizam tema
    "ainda", "existe", "existem", "existente", "sempre", "nunca", "agora",
    "hoje", "ontem", "mesmo", "mesma", "assim", "entao", "onde", "vez",
    "vezes", "coisa", "gente", "pessoa", "pessoas", "mundo", "forma",
    "parte", "modo", "tipo", "caso", "casos", "ponto", "pontos", "lado",
    "momento", "tempo", "dia", "dias", "ano", "anos", "pode", "podem",
    "precisa", "precisam", "faz", "fazem", "feito", "feita", "ser",
    # EN genericos que sozinhos nao caracterizam tema
    "doesn", "don", "yet", "still", "ever", "always", "never", "now",
    "thing", "things", "people", "person", "world", "way", "ways",
    "part", "parts", "case", "cases", "point", "points", "side",
    "moment", "time", "day", "days", "year", "years", "can", "need",
    "needs", "make", "makes", "made", "get", "gets", "got", "same",
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


def parse_frontmatter(raw: str) -> dict:
    """Extrai o bloco YAML inicial de forma tolerante (sem pyyaml)."""
    if not raw.startswith("---"):
        return {}
    end = raw.find("\n---", 3)
    if end == -1:
        return {}
    block = raw[3:end]
    out: dict[str, str] = {}
    for line in block.splitlines():
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        val = val.strip("'\"")
        out[key] = val
    return out


def content_terms(text: str) -> set[str]:
    """Termos significativos do titulo: normalizados, sem stopword, >= 4 chars."""
    norm = normalize(text)
    words = re.findall(r"[a-z][a-z0-9-]{2,}", norm)
    return {w for w in words if w not in STOPWORDS and len(w) >= 4}


def overlap_ratio(a: set[str], b: set[str]) -> float:
    """Jaccard entre dois conjuntos de termos. 0.0 se algum for vazio."""
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


MIN_PAIR = 0.4
# Terminos de dominio/tercnica que sobrevivem a traducao PT<->EN com grafia
# parecida. Sem esta lista, "fallback" vs "fallback" ja casa; com ela, pares como
# "Coverage Zones" / "zonas de cobertura" tambem casam pelo termo compartilhado.
SHARED_HINTS = {
    "dogwalk", "tatuengine", "arachne", "capivara", "portifolio", "portfolio",
    "seguranca", "security", "estudos", "descobertas", "lifelog", "playwright",
    "vitest", "eslint", "python", "react", "node", "docker", "kubernetes",
    "coverage", "fallback", "fixture", "fixtures", "adapter", "webhook",
    "sqlite", "qdrant", "onnx", "cuda", "flask", "github", "vercel", "next",
    "tailwind", "astro", "mdx", "lgpd", "pwa", "api", "cache", "webp", "prompt",
    "embedding", "embeddings", "rag", "pgpd", "schema", "token", "gateway",
    "kubernetes", "nginx", "s3", "etag", "cron", "mcp", "llm", "ocr", "vlm",
}


def is_translation_pair(a: dict, b: dict) -> bool:
    """Duas entradas com o mesmo date sao o mesmo post em PT/EN?

    Sinais, em ordem de confianca:
      1. language declared no frontmatter difere (pt vs en).
      2. termos de dominio compartilhados + termo generico em comum.
      3. Jaccard alto dos termos normalizados (títulos quase literais).
    """
    lang_a, lang_b = a.get("lang"), b.get("lang")
    if {lang_a, lang_b} == {"pt", "en"}:
        # Declaracao de lingua oposta: o par mais provavel do repo.
        return True
    shared = a["terms"] & b["terms"]
    shared_hints = shared & SHARED_HINTS
    if not shared_hints:
        return overlap_ratio(a["terms"], b["terms"]) >= 0.75
    # Hints de dominio sozinhos nao provam par PT/EN: "Coverage Zones" e
    # "zonas de cobertura" compartilham coverage+zone mas sao DOIS posts PT
    # sobre o mesmo tema (o caso real de 03/10/2026). Exige, alem do hint,
    # que a lingua seja oposta OU que o titulo seja quase o mesmo.
    if {lang_a, lang_b} != {"pt", "en"}:
        return False
    return bool(shared - shared_hints) or overlap_ratio(a["terms"], b["terms"]) >= 0.5


def twin_path(md_path: pathlib.Path) -> pathlib.Path | None:
    """Se o arquivo esta em posts/en/, o par PT fica na raiz; e vice-versa."""
    name = md_path.name
    if md_path.parent.name == "en":
        candidate = POSTS / name
        return candidate if candidate.exists() else None
    candidate = POSTS / "en" / name
    return candidate if candidate.exists() else None


def collect() -> list[dict]:
    posts = []
    for path in sorted(POSTS.glob("**/*.mdx")):
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        fm = parse_frontmatter(raw)
        if not fm.get("title"):
            continue
        terms = content_terms(fm["title"])
        lang = fm.get("lang", "").strip().lower().strip("'\"")
        twin = twin_path(path)
        if twin:
            try:
                tfm = parse_frontmatter(twin.read_text(encoding="utf-8", errors="replace"))
            except OSError:
                tfm = {}
            if tfm.get("title"):
                terms |= content_terms(tfm["title"])
        date = fm.get("date", "")[:10]
        if not date:
            continue
        posts.append({
            "slug": path.name[:-4],
            "path": path,
            "title": fm["title"],
            "date": date,
            "day": date,
            "project": fm.get("project", "?"),
            "hidden": fm.get("hidden", "").strip().lower() == "true",
            "lang": lang or "pt",
            "terms": terms,
        })
    return posts


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-overlap", type=float, default=0.5)
    ap.add_argument("--ignore-slug", action="append", default=[],
                    help="slug a ignorar (ex.: o proprio post em verificacao)")
    args = ap.parse_args()

    posts = collect()
    ignore = set(args.ignore_slug)
    conflicts = []

    # Agrupa por (date, project): so complains se o mesmo dia E o mesmo projeto.
    by_slot: dict[tuple[str, str], list[dict]] = {}
    for p in posts:
        if p["slug"] in ignore:
            continue
        by_slot.setdefault((p["day"], p["project"]), []).append(p)

    for (date, project), group in sorted(by_slot.items()):
        if len(group) < 2:
            continue
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                # O par PT/EN do MESMO post tem o mesmo slug e overlap 100% por
                # definicao (titulos traduzidos). Nao e conflito de tema.
                if a["slug"] == b["slug"]:
                    continue
                # Casamento de par PT/EN: o repo tem slugs EN que NAO seguem o PT
                # (ex.: tatuengine-sft-adafactor... vs sft-do-tatuengine-...).
                # Duas linhas com o mesmo date+project cujos termos de titulo sao
                # majoritariamente os mesmos (>= MIN_PAIR) sao o MESMO post em
                # duas linguas — nao duplicata de tema. O limiar e tolerante
                # porque PT e EN nao compartilham os mesmos termos (traducao).
                # Compara o DIA (date[:10]), nao a data com hora: dois posts do mesmo
                # tema no mesmo dia sao conflito mesmo com horarios distintos
                # (o post real de 03/10 tinha 20:00 vs 23:00 no mesmo 2026-09-16).
                if a["day"] == b["day"] and is_translation_pair(a, b):
                    continue
                if not a["terms"] or not b["terms"]:
                    continue
                inter = a["terms"] & b["terms"]
                union = a["terms"] | b["terms"]
                # CONFLITO usa coeficiente de SOBREPOSICAO (|A∩B|/min(|A|,|B|)),
                # nao Jaccard. Jaccard pune titulo longo ("A zona de cobertura que
                # nao conta pessoas" = 3 termos PT contra 6 do par EN) e deixaria
                # passar o caso real de 03/10, onde so "cobertura"+"zona" casam.
                overlap = len(inter) / min(len(a["terms"]), len(b["terms"]))
                if overlap >= args.min_overlap:
                    conflicts.append((date, project, a, b, inter, overlap))

    if not conflicts:
        print(f"check-duplicate-topic: OK — {len(posts)} posts, 0 conflitos de tema no mesmo dia")
        return 0

    print(f"check-duplicate-topic: {len(conflicts)} CONFLITO(S) de tema no mesmo dia\n")
    for date, project, a, b, inter, ov in conflicts:
        print(f"  data {date} | project {project} | sobreposicao {ov:.0%}")
        print(f"    - {a['slug']}  hidden={a['hidden']}  :: {a['title']}")
        print(f"    - {b['slug']}  hidden={b['hidden']}  :: {b['title']}")
        print(f"    termos em comum: {', '.join(sorted(inter))}")
        print()
    print("Resolva removendo/renomeando um dos dois (git rm + novo slug), ou")
    print("defina --min-overlap menor se a coincidencia for legitima.")
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"check-duplicate-topic: ERRO {type(exc).__name__}: {exc}")
        sys.exit(2)