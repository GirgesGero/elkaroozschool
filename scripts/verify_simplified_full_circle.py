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
        
        # Screenshot Slide 1
        await page.screenshot(path="presentation/assets/v3_slide_1.png", full_page=False)
        print("Saved v3_slide_1.png")
        
        # Navigate to Slide 2
        await page.click("div.dot-step:nth-child(2)")
        await page.wait_for_timeout(800)
        await page.screenshot(path="presentation/assets/v3_slide_2.png", full_page=False)
        print("Saved v3_slide_2.png")
        
        # Navigate to Slide 4
        await page.click("div.dot-step:nth-child(4)")
        await page.wait_for_timeout(800)
        await page.screenshot(path="presentation/assets/v3_slide_4.png", full_page=False)
        print("Saved v3_slide_4.png")

        # Navigate to Slide 5 (The Grand Full-Screen Circle)
        await page.click("div.dot-step:nth-child(5)")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="presentation/assets/v3_slide_5_circle.png", full_page=False)
        print("Saved v3_slide_5_circle.png")
        
        # Test clicking another node on Slide 5 (e.g. Node 4: مخطوطات الكتاب المقدس)
        node4 = await page.query_selector("div.enc-grand-node[data-sec='sec4']")
        if node4:
            await node4.click()
            await page.wait_for_timeout(600)
            await page.screenshot(path="presentation/assets/v3_slide_5_node4_active.png", full_page=False)
            print("Saved v3_slide_5_node4_active.png")

        # Navigate to Slide 6
        await page.click("div.dot-step:nth-child(6)")
        await page.wait_for_timeout(800)
        await page.screenshot(path="presentation/assets/v3_slide_6.png", full_page=False)
        print("Saved v3_slide_6.png")

        await browser.close()
        print("All verification screenshots taken successfully!")

if __name__ == "__main__":
    asyncio.run(main())
