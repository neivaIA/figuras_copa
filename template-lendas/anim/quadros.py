import sys, json, os
from playwright.sync_api import sync_playwright
ts = [float(x) for x in sys.argv[1:]]
tl = json.load(open("tl.json")) if os.path.exists("tl.json") else None
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1080,"height":1920})
    pg.goto("file://" + os.path.abspath("index.html"))
    if tl: pg.evaluate("o=>setTL(o)", tl)
    for t in ts:
        pg.evaluate("t=>render(t)", t); pg.screenshot(path=f"/tmp/q_{t}.jpg", type="jpeg", quality=80)
    b.close()
