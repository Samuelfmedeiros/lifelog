"""Video demo do tema claro — com transições entre paletas"""
import os, time, subprocess, glob
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321"
OUT = "/home/samuel/lifelog/public/demo-light-theme.mp4"
FRAMES = "/home/samuel/lifelog/public/frames_light"

os.makedirs(FRAMES, exist_ok=True)

chromium_path = "/home/samuel/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"

# Paletas: [hex, nome, opacidades]
paletas = [
    ("#8b5cf6", "Roxo",   0.35, 0.15, 0.10),
    ("#22c55e", "Verde",  0.30, 0.12, 0.08),
    ("#fbbf24", "Laranja",0.35, 0.15, 0.10),
    ("#06b6d4", "Ciano",  0.25, 0.10, 0.07),
    ("#ec4899", "Rosa",   0.30, 0.12, 0.08),
    ("#8b5cf6", "Roxo",   0.35, 0.15, 0.10),
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=chromium_path,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    )
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto(URL, wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(500)
    
    # Forçar light mode
    page.evaluate('document.documentElement.setAttribute("data-theme", "light")')
    page.wait_for_timeout(200)
    
    fn = [0]
    def shot():
        path = f"{FRAMES}/frame_{fn[0]:05d}.png"
        page.screenshot(path=path)
        fn[0] += 1
    
    def make_aura(hex_color, center_op, mid_op, counter_op):
        r = int(hex_color[1:3], 16)
        g = int(hex_color[3:5], 16)
        b = int(hex_color[5:7], 16)
        return (
            f'radial-gradient(ellipse 120% 60% at 90% 10%, '
            f'rgba({r},{g},{b},{center_op}) 0%, '
            f'rgba({r},{g},{b},{mid_op}) 40%, '
            f'rgba({r},{g},{b},0.05) 100%), '
            f'radial-gradient(ellipse 80% 40% at 10% 90%, '
            f'rgba({r},{g},{b},{counter_op}) 0%, transparent 100%)'
        )
    
    def fade_aura(from_hex, to_hex, steps=5, delay=150):
        """Transição entre paletas"""
        fr = int(from_hex[1:3], 16); fg = int(from_hex[3:5], 16); fb = int(from_hex[5:7], 16)
        tr = int(to_hex[1:3], 16); tg = int(to_hex[3:5], 16); tb = int(to_hex[5:7], 16)
        for s in range(1, steps + 1):
            t = s / (steps + 1)
            r = int(fr + (tr - fr) * t)
            g = int(fg + (tg - fg) * t)
            b = int(fb + (tb - fb) * t)
            aura = (
                f'radial-gradient(ellipse 120% 60% at 90% 10%, '
                f'rgba({r},{g},{b},0.30) 0%, '
                f'rgba({r},{g},{b},0.12) 40%, '
                f'rgba({r},{g},{b},0.05) 100%), '
                f'radial-gradient(ellipse 80% 40% at 10% 90%, '
                f'rgba({r},{g},{b},0.08) 0%, transparent 100%)'
            )
            page.evaluate(f'document.documentElement.style.setProperty("--aura-gradient", "{aura}")')
            shot()
            page.wait_for_timeout(delay)
    
    print("Gravando frames...", flush=True)
    
    # 1) Dark mode + transição para light
    print("  Dark → Light", flush=True)
    for _ in range(8):
        shot()
        page.wait_for_timeout(250)
    
    page.evaluate('document.documentElement.style.setProperty("--aura-gradient", "")')
    for _ in range(6):
        shot()
        page.wait_for_timeout(250)
    
    # 2) Trocar paletas com fade
    for i in range(len(paletas) - 1):
        hex_c, nome, c_op, m_op, co_op = paletas[i]
        next_hex = paletas[i + 1][0]
        print(f"  Paleta {i}: {nome} → ...", flush=True)
        
        # Definir aura atual
        aura = make_aura(hex_c, c_op, m_op, co_op)
        page.evaluate(f'document.documentElement.style.setProperty("--aura-gradient", "{aura}")')
        
        # Mostrar paleta por alguns frames
        for _ in range(4):
            shot()
            page.wait_for_timeout(300)
        
        # Fade para a próxima
        fade_aura(hex_c, next_hex, steps=6, delay=150)
    
    # 3) Final - mostrar resultado
    print("  Final", flush=True)
    for _ in range(8):
        shot()
        page.wait_for_timeout(300)
    
    browser.close()

# Juntar frames em vídeo com ffmpeg
print(f"\nGerando vídeo ({fn[0]} frames)...", flush=True)
cmd = [
    "ffmpeg", "-y",
    "-framerate", "2.5",
    "-i", f"{FRAMES}/frame_%05d.png",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "medium",
    "-crf", "18",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
    "-movflags", "+faststart",
    OUT
]
subprocess.run(cmd, check=True)
size = os.path.getsize(OUT)
print(f"SUCCESS: {OUT} ({size / 1024:.0f} KB)", flush=True)

# Limpeza
for f in glob.glob(f"{FRAMES}/frame_*.png"):
    os.remove(f)
os.rmdir(FRAMES)
print("Cleanup OK", flush=True)
