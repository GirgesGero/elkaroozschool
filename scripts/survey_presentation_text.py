import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open('presentation/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

slides = re.findall(r'<section class="slide[^"]*" id="slide-(\d+)">([\s\S]*?)</section>', text)
print(f"Total slides found: {len(slides)}\n")

for s_num, s_content in slides:
    print(f"============================== SLIDE {s_num} ==============================")
    titles = re.findall(r'<h[1-4][^>]*>([\s\S]*?)</h[1-4]>', s_content)
    for t in titles:
        cleaned = re.sub(r'<[^>]+>', '', t).strip()
        print(f"  [Header] {cleaned}")
        
    badges = re.findall(r'class="slide-badge"[^>]*>([\s\S]*?)</div>', s_content)
    for b in badges:
        cleaned = re.sub(r'<[^>]+>', '', b).strip()
        print(f"  [Badge] {cleaned}")

    paras = re.findall(r'<p[^>]*>([\s\S]*?)</p>', s_content)
    for p in paras:
        cleaned = re.sub(r'<[^>]+>', '', p).strip()
        print(f"  [Para] {cleaned}")
        
    cards = re.findall(r'<div class="glass-card[^"]*"[^>]*>([\s\S]*?)</div>', s_content)
    print(f"  [Cards Count]: {len(cards)}")
    print()
