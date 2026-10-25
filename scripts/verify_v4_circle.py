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

        # Navigate to Slide 5
        await page.click("div.dot-step:nth-child(5)")
        await page.wait_for_timeout(1200)
        await page.screenshot(path="presentation/assets/v4_slide_5_circle.png", full_page=False)
        print("Saved v4_slide_5_circle.png")
        
        # Click Node 9 (الماراثون الروحي - matching user's active node in their screenshot!)
        node9 = await page.query_selector("div.enc-grand-node[data-sec='sec9']")
        if node9:
            await node9.click()
            await page.wait_for_timeout(700)
            await page.screenshot(path="presentation/assets/v4_slide_5_marathon.png", full_page=False)
            print("Saved v4_slide_5_marathon.png")

        # Click Node 2 (تفسير الكتاب المقدس)
        node2 = await page.query_selector("div.enc-grand-node[data-sec='sec2']")
        if node2:
            await node2.click()
            await page.wait_for_timeout(700)
            await page.screenshot(path="presentation/assets/v4_slide_5_tafseer.png", full_page=False)
            print("Saved v4_slide_5_tafseer.png")

        await browser.close()
        print("All verification screenshots taken successfully!")

if __name__ == "__main__":
    asyncio.run(main())
