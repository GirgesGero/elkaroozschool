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
        await page.screenshot(path="presentation/assets/v5_slide_5_circle.png", full_page=False)
        print("Saved v5_slide_5_circle.png")
        
        # Test clicking Node 3 (ترجمات الكتاب المقدس)
        node3 = await page.query_selector("div.enc-grand-node[data-sec='sec3']")
        if node3:
            await node3.click()
            await page.wait_for_timeout(700)
            await page.screenshot(path="presentation/assets/v5_slide_5_node3.png", full_page=False)
            print("Saved v5_slide_5_node3.png")

        # Test clicking Node 7 (الشخصيات الكتابية)
        node7 = await page.query_selector("div.enc-grand-node[data-sec='sec7']")
        if node7:
            await node7.click()
            await page.wait_for_timeout(700)
            await page.screenshot(path="presentation/assets/v5_slide_5_node7.png", full_page=False)
            print("Saved v5_slide_5_node7.png")

        await browser.close()
        print("Verification complete!")

if __name__ == "__main__":
    asyncio.run(main())
