import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('presentation/index.html', encoding='utf-8') as f:
    text = f.read()

idx = text.find('id="slide-9"')
print(text[idx:idx+1500])
