#!/usr/bin/env python3
"""
📝 LifeLog — Gerador Automático de Posts via LLM

Uso:
  python3 scripts/gerar_post.py "Como o Arachne lida com rate limiting"
  python3 scripts/gerar_post.py "FTS5 vs Vetorial no RAG" --project arachne
  python3 scripts/gerar_post.py "O que aprendi essa semana" --project estudos
  python3 scripts/gerar_post.py --auto  # Modo automático: busca contexto recente e gera

Gera um .mdx em src/content/posts/ com frontmatter completo.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, date
from pathlib import Path
from typing import Optional
import urllib.request
import urllib.error

# ── Config ──────────────────────────────────────────────────────────
LIFELOG_DIR = Path(__file__).resolve().parent.parent
POSTS_DIR = LIFELOG_DIR / "src" / "content" / "posts"

# Projetos válidos e seus ícones
PROJECTS = {
    "arachne": {"icon": "🕷️",  "label": "Arachne"},
    "dogwalk": {"icon": "🐶",   "label": "Dogwalk"},
    "portfolio": {"icon": "🚀", "label": "Portfolio"},
    "capivara": {"icon": "🐷",  "label": "Capivara"},
    "estudos": {"icon": "📚",  "label": "Estudos"},
    "descobertas": {"icon": "💡", "label": "Descobertas"},
}

# Provider Hermes (usa o LLM configurado)
HERMES_API = "http://127.0.0.1:8642/v1/chat/completions"  # gateway default


def slugify(text: str) -> str:
    """Gera slug amigável a partir do título."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text[:80]


def call_llm(prompt: str, system: str = "", max_tokens: int = 2048) -> Optional[str]:
    """Chama o LLM via Ollama API local."""
    ollama_payload = json.dumps({
        "model": "phi4:latest",
        "messages": [
            {"role": "system", "content": system or "Você é um escritor técnico que gera posts de blog em português brasileiro. Tom direto, informal, como se fosse o próprio desenvolvedor escrevendo."},
            {"role": "user", "content": prompt},
        ],
        "options": {"num_predict": max_tokens, "temperature": 0.7},
        "stream": False,
    }).encode()

    try:
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/chat",
            data=ollama_payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read())
            return data["message"]["content"]
    except Exception as e:
        print(f"  ❌ Ollama falhou: {e}")
        return None


def search_context(query: str, max_results: int = 3) -> str:
    """Busca contexto no Arachne RAG + web para enriquecer o post."""
    context_parts = []

    # 1. Tenta Arachne RAG
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/query",
            data=json.dumps({"question": query, "kb_id": 1}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            rag_data = json.loads(resp.read())
            if "answer" in rag_data:
                context_parts.append(f"## Contexto do RAG\n{rag_data['answer'][:1500]}")
    except Exception:
        pass

    # 2. Tenta web_search via terminal (DuckDuckGo via Arachne MCP)
    try:
        result = subprocess.run(
            ["curl", "-s", f"http://127.0.0.1:8000/api/search?q={query}&limit={max_results}"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            context_parts.append(f"## Busca Web\n{result.stdout[:1500]}")
    except Exception:
        pass

    return "\n\n".join(context_parts)


def generate_post(topic: str, project: str = "descobertas", context: str = "") -> Optional[Path]:
    """Gera um post MDX completo usando LLM."""
    proj = PROJECTS.get(project, PROJECTS["descobertas"])
    today = date.today()
    slug = slugify(topic)
    filename = f"{slug}.mdx"
    filepath = POSTS_DIR / filename

    if filepath.exists():
        print(f"  ⚠️ Post já existe: {filename}")
        return None

    system_prompt = """Você é Samuel Medeiros, desenvolvedor senior brasileiro.
Escreva um post de blog técnico em português brasileiro com:

## Tom e estilo
- Direto, informal, como se estivesse conversando com outro dev
- Use "você" ou "a gente", evite "nós" acadêmico
- Pode usar gírias leves (bagulho, parada, trampo, meter bronca)
- Mistura técnica com experiência pessoal
- Se for tutorial, inclua código/blocos de comando

## Estrutura do post
- Título chamativo e informativo
- Lead (1-2 parágrafos) que contextualiza
- Seções com ##, subtópicos com ###
- Pelo menos um blockquote (>) com insight ou lição aprendida
- Tags relevantes (mínimo 3)
- Conclusão curta
- 200-400 palavras

## Formato de saída
Você deve retornar APENAS o conteúdo do frontmatter YAML + markdown body,
separados por ---, pronto para salvar como .mdx.
"""

    prompt = f"""Gere um post de blog sobre o tema abaixo.

Tema: {topic}
Projeto: {project} ({proj['label']})
Data: {today.isoformat()}

{context}

O frontmatter YAML deve usar:
- title: (string)
- description: (string, resumo de 1-2 frases)
- date: {today.isoformat()}
- project: {project}
- tags: [lista de tags, mínimo 3]
- icon: "{proj['icon']}"

Retorne APENAS o arquivo .mdx completo (frontmatter + body separados por ---).
"""

    print(f"  🤖 Gerando post sobre: {topic}")
    response = call_llm(prompt, system_prompt)

    if not response:
        print("  ❌ LLM não retornou conteúdo")
        return None

    # Extrair frontmatter e body
    content = response.strip()

    # Se o LLM devolveu com ```mdx ```, ```yaml ou ```, limpa
    content = re.sub(r'^```(?:yaml|mdx|markdown)?\s*\n', '', content)
    content = re.sub(r'\n```\s*$', '', content)

    # Garantir que começa com ---
    if not content.startswith('---'):
        content = f'---\n{content}'

    # Separar frontmatter e body
    parts = content.split('---', 2)
    if len(parts) >= 3:
        frontmatter_raw = parts[1].strip()
        body = parts[2].strip()
    else:
        frontmatter_raw = parts[1].strip() if len(parts) >= 2 else ''
        body = ''

    # Limpeza do frontmatter: garantir formato YAML válido
    frontmatter_lines = []
    for line in frontmatter_raw.split('\n'):
        line = line.strip()
        # Pular ``` e linhas vazias no começo
        if line in ('```', ''):
            continue
        frontmatter_lines.append(line)

    # Garantir que tags fique em formato inline [tag1, tag2]
    frontmatter_cleaned = '\n'.join(frontmatter_lines)

    # Remover trailing ``` do body também
    body = re.sub(r'^```\s*\n', '', body)
    body = re.sub(r'\n```\s*$', '', body)

    content = f'---\n{frontmatter_cleaned}\n---\n\n{body}'

    # Salvar
    filepath.write_text(content, encoding='utf-8')
    print(f"  ✅ Post salvo: {filename} ({len(content)} chars)")

    return filepath


def build_site() -> bool:
    """Roda astro build pra verificar."""
    print("  🏗️  Buildando...")
    result = subprocess.run(
        ["pnpm", "run", "build"],
        cwd=LIFELOG_DIR,
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode == 0:
        print(f"  ✅ Build OK ({len(result.stdout.splitlines())} linhas)")
        return True
    else:
        print(f"  ❌ Build FALHOU:")
        for line in result.stderr.splitlines()[-10:]:
            print(f"     {line}")
        return False


def auto_mode() -> None:
    """Modo automático: gera post sobre o que está rolando nos projetos."""
    print("🔍 Modo automático — buscando contexto dos projetos...\n")

    # Tópicos pré-definidos para gerar posts
    topics = [
        ("arachne", "Como o Arachne evoluiu este mês — scraping, RAG e MCP"),
        ("dogwalk", "O que aprendi com GraphQL no Dogwalk"),
        ("portfolio", "Design sci-fi e a identidade do portfólio"),
        ("estudos", "Descobertas recentes sobre FTS5 e busca vetorial"),
        ("capivara", "Capivara e a organização financeira automatizada"),
    ]

    # Pega contexto fresco
    for proj, topic in topics:
        print(f"\n📝 [{proj}] {topic}")
        ctx = search_context(topic)
        filepath = generate_post(topic, proj, ctx)
        if filepath:
            build_site()
            print()
            break  # Um por execução no modo auto
        else:
            print("  ⏭️  Pulando (já existe ou falhou)")


def main():
    parser = argparse.ArgumentParser(description="LifeLog — Gerador Automático de Posts")
    parser.add_argument("topic", nargs="?", help="Tema do post")
    parser.add_argument("--project", "-p", choices=list(PROJECTS.keys()),
                        default="descobertas", help="Projeto/tema visual")
    parser.add_argument("--auto", action="store_true",
                        help="Modo automático: gera sobre projetos recentes")
    parser.add_argument("--no-build", action="store_true",
                        help="Pula build após gerar")
    parser.add_argument("--context", "-c", default="",
                        help="Contexto extra para o LLM")
    parser.add_argument("--search", action="store_true",
                        help="Busca contexto no RAG antes de gerar")

    args = parser.parse_args()

    if args.auto:
        auto_mode()
        return

    if not args.topic:
        parser.print_help()
        print("\nExemplos:")
        print("  python3 scripts/gerar_post.py \"FTS5 na prática\" --project estudos")
        print("  python3 scripts/gerar_post.py \"GraphQL vs REST\" --project dogwalk --search")
        print("  python3 scripts/gerar_post.py --auto")
        return

    # Busca contexto se solicitado
    context = args.context
    if args.search:
        print("🔍 Buscando contexto...")
        context = search_context(args.topic)
        if context:
            print(f"   Contexto obtido ({len(context)} chars)")
        else:
            print("   Sem contexto adicional")

    # Gera o post
    filepath = generate_post(args.topic, args.project, context)

    if filepath and not args.no_build:
        build_site()


if __name__ == "__main__":
    main()
