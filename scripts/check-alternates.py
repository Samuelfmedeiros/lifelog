#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check-alternates.py — guardiao do SEO bilingue do LifeLog.

Roda sobre o dist/ depois do build e falha (exit 1) se:
  1. algum <link rel=alternate hreflang> aponta para URL que nao existe no dist
     (Google: "If two pages don't both point to each other, the tags will be ignored")
  2. algum asset referenciado no <head> (icon, manifest, apple-touch-icon, rss)
     nao existe no dist (ex.: icons PWA do manifest.json que davam 404)

Slugs com acento sao comparados ja decodificados e normalizados (NFC), porque
o href vai URL-encoded e o filesystem pode estar em NFC ou NFD.

Uso:  python3 scripts/check-alternates.py [--dist dist]
"""
import argparse, os, re, sys, unicodedata
from urllib.parse import unquote

SITE = "https://lifelog-sepia.vercel.app"

HEAD_ASSET_RE = re.compile(
    r'<(?:link|meta)[^>]*?(?:href|content)="(/(?:icons/|covers/|patterns/|manifest\.json|sw\.js|favicon\.svg|rss\.xml|en/rss\.xml)[^"]*)"'
)
ALERT_RE = re.compile(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"')


def norm(s):
    return unicodedata.normalize("NFC", unquote(s))


def route_exists(dist, url_path):
    p = norm(url_path).lstrip("/")
    if p == "":
        return os.path.isfile(os.path.join(dist, "index.html"))
    cands = (
        os.path.join(dist, p.rstrip("/"), "index.html"),
        os.path.join(dist, p),
        os.path.join(dist, p.rstrip("/") + ".html"),
    )
    if any(os.path.isfile(c) for c in cands):
        return True
    # fallback: compara normalizado (filesystem em NFD)
    base = os.path.join(dist, p)
    if p.rstrip("/") == "":
        return False
    parent = os.path.dirname(base.rstrip("/")) or dist
    leaf = os.path.basename(base.rstrip("/"))
    if os.path.isdir(parent):
        target = os.path.normpath(leaf)
        for entry in os.listdir(parent):
            if os.path.normpath(entry) == target:
                return os.path.isfile(os.path.join(parent, entry, "index.html")) or os.path.isfile(
                    os.path.join(parent, entry)
                )
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist", default="dist")
    a = ap.parse_args()
    dist = a.dist
    if not os.path.isdir(dist):
        print("!! dist/ nao encontrado — rode o build antes")
        return 1

    broken_alts, missing_assets = [], []
    checked = 0
    for root, dirs, files in os.walk(dist):
        for f in (x for x in files if x.endswith(".html")):
            fp = os.path.join(root, f)
            rel = os.path.relpath(fp, dist).replace("\\", "/")
            txt = open(fp, encoding="utf-8", errors="replace").read()

            for hl, href in ALERT_RE.findall(txt):
                checked += 1
                path = href.replace(SITE, "")
                if not route_exists(dist, path):
                    broken_alts.append((rel, hl, path))

            for asset in HEAD_ASSET_RE.findall(txt):
                if not os.path.isfile(os.path.join(dist, norm(asset).lstrip("/"))):
                    missing_assets.append((rel, asset))

    broken_alts = sorted(set(broken_alts))
    missing_assets = sorted(set(missing_assets))

    print("alternates verificados: %d" % checked)
    if broken_alts:
        print("\nHREFLANG apontando para pagina inexistente: %d" % len(broken_alts))
        by_kind = {}
        for rel, hl, path in broken_alts:
            parts = path.strip("/").split("/")
            kind = parts[1] if len(parts) > 1 else parts[0]
            by_kind[kind] = by_kind.get(kind, 0) + 1
        for k, v in sorted(by_kind.items(), key=lambda x: -x[1]):
            print("   %-16s %d" % (k, v))
        for rel, hl, path in broken_alts[:8]:
            print("   %s  hreflang=%s -> %s" % (rel, hl, path))

    if missing_assets:
        print("\nASSETS do <head> ausentes no dist: %d" % len(missing_assets))
        for rel, asset in missing_assets[:10]:
            print("   %s -> %s" % (rel, asset))

    if broken_alts or missing_assets:
        print("\nFALHOU")
        return 1
    print("\nOK — hreflang e assets do head coerentes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
