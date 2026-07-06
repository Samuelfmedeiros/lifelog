"""Verifica o fix do noise no tema claro"""
import os, time, json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.goto('http://localhost:4321', wait_until='networkidle')
    time.sleep(1)

    # Mudar pra light mode via JS
    page.evaluate("document.documentElement.setAttribute('data-theme','light')")
    time.sleep(1)

    # Abrir popover
    btns = page.locator('button')
    for i in range(btns.count()):
        txt = btns.nth(i).inner_text()
        if 'Personalizar' in txt:
            btns.nth(i).click()
            break
    time.sleep(0.5)

    # CSS do body pra confirmar
    css = page.evaluate("""
        () => {
            const s = getComputedStyle(document.body);
            return JSON.stringify({
                bgColor: s.backgroundColor,
                bgImage: s.backgroundImage.substring(0, 250),
                blendMode: s.backgroundBlendMode,
                patternOpacity: getComputedStyle(document.documentElement).getPropertyValue('--pattern-opacity').trim(),
                patternBlend: getComputedStyle(document.documentElement).getPropertyValue('--pattern-blend').trim(),
            })
        }
    """)
    print('CSS:', css)

    page.screenshot(path='/home/samuel/lifelog/public/test-light-fix.png', full_page=True)
    print('Screenshot OK')

    browser.close()
