#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-post-content.py — guardião de conteúdo de artigo público do LifeLog.

Nace de um defeito real: 18 posts publicados terminavam a seção "Próximo passo"
com bloco de comando de OPERAÇÃO (git/npx/pnpm/curl/psql/docker/pytest) e alguns
traziam caminho absoluto do host dentro do bloco. O gerador de post fazia isso em
todo post novo; ninguém checava, e o Samuel achou o resíduo num post liberado.

Regra do acervo: artigo público explica o problema, não entrega receita de
operação da máquina. Caminho absoluto do host NUNCA; bloco de operação no FIM do
post NUNCA (é ali que o gerador despeja o "como verificar").

Erros (E*, bloqueiam com --strict):
  E1 caminho absoluto do host no corpo        (/home/samuel, /mnt/, /Users/, C:\\, \\wsl)
  E2 último elemento do post é bloco de OPERAÇÃO
  E3 rodapé "aguarda liberação manual" em post com hidden: false
Warnings (W*, não bloqueiam — o comando pode ser o ASSUNTO do post):
  W1 bloco de operação em outro ponto do corpo

Modos: (padrão) reporta | --strict exit 1 se houver E* | --list W1 imprime os W1
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS_PT = ROOT / "src" / "content" / "posts"
POSTS_EN = POSTS_PT / "en"

ABS_PATH = re.compile(
    r"(/home/samuel|/Users/samue|C:\\\\Users\\\\samue|[\\\\]{2}wsl\\$[a-z0-9_-]+)"
)
OP_CMD = re.compile(
    r"(^|\n)\s*(python3?(\s+-m)?|npx|npm|pnpm|yarn|bash|sh|cd|curl|wget|git|"
    r"systemctl|journalctl|psql|mysql|docker|docker-compose|alembic|wrangler|"
    r"ssh|scp|kubectl|pytest)\b"
)
FOOTER = re.compile(
    r"\n\s*---\s*\n\s*\*(Este post est[áa]|This post is)[^\n]*"
    r"(oculto|hidden|aguarda|await)[^\n]*\*\s*$",
    re.I,
)
FOOTER_TEXT = re.compile(
    r"aguarda libera[çc][ãa]o manual|aguardando libera[çc][ãa]o manual|"
    r"awaits manual release|awaiting manual release",
    re.I,
)
CODE_BLOCK = re.compile(r"```([A-Za-z0-9_+-]*)\n(.*?)```", re.S)

# Caminho de disco/dir privado citado no corpo: NÃO bloqueia (em vários posts o
# caminho é o próprio assunto do artigo) — serve para o dono decidir o que varrer.
HOST_HINT = re.compile(r"(/mnt/[a-z]/|/mnt/[a-z]/[A-Z]|[\\\\]{2}wsl|/mnt/c/Program)")


def parse(path: Path):
    text = path.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    fm = parts[1] if len(parts) > 2 else ""
    body = parts[2] if len(parts) > 2 else text
    hidden = None
    m = re.search(r"^hidden:\s*(\S+)", fm, re.M)
    if m:
        hidden = m.group(1).strip().strip("'\"") == "true"
    return text, body, hidden


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="exit 1 se houver erro E*")
    ap.add_argument("--list", action="store_true", help="imprime também os warnings W1")
    args = ap.parse_args()

    errors, warns, n = [], [], 0
    for directory, lang in ((POSTS_PT, "pt"), (POSTS_EN, "en")):
        for p in sorted(directory.glob("*.mdx")):
            n += 1
            rel = str(p.relative_to(ROOT))
            text, body, hidden = parse(p)

            if ABS_PATH.search(body):
                errors.append(("E1", rel, "caminho absoluto do host no corpo"))
            elif HOST_HINT.search(body):
                warns.append(("W2", rel, "caminho de disco/host citado no corpo (assunto do post?)"))

            # rodapé "post oculto" — só é defeito quando o post está publicado
            has_footer = bool(FOOTER_TEXT.search(text))
            if has_footer and hidden is False:
                errors.append(("E3", rel, "rodapé 'aguarda liberação manual' em post publicado"))

            # último elemento, ignorando rodapé
            tail = FOOTER.sub("", body).rstrip()
            if tail.endswith("```"):
                start = tail.rfind("```", 0, len(tail) - 3)
                header = tail[start + 3 :].split("\n", 1)[0].strip()
                block = tail[start + 3 + len(header) :]
                if OP_CMD.search("\n" + block):
                    errors.append(("E2", rel, "bloco de OPERAÇÃO é o último elemento do post"))

            # operação em qualquer outro ponto = warning (pode ser o assunto do post)
            for m in CODE_BLOCK.finditer(body):
                if OP_CMD.search("\n" + m.group(2)):
                    warns.append(("W1", rel, f"bloco de operação no corpo ({m.group(1) or 'sem lang'})"))
                    break

    for code, rel, detail in errors:
        print(f"{code} {rel}: {detail}")
    if args.list:
        for code, rel, detail in warns:
            print(f"{code} {rel}: {detail}")
    print(
        f"--- {n} posts | {len(errors)} erros | {len(warns)} warnings "
        f"(W1: bloco de operação no corpo, não bloqueia)"
    )
    return 1 if (args.strict and errors) else 0


if __name__ == "__main__":
    sys.exit(main())
