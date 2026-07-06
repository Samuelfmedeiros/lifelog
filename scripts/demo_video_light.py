"""Video demo do tema claro — noise fix, clicando nos botões certos"""
import os, time, subprocess, glob, json
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321"
OUT = "/home/samuel/lifelog/public/demo-light-fix.mp4"
FRAMES_DIR = "/tmp/light_frames"
os.makedirs(FRAMES_DIR, exist_ok=True)

PALETTES = ['purple', 'cyan', 'emerald', 'amber', 'rose', 'purple']

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', '--disable-gpu',
            '--single-process',
        ]
    )
    page = browser.new_page(viewport={'width': 1000, 'height': 600})
    page.goto(URL, wait_until='domcontentloaded')
    time.sleep(2)

    # Mudar pra light mode
    page.evaluate("document.documentElement.setAttribute('data-theme','light')")
    time.sleep(0.5)

    # Abrir popover clicando no toggle
    page.evaluate("document.getElementById('rail-toggle')?.click()")
    time.sleep(0.5)

    frame_idx = [0]

    def snap():
        page.screenshot(path=f"{FRAMES_DIR}/f{frame_idx[0]:04d}.png")
        frame_idx[0] += 1

    # Frames iniciais
    for _ in range(4):
        snap()
        time.sleep(0.05)

    # Trocar paletas clicando nos dots
    for pi, pal_id in enumerate(PALETTES):
        # Clicar no botão da paleta
        page.evaluate(f"""() => {{
            const dot = document.querySelector('.rail-dot[data-palette="{pal_id}"]');
            if (dot) dot.click();
        }}""")
        time.sleep(0.3)

        for _ in range(8):
            snap()
            time.sleep(0.05)

        page.evaluate("void 0")

    for _ in range(4):
        snap()
        time.sleep(0.05)

    browser.close()

print(f"{frame_idx[0]} frames captured")

# Montar com ffmpeg
subprocess.run([
    'ffmpeg', '-y',
    '-framerate', '8',
    '-pattern_type', 'glob',
    '-i', f'{FRAMES_DIR}/f*.png',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '23',
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    OUT
], capture_output=True)
size = os.path.getsize(OUT)
print(f"Video: {OUT} ({size/1024:.0f} KB)")

for f in glob.glob(f"{FRAMES_DIR}/f*.png"):
    os.remove(f)
os.rmdir(FRAMES_DIR)
print("Done!")
