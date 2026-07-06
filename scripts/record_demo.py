#!/usr/bin/env python3
"""Grava vídeo final do LifeLog — versão completa."""
import asyncio, os, glob
from playwright.async_api import async_playwright

SITE_URL = "http://localhost:4322"
VIDEO_PATH = "/home/samuel/lifelog/demo_lifelog.mp4"
VIDEO_DIR = "/home/samuel/lifelog/demo_video"

async def main():
    os.makedirs(VIDEO_DIR, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=VIDEO_DIR, record_video_size={"width": 1440, "height": 900},
        )
        page = await context.new_page()
        await page.goto(SITE_URL, wait_until="networkidle")
        await page.evaluate("localStorage.clear()")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(2500)

        # 1. Home + scroll reveal
        print("▶️  Home + scroll...")
        for i in range(8):
            await page.evaluate("window.scrollBy({top: 250, behavior: 'smooth'})")
            await page.wait_for_timeout(400)
        await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        await page.wait_for_timeout(1200)

        # 2. Abrir Theme Rail
        print("▶️  Abrindo Theme Rail...")
        await page.click("#rail-toggle")
        await page.wait_for_timeout(1200)

        # 3. TROCAR PALETAS em dark
        for pal in ['emerald', 'rose', 'amber', 'purple']:
            await page.click(f'[data-palette="{pal}"]')
            await page.wait_for_timeout(900)

        # 4. Toggle tema (circle-wipe)
        print("▶️  Alternando tema (circle-wipe)...")
        await page.click("#rail-theme")
        await page.wait_for_timeout(2500)

        # 5. Paletas em light
        for pal in ['blue', 'cyan', 'purple']:
            await page.click(f'[data-palette="{pal}"]')
            await page.wait_for_timeout(900)

        # 6. Volta dark
        print("▶️  Voltando dark...")
        await page.click("#rail-theme")
        await page.wait_for_timeout(2500)

        await page.click("#rail-toggle")
        await page.wait_for_timeout(500)

        # 7. Arquivo
        print("▶️  /arquivo...")
        await page.goto(f"{SITE_URL}/arquivo", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        for i in range(4):
            await page.evaluate("window.scrollBy({top: 250, behavior: 'smooth'})")
            await page.wait_for_timeout(400)

        # 8. Sobre + Terminal
        print("▶️  /sobre + terminal...")
        await page.goto(f"{SITE_URL}/sobre", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.click("#rail-toggle")
        await page.wait_for_timeout(500)
        await page.click('[data-palette="amber"]')
        await page.wait_for_timeout(800)

        await page.locator("#terminal-input").click()
        for cmd in ["whoami", "ls", "skills", "help"]:
            await page.keyboard.type(cmd, delay=60)
            await page.wait_for_timeout(150)
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(1000)
        await page.keyboard.type("clear", delay=60)
        await page.wait_for_timeout(150)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(500)
        await page.keyboard.type("whoami", delay=60)
        await page.wait_for_timeout(150)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(1000)

        # 9. Home final
        print("▶️  Home final...")
        await page.goto(SITE_URL, wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.evaluate("window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})")
        await page.wait_for_timeout(2000)
        print("✅ Fim!")
        await context.close()
        await browser.close()

    webm_files = sorted(glob.glob(os.path.join(VIDEO_DIR, "*.webm")), key=os.path.getmtime, reverse=True)
    if not webm_files: print("❌"); return
    p = webm_files[0]; print(f"📁 {p}")
    os.system(f'ffmpeg -y -i "{p}" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -movflags +faststart "{VIDEO_PATH}" 2>/dev/null')
    s = os.path.getsize(VIDEO_PATH)/1024/1024 if os.path.exists(VIDEO_PATH) else 0
    print(f"✅ {VIDEO_PATH} ({s:.1f} MB)")
    for f in webm_files:
        try: os.remove(f)
        except: pass

if __name__ == "__main__":
    asyncio.run(main())
