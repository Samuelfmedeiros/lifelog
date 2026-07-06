"""Grava vídeo demo do tema claro turbinado — Lifelog"""
import os, time, glob, subprocess
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321"
OUT = "/home/samuel/lifelog/public/demo-light-theme.mp4"
FRAMES_DIR = "/home/samuel/lifelog/public/frames_light"

os.makedirs(FRAMES_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto(URL, wait_until="networkidle", timeout=20000)
    page.wait_for_timeout(1000)

    frame_num = [0]

    def shot():
        path = f"{FRAMES_DIR}/frame_{frame_num[0]:05d}.png"
        page.screenshot(path=path)
        frame_num[0] += 1

    n_frames = frame_num

    def wait_and_shot(n, delay=0.5):
        for i in range(n):
            shot()
            page.wait_for_timeout(int(delay * 1000))

    print("1/6 Dark mode inicial...", flush=True)
    wait_and_shot(4, 0.75)

    print("2/6 Abrindo popover...", flush=True)
    page.locator('button[aria-label*="Personalizar"]').click()
    page.wait_for_timeout(300)
    shot()
    page.wait_for_timeout(700)

    print("3/6 Alternando para Light...", flush=True)
    page.locator('button:has-text("Alternar")').first.click()
    wait_and_shot(4, 0.4)

    print("4/6 Aura roxa inicial...", flush=True)
    wait_and_shot(4, 0.5)

    print("5/6 Trocando paletas...", flush=True)
    radios = page.locator('input[type="radio"]')
    for idx, nome in [(2, "Verde"), (3, "Laranja"), (1, "Ciano"), (4, "Rosa"), (0, "Roxo")]:
        print(f"  → {nome}", flush=True)
        radios.nth(idx).click()
        wait_and_shot(3, 0.4)

    print("6/6 Fechando popover + final...", flush=True)
    page.locator('button[aria-label*="Personalizar"]').click()
    wait_and_shot(4, 0.5)
    wait_and_shot(3, 0.5)

    browser.close()

# Gerar vídeo com ffmpeg
print(f"\nGerando vídeo...", flush=True)
cmd = [
    "ffmpeg", "-y",
    "-framerate", "2",
    "-i", f"{FRAMES_DIR}/frame_%05d.png",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "medium",
    "-crf", "18",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
    OUT
]
subprocess.run(cmd, check=True)
size = os.path.getsize(OUT)
print(f"SUCCESS: {OUT} ({size / 1024 / 1024:.1f} MB, {frame_num[0]} frames)", flush=True)

# Limpar frames
for f in glob.glob(f"{FRAMES_DIR}/frame_*.png"):
    os.remove(f)
os.rmdir(FRAMES_DIR)
print("Cleanup OK", flush=True)
