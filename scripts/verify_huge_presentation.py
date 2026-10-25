import os
import re
import asyncio
from playwright.async_api import async_playwright

async def verify_presentation():
    html_path = os.path.abspath("presentation/index.html")
    if not os.path.exists(html_path):
        print(f"Error: {html_path} does not exist!")
        return

    file_url = f"file:///{html_path.replace(os.sep, '/')}"
    print(f"Loading presentation from: {file_url}")

    output_dir = os.path.abspath("presentation/assets")
    os.makedirs(output_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Full HD presentation resolution
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        await page.goto(file_url, wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # 1. Total slides count
        total_slides = await page.evaluate("() => totalSlides")
        print(f"totalSlides in JS: {total_slides}")

        # 2. Check for QR code references in DOM
        qr_elements = await page.evaluate("""() => {
            const matches = [];
            document.querySelectorAll('*').forEach(el => {
                if (el.className && typeof el.className === 'string' && el.className.toLowerCase().includes('qr')) {
                    matches.push({tag: el.tagName, class: el.className});
                }
                if (el.id && el.id.toLowerCase().includes('qr')) {
                    matches.push({tag: el.tagName, id: el.id});
                }
                if (el.src && el.src.toLowerCase().includes('qr')) {
                    matches.push({tag: el.tagName, src: el.src});
                }
            });
            return matches;
        }""")
        print(f"QR code elements in DOM: {len(qr_elements)}")
        if qr_elements:
            print("Found QR elements:", qr_elements)

        # 3. Check for English words in UI text
        body_text = await page.evaluate("() => document.body.innerText")
        raw_words = re.findall(r'[A-Za-z]{3,}', body_text)
        ignored_words = {'http', 'https', 'elkaroozschool1', 'vercel', 'app', 'com', 'org', 'net'}
        flagged_words = [w for w in raw_words if w.lower() not in ignored_words]
        print(f"Flagged English words in UI: {len(flagged_words)}")
        if flagged_words:
            print("Flagged words:", flagged_words[:20])

        # 4. Step through each slide 1 to 9
        for slide_num in range(1, total_slides + 1):
            print(f"Switching to Slide {slide_num}...")
            await page.evaluate(f"window.goToSlide({slide_num})")
            # Wait for GSAP transitions to complete smoothly
            await page.wait_for_timeout(1000)

            # Check if active slide is visible
            active_info = await page.evaluate(f"""() => {{
                const slide = document.getElementById('slide-{slide_num}');
                const counter = document.getElementById('slideCounter').textContent;
                return {{
                    id: slide ? slide.id : null,
                    classList: slide ? slide.className : null,
                    counterText: counter
                }};
            }}""")
            print(f"Slide {slide_num} active status: {active_info}")

            # Capture screenshot
            out_file = os.path.join(output_dir, f"huge_slide_{slide_num}.png")
            await page.screenshot(path=out_file, full_page=False)
            print(f"Captured: {out_file} (size: {os.path.getsize(out_file):,} bytes)")

        await browser.close()
        print("Presentation verification completed successfully!")

if __name__ == "__main__":
    asyncio.run(verify_presentation())
