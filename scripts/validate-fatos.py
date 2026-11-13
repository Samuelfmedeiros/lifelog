#!/usr/bin/env python3
"""GATE DE FATOS — barra post que cita commit/script/arquivo inexistente.

Criado 13/11/2026. Motivo medido: o post
`pipeline-de-geracao-de-posts-revisao-2026-11-07.mdx` foi escrito com dados
INVENTADOS e passou por todos os gates existentes:

  - commits citados no <Terminal>: a1b2c3d, 4e5f6a7, b8c9d0e -> nenhum existe no repo
  - scripts citados: verify-post-size.sh, check-frontmatter.py -> nao existem
  - src/components/PostQuality.test.ts -> nao existe
  - tabela de metricas inventada (40% -> 0% de rejeicao, 5/10 -> 8/10 "qualidade subjetiva")
  - o proprio post dizia "642 palavras" e tinha 543

Nenhum gate olhava isso: validate-covers so olha capa, check-tags so vocabulario,
check-post-content so estrutura. Post fabricado subia igual a post real.

O que este gate faz:
  1. Extrai SHAs de commit (7-40 hex) do texto e do bloco <Terminal> e exige que
     cada um exista em `git cat-file -e`.
  2. Extrai caminhos de arquivo citados (scripts/*, src/*, api/*, public/*) e exige
     que existam no disco.
  3. Falha o build (exit 1) listando cada fabricacao encontrada.

Isso nao julga a prosa: julga fato verificavel. Numero e path podem ser checados;
opiniao nao. Se um dado nao pode ser verificado pela maquina, ele nao entra como
se fosse fato.

Uso:
    python3 scripts/validate-fatos.py                    # todos os posts
    python3 scripts/validate-fatos.py <slug>             # um post
    python3 scripts/validate-fatos.py --changed          # so o que mudou (git diff)
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "src" / "content" / "posts"

# Posts do LifeLog citam trabalho de OUTROS projetos do ecossistema (dogwalk,
# capivara, arachne, portifolio...). Medido 13/11: 563 "fabricacoes" apontadas
# em 251 posts eram majoritariamente commits/paths legitimos de outros repos.
# Checar so o repo do LifeLog transforma referencia cruzada em falso positivo e
# o gate vira ruido que ninguem pode ligar no build.
ECOSSISTEMA = Path.home() / "projetos" / "projetos"

# SHA de commit: 7 a 40 hex. Evita casar com hashes de md5/sha de arquivo
# (32/64 hex) e com anos (4 digitos), mas 7-8 hex e ambiguo por natureza —
# por isso a checagem e sempre contra o repo real, nunca por formato.
SHA_RE = re.compile(r"\b[0-9a-f]{7,40}\b")

# SHA de action do GitHub (`uses: actions/checkout@<sha>`): fixado por versao,
# NAO existe como objeto no repo local. Medido 13/11: 11bd719... (checkout v4.2.2)
# virava "commit fabricado" e derrubava o gate num post correto.
ACTION_SHA_RE = re.compile(r"(?:uses:\s*[\w\-./]+|@)[0-9a-f]{40}\b")

# Caminho de arquivo citado: precisa ter uma barra e extensao conhecida.
PATH_RE = re.compile(
    r"\b(?:scripts|src|api|public|e2e)/[A-Za-z0-9_./\-]+\.(?:py|mjs|js|ts|tsx|astro|sh|mdx|json|webp)\b"
)

# Falso positivo conhecido: hex longo dentro de bloco de codigo que nao e commit.
IGNORE_SHA = {
    # UUIDs, cores, e trechos de exemplo de documentacao
    "0000000", "ffffff",
}


def is_git_repo() -> bool:
    return (ROOT / ".git").exists()


def _repos() -> list[Path]:
    """Todos os repos git do ecossistema + o proprio LifeLog."""
    repos = [ROOT]
    if ECOSSISTEMA.is_dir():
        for d in sorted(ECOSSISTEMA.iterdir()):
            if (d / ".git").exists() and d.resolve() != ROOT.resolve():
                repos.append(d)
    return repos


_REPO_LIST: list[Path] | None = None


def repos() -> list[Path]:
    global _REPO_LIST
    if _REPO_LIST is None:
        _REPO_LIST = _repos()
    return _REPO_LIST


def sha_exists(sha: str) -> bool:
    """SHA existe em QUALQUER repo do ecossistema.

    Referencia cruzada e legitima: um post do LifeLog sobre o dogwalk cita
    commit do dogwalk. O que caracteriza fabricacao e o SHA nao existir em
    repo nenhum.
    """
    for repo in repos():
        r = subprocess.run(
            ["git", "-C", str(repo), "cat-file", "-e", sha],
            capture_output=True,
        )
        if r.returncode == 0:
            return True
    return False


def shas_in(text: str) -> set[str]:
    # SHA pinado de action do GitHub nao e commit do repo: sai da conta antes
    # de qualquer outra checagem.
    text = ACTION_SHA_RE.sub(" ", text)
    found = set()
    for m in SHA_RE.finditer(text):
        s = m.group(0)
        if s in IGNORE_SHA:
            continue
        # Só interessa o que parece SHA de commit: precisa ter ao menos uma
        # letra entre a-f (senão é número, data, versão ou contagem).
        if not re.search(r"[a-f]", s):
            continue
        # 4 dígitos puros já foi filtrado acima; 7+ hex é candidato.
        found.add(s)
    return found


def paths_in(text: str) -> set[str]:
    return {m.group(0) for m in PATH_RE.finditer(text)}


def path_exists(rel: str) -> bool:
    """Path existe AGORA em algum repo, ou existiu em algum momento.

    Removido != inventado. Medido 13/11: `api/tests/test_mcp_iserror.py` e
    `api/tests/e2e/test_mcp_protocol_e2e.py` foram apagados do Arachne DEPOIS de
    o post ser escrito — o post era verdadeiro quando nasceu. Reprovar isso
    pune o autor por descrever trabalho real.
    """
    for repo in repos():
        if (repo / rel).exists():
            return True
        # existiu no historico? git log -- <path> responde mesmo se foi apagado
        r = subprocess.run(
            ["git", "-C", str(repo), "log", "--all", "--oneline", "-1", "--", rel],
            capture_output=True,
        )
        if r.returncode == 0 and r.stdout.strip():
            return True
    return False


def audit_post(path: Path) -> list[str]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    problems: list[str] = []

    for sha in sorted(shas_in(raw)):
        if not sha_exists(sha):
            problems.append(f"commit citado nao existe no repo: {sha}")

    for rel in sorted(paths_in(raw)):
        if not path_exists(rel):
            problems.append(f"arquivo citado nao existe: {rel}")

    return problems


def changed_posts() -> list[Path]:
    r = subprocess.run(
        ["git", "-C", str(ROOT), "diff", "--name-only", "HEAD", "--", "src/content/posts"],
        capture_output=True,
        text=True,
    )
    out = []
    for line in r.stdout.splitlines():
        p = ROOT / line.strip()
        if p.suffix == ".mdx" and p.exists():
            out.append(p)
    return out


def main() -> int:
    args = sys.argv[1:]

    if "--changed" in args:
        targets = changed_posts()
        if not targets:
            print("[fatos] nada mudou em src/content/posts — ok")
            return 0
    elif "--novos" in args:
        # Posts NOVOS contra a main (usado no CI/build): o acervo historico tem
        # referencia legitima a arquivo que existiu e foi removido, e a commit de
        # repo que nao esta no checkout do runner. Reprovar o acervo inteiro num
        # host sem os 47 repos = gate desligado na pratica. Post novo e o que
        # pode ser fabricado hoje.
        targets = changed_posts()
        if not targets:
            print("[fatos] nenhum post novo — ok")
            return 0
    elif args and not args[0].startswith("-"):
        slug = args[0]
        cands = [p for p in POSTS.rglob("*.mdx") if p.stem == slug or slug in str(p)]
        if not cands:
            print(f"[fatos] post nao encontrado: {slug}")
            return 1
        targets = cands
    else:
        targets = sorted(POSTS.rglob("*.mdx"))

    if not is_git_repo():
        print(f"[fatos] AVISO: {ROOT} nao e repo git — pulando checagem de commit")
        return 0

    total_problems = 0
    for p in targets:
        probs = audit_post(p)
        if probs:
            rel = p.relative_to(ROOT)
            for prob in probs:
                print(f"[fatos] FABRICADO em {rel}: {prob}")
            total_problems += len(probs)

    if total_problems:
        print(f"[fatos] {total_problems} dado(s) fabricado(s) — build BLOQUEADO")
        return 1

    print(f"[fatos] {len(targets)} post(s) verificados — nenhum dado fabricado")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
