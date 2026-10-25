import re

with open('scripts/build_huge_text_no_qr.py', encoding='utf-8') as f:
    text = f.read()

# Find all slides
slide_ids = re.findall(r'<section class="slide"[^>]*id="([^"]+)"', text)
print("Found slides:", slide_ids)
