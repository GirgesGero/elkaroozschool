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
        await page.screenshot(path="presentation/assets/leaders_slide_1.png", full_page=False)
        print("Screenshot of Slide 1 saved: presentation/assets/leaders_slide_1.png")
        
        # Let's crop just the blessing header on Slide 1
        header_el = await page.query_selector(".church-blessing-header")
        if header_el:
            await header_el.screenshot(path="presentation/assets/leaders_header_crop.png")
            print("Screenshot of header crop saved: presentation/assets/leaders_header_crop.png")
            
        # Navigate to Slide 9
        await page.click("div.dot-step:nth-child(9)")
        await page.wait_for_timeout(1000)
        
        await page.screenshot(path="presentation/assets/leaders_slide_9.png", full_page=False)
        print("Screenshot of Slide 9 saved: presentation/assets/leaders_slide_9.png")
        
        await browser.close()
        print("All verification screenshots taken successfully!")

if __name__ == "__main__":
    asyncio.run(main())
