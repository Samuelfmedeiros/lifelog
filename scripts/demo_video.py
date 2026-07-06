"""Demo do tema claro turbinado — grava vídeo com Playwright"""
import os, time, glob
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321"
OUT = "/home/samuel/lifelog/public/demo-light-theme.mp4"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        record_video_dir="/home/samuel/lifelog/public/",
        record_video_size={"width": 1280, "height": 800},
    )
    page = context.new_page()
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(2000)

    print("1. Dark mode initial", flush=True)
    page.wait_for_timeout(1500)

    # 2) Abrir popover
    page.locator('button[aria-label*="Personalizar"]').click()
    page.wait_for_timeout(800)

    # 3) Alternar para light
    page.locator('button:has-text("Alternar")').first.click()
    page.wait_for_timeout(1000)

    # 4) Mostrar fundo claro + aura
    print("2. Light mode + aura", flush=True)
    page.wait_for_timeout(2000)

    # 5) Trocar paletas — usar locators diretamente
    radios = page.locator('input[type="radio"]')
    paletas = [
        (2, "Verde"),
        (3, "Laranja"),
        (1, "Ciano"),
        (4, "Rosa"),
        (0, "Roxo"),
    ]
    for idx, nome in paletas:
        radios.nth(idx).click()
        page.wait_for_timeout(1200)
        # Verificar se a aura mudou
        aura = page.evaluate(
            "getComputedStyle(document.documentElement).getPropertyValue('--aura-gradient').trim().substring(0, 60)"
        )
        print(f"  {nome} ({idx}): {aura}", flush=True)

    # 6) Fechar popover
    page.locator('button[aria-label*="Personalizar"]').click()
    page.wait_for_timeout(2000)
    print("3. Final light mode", flush=True)

    context.close()
    browser.close()

    # Renomear
    vids = sorted(glob.glob("/home/samuel/lifelog/public/*.webm"), key=os.path.getctime)
    for v in vids:
        print(f"  Found: {os.path.basename(v)}", flush=True)
    if vids:
        newest = max(vids, key=os.path.getctime)
        os.rename(newest, OUT)
        print(f"SUCCESS: {OUT} ({os.path.getsize(OUT)} bytes)", flush=True)
    else:
        print("ERRO: nenhum video em /home/samuel/lifelog/public/", flush=True)
        print("  Dir contents:", os.listdir("/home/samuel/lifelog/public/"), flush=True)
