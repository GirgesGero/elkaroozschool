import asyncio
from playwright.async_api import async_playwright
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        
        file_path = os.path.abspath("presentation/index.html")
        file_url = f"file:///{file_path.replace(os.sep, '/')}"
        print(f"Opening: {file_url}")
        
        await page.goto(file_url, wait_until="networkidle")
        await page.wait_for_timeout(1000)

        for i in range(1, 10):
            if i > 1:
                await page.click(f"div.dot-step:nth-child({i})")
                await page.wait_for_timeout(800)
            await page.screenshot(path=f"presentation/assets/full_deck_slide_{i}.png", full_page=False)
            print(f"Captured full_deck_slide_{i}.png")

        await browser.close()
        print("All 9 slides captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
