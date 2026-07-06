"""Video demo do tema claro — com noise fix (soft-light)"""
import os, time, subprocess, glob
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321"
OUT = "/home/samuel/lifelog/public/demo-light-fix.mp4"
TMP = "/home/samuel/lifelog/.tmp_frames"
FRAMES_DIR = TMP + "/frames"
os.makedirs(FRAMES_DIR, exist_ok=True)

PALETTES = ['purple', 'green', 'orange', 'cyan', 'pink', 'purple']
PALETTE_LABELS = ['🟣 Purple', '🟢 Green', '🟠 Orange', '🔵 Cyan', '🩷 Pink', '🟣 Purple']

def shot(page, path):
    page.screenshot(path=path, full_page=False)
    return os.path.getsize(path)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.goto(URL, wait_until='networkidle')
    time.sleep(1)

    # Mudar pra light mode
    page.evaluate("document.documentElement.setAttribute('data-theme','light')")
    time.sleep(0.8)

    # Abrir popover
    btns = page.locator('button')
    for i in range(btns.count()):
        txt = btns.nth(i).inner_text()
        if 'Personalizar' in txt:
            btns.nth(i).click()
            break
    time.sleep(0.5)

    radios = page.locator('input[type="radio"]')

    frame_idx = 0

    # Frames iniciais — tema light carregando
    for _ in range(15):
        shot(page, f"{FRAMES_DIR}/f{frame_idx:04d}.png")
        frame_idx += 1
        time.sleep(0.1)

    # Para cada paleta: transição + frames
    for pi, palette in enumerate(PALETTES):
        label = PALETTE_LABELS[pi]
        print(f"  {label}...")

        # Clicar no rádio da paleta
        if pi < 5:
            radio = radios.nth(pi)
        else:
            radio = radios.nth(0)  # volta pro purple

        radio.click()
        time.sleep(0.3)

        # Transição: fade de 30 frames (~3s)
        for _ in range(30):
            shot(page, f"{FRAMES_DIR}/f{frame_idx:04d}.png")
            frame_idx += 1
            time.sleep(0.05)

    # Frames finais
    for _ in range(15):
        shot(page, f"{FRAMES_DIR}/f{frame_idx:04d}.png")
        frame_idx += 1
        time.sleep(0.1)

    browser.close()

print(f"  {frame_idx} frames captured")

# Montar vídeo com ffmpeg
ffmpeg_cmd = [
    'ffmpeg', '-y',
    '-framerate', '10',
    '-pattern_type', 'glob',
    '-i', f'{FRAMES_DIR}/f*.png',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '23',
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    OUT
]
print(f"  Montando vídeo...")
subprocess.run(ffmpeg_cmd, capture_output=True)
size = os.path.getsize(OUT)
print(f"  Video: {OUT} ({size} bytes)")

# Limpar frames temporários
for f in glob.glob(f"{FRAMES_DIR}/f*.png"):
    os.remove(f)
os.rmdir(FRAMES_DIR)
os.rmdir(TMP)
print("  Done!")
