import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Read current build script
with open('scripts/build_luxurious_presentation.py', 'r', encoding='utf-8') as f:
    code = f.read()

print("Current build script length:", len(code))
