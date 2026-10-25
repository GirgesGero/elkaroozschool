import os
from playwright.sync_api import sync_playwright

dest_assets = os.path.abspath('presentation/assets')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('https://elkaroozschool1.vercel.app/bible', wait_until='networkidle')
    page.wait_for_timeout(2000)

    # 1. Main Bible Hub Overview
    page.screenshot(path=os.path.join(dest_assets, 'real_bible_hub.png'))
    print("Captured real_bible_hub.png")

    # 2. Try clicking on a book/chapter
    cards = page.query_selector_all('[role="button"], button, a')
    for card in cards:
        try:
            txt = card.inner_text()
            if any(k in txt for k in ['متى', 'تكوين', 'يوحنا', 'إنجيل', 'سفر']):
                card.click()
                page.wait_for_timeout(2000)
                page.screenshot(path=os.path.join(dest_assets, 'real_bible_reading.png'))
                print("Captured real_bible_reading.png")
                break
        except Exception:
            pass

    # 3. Search
    try:
        search_input = page.query_selector('input')
        if search_input:
            search_input.fill('الله محبة')
            page.keyboard.press('Enter')
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(dest_assets, 'real_bible_search.png'))
            print("Captured real_bible_search.png")
    except Exception:
        pass

    # 4. Login page
    page.goto('https://elkaroozschool1.vercel.app/login', wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(dest_assets, 'real_login_screen.png'))
    print("Captured real_login_screen.png")

    # 5. Mobile view
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto('https://elkaroozschool1.vercel.app/bible', wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(dest_assets, 'real_mobile_bible.png'))
    print("Captured real_mobile_bible.png")

    # 6. Mobile login
    page.goto('https://elkaroozschool1.vercel.app/login', wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(dest_assets, 'real_mobile_login.png'))
    print("Captured real_mobile_login.png")

    browser.close()

print("All screenshots successfully captured!")
