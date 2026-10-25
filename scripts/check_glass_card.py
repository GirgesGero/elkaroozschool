with open('scripts/build_luxurious_presentation.py', encoding='utf-8') as f:
    text = f.read()

import re
idx = text.find('.glass-card {')
if idx != -1:
    print(text[idx:idx+400])
else:
    print('Not found exact')
