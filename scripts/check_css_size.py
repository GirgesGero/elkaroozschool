with open('scripts/build_huge_text_no_qr.py', encoding='utf-8') as f:
    text = f.read()

print("File size:", len(text))
# Find CSS section
css_start = text.find('<style>')
css_end = text.find('</style>')
print("CSS length:", css_end - css_start)
with open('scripts/css_dump.css', 'w', encoding='utf-8') as out:
    out.write(text[css_start:css_end+8])
print("CSS dumped to scripts/css_dump.css")
