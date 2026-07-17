#!/usr/bin/env python3
"""
LifeLog PT/EN Sync Checker
Verifica se todo post PT tem sua versão EN correspondente.
Match inteligente: compara por date + project em vez de nome de arquivo.
"""
import sys, os, re
from pathlib import Path
from datetime import datetime

POSTS_DIR = Path(__file__).parent.parent / 'src' / 'content' / 'posts'

def extract_fields(filepath: Path):
    """Extrai campos relevantes do frontmatter."""
    fields = {}
    try:
        content = filepath.read_text(encoding='utf-8')
        in_frontmatter = False
        for line in content.split('\n'):
            if line.strip() == '---':
                in_frontmatter = not in_frontmatter
                continue
            if in_frontmatter:
                for key in ['title', 'project', 'date', 'lang']:
                    if line.strip().startswith(f'{key}:'):
                        val = line.split(':', 1)[1].strip().strip("'\" ")
                        fields[key] = val
    except Exception:
        pass
    return fields

def check_sync():
    # Group by (date, project) as the matching key
    pt_by_key = {}
    en_by_key = {}
    
    for f in POSTS_DIR.glob('*.mdx'):
        fields = extract_fields(f)
        if 'project' in fields and 'date' in fields:
            key = (fields['date'], fields['project'])
            pt_by_key[key] = (f.name, fields)
    
    en_dir = POSTS_DIR / 'en'
    if en_dir.exists():
        for f in en_dir.glob('*.mdx'):
            fields = extract_fields(f)
            if 'project' in fields and 'date' in fields:
                key = (fields['date'], fields['project'])
                en_by_key[key] = (f.name, fields)
    
    errors = []
    warnings = []
    
    # PT without EN match
    for key, (name, fields) in sorted(pt_by_key.items()):
        if key not in en_by_key:
            errors.append(f"❌ PT sem EN: {name} ({fields.get('title','?')})")
    
    # EN without PT match
    for key, (name, fields) in sorted(en_by_key.items()):
        if key not in pt_by_key:
            warnings.append(f"⚠️  EN sem PT (pode ser intencional): {name} ({fields.get('title','?')})")
    
    # Check project field sync for matching pairs
    common_keys = set(pt_by_key.keys()) & set(en_by_key.keys())
    for key in sorted(common_keys):
        pt_name, pt_fields = pt_by_key[key]
        en_name, en_fields = en_by_key[key]
        if pt_fields.get('project') != en_fields.get('project'):
            errors.append(f"🔴 project MISMATCH: PT={pt_name} project={pt_fields.get('project')} | EN={en_name} project={en_fields.get('project')}")
    
    return errors, warnings

if __name__ == '__main__':
    errors, warnings = check_sync()
    total = len(errors) + len(warnings)
    
    if errors or warnings:
        print(f"\n📋 LifeLog PT/EN Sync Check: {len(errors)} erro(s), {len(warnings)} aviso(s)\n")
        for e in errors:
            print(f"  {e}")
        if warnings:
            print()
            for w in warnings:
                print(f"  {w}")
        print()
        # Only fail on errors, not warnings
        if errors:
            sys.exit(1)
        else:
            print("✅ Apenas warnings (intencional) — sync OK.")
            sys.exit(0)
    else:
        print("✅ PT/EN sync perfeito — todos os posts emparelhados.")
        sys.exit(0)
