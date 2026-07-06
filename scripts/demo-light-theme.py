"""Demo do tema claro turbinado — grava vídeo com Playwright"""
import subprocess, sys, time
from pathlib import Path

# Achar o Python do Arachne que tem playwright
arachne_python = "/home/samuel/projetos/Arachne/.venv-linux/bin/python3"

code = r"""
import os, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321"
OUT = "/home/samuel/lifelog/public/demo-light-theme.mp4"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        record_video_dir="/home/samuel/lifelog/public/",
        record_video_size={"width": 1280, "height": 800},
    )
    page = context.new_page()
    page.goto(URL, wait_until="networkidle")
    time.sleep(1.5)

    # 1) Mostrar dark mode primeiro (1s)
    page.wait_for_timeout(1000)

    # 2) Abrir popover de tema
    page.click("button[aria-label*='Personalizar']")
    page.wait_for_timeout(600)

    # 3) Alternar para light mode
    page.click("button:has-text('Alternar')")
    page.wait_for_timeout(800)

    # 4) Mostrar fundo claro + aura roxa (padrão) (1.5s)
    page.wait_for_timeout(1500)

    # 5) Trocar paletas para ver a aura mudar
    paletas = [
        (2, "Verde"),   # index 2 = green
        (3, "Laranja"), # index 3 = orange
        (1, "Ciano"),   # index 1 = blue/cyan
        (4, "Rosa"),    # index 4 = red/pink
        (0, "Roxo"),    # index 0 = purple
    ]
    for idx, nome in paletas:
        page.locator("input[type='radio']").nth(idx).click()
        page.wait_for_timeout(1200)

    # 6) Fechar popover e mostrar resultado final (1s)
    page.click("button[aria-label*='Personalizar']")
    page.wait_for_timeout(1500)

    context.close()
    browser.close()

    # Renomear o vídeo gravado para o nome final
    import glob
    vids = glob.glob("/home/samuel/lifelog/public/*.webm")
    if vids:
        # Pega o mais recente
        newest = max(vids, key=os.path.getctime)
        os.rename(newest, OUT)
        print(f"Video salvo: {OUT}")
    else:
        print("ERRO: nenhum video encontrado")
"""

# Escreve script temporário e executa com o Python do Arachne
script_path = "/tmp/demo_light_theme.py"
with open(script_path, "w") as f:
    f.write(code)

result = subprocess.run(
    [arachne_python, script_path],
    capture_output=True, text=True, timeout=60
)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr[:500])
sys.exit(result.returncode)
