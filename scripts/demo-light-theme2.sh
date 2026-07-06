"""Demo do tema claro turbinado — grava vídeo com Playwright"""
import subprocess, sys, time
from pathlib import Path

# Achar o Python do Arachne que tem playwright
arachne_python = "/home/samuel/projetos/Arachne/.venv-linux/bin/python3"

code = r"""
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

    # 3) Alternar para light mode - usar evaluate para clicar
    page.evaluate("""
        document.querySelectorAll('button').forEach(b => {
            if(b.textContent.includes('Alternar')) b.click();
        });
    """)
    page.wait_for_timeout(1000)

    # 4) Mostrar fundo claro + aura
    page.wait_for_timeout(1500)

    # 5) Trocar paletas para ver a aura mudar
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

    # 6) Fechar popover e mostrar resultado
    page.evaluate("document.querySelector('button[aria-label*=Personalizar]').click()")
    page.wait_for_timeout(2000)

    context.close()
    browser.close()

    # Renomear o vídeo gravado para o nome final
    vids = sorted(glob.glob("/home/samuel/lifelog/public/*.webm"), key=os.path.getctime)
    for v in vids:
        print(f"  Found video: {os.path.basename(v)}", flush=True)

    if vids:
        # Pega o mais recente
        newest = max(vids, key=os.path.getctime)
        os.rename(newest, OUT)
        print(f"SUCCESS: Video salvo: {OUT}", flush=True)
    else:
        print("ERRO: nenhum video encontrado", flush=True)
        print("Arquivos em public/:", os.listdir("/home/samuel/lifelog/public/"))
"""

# Escreve script temporário e executa com o Python do Arachne
script_path = "/tmp/demo_light_theme2.py"
with open(script_path, "w") as f:
    f.write(code)

result = subprocess.run(
    [arachne_python, script_path],
    capture_output=True, text=True, timeout=60
)
print(result.stdout)
if result.stderr:
    # Mostrar apenas os ultimos 500 chars
    stderr_clean = result.stderr.replace("\\n", "\n")
    print("STDERR:", stderr_clean[-800:])
sys.exit(result.returncode)
