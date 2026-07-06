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

    # 1) Mostrar dark mode primeiro
    page.wait_for_timeout(1500)

    # 2) Abrir popover de tema
    page.evaluate("document.querySelector('button[aria-label*=Personalizar]').click()")
    page.wait_for_timeout(800)

    # 3) Alternar para light mode
    page.evaluate("""
        document.querySelectorAll('button').forEach(b => {
            if(b.textContent.includes('Alternar')) b.click();
        });
    """)
    page.wait_for_timeout(1000)

    # 4) Mostrar fundo claro + aura inicial
    page.wait_for_timeout(1500)

    # 5) Trocar paletas
    paletas = [
        (2, "Verde"),
        (3, "Laranja"),
        (1, "Ciano"),
        (4, "Rosa"),
        (0, "Roxo"),
    ]
    for idx, nome in paletas:
        page.evaluate(f"document.querySelectorAll('input[type=radio]')[{idx}].click()")
        page.wait_for_timeout(1200)
        print(f"  Paleta {nome} ({idx}) — OK", flush=True)

    # 6) Fechar popover e resultado final
    page.evaluate("document.querySelector('button[aria-label*=Personalizar]').click()")
    page.wait_for_timeout(2000)

    context.close()
    browser.close()

    # Renomear o vídeo
    vids = sorted(glob.glob("/home/samuel/lifelog/public/*.webm"), key=os.path.getctime)
    if vids:
        newest = max(vids, key=os.path.getctime)
        os.rename(newest, OUT)
        print(f"SUCCESS: Video salvo: {OUT}", flush=True)
    else:
        print("ERRO: nenhum video encontrado em /home/samuel/lifelog/public/", flush=True)
