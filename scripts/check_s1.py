import re

with open('scripts/build_huge_text_no_qr.py', encoding='utf-8') as f:
    text = f.read()

s1 = re.findall(r'<section[^>]*id="slide-1"[^>]*>', text)
print("Slide 1 tag:", s1)
