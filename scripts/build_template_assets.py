import os
from PIL import Image, ImageDraw, ImageFilter

def create_clean_template():
    base_img_path = r"C:\Users\Girge\OneDrive\Desktop\WhatsApp Image 2026-09-23 at 5.36.04 PM.jpeg"
    orig = Image.open(base_img_path).convert("RGBA")
    w, h = orig.size

    # 1. Create a clean background by sampling the vertical gradient & wave lines
    # We will clear the text areas and inner photo circles while preserving the header, logo, parchment scroll, and ribbons
    clean = orig.copy()
    draw = ImageDraw.Draw(clean)

    # Let's clean the inner circles for Lecturer 1 and Lecturer 2
    # Circle 1 (Right): center (905, 595), inner radius ~ 195
    # Circle 2 (Left): center (375, 595), inner radius ~ 195
    
    # We can fill inner circle with a sleek dark slate / navy placeholder gradient
    for cx, cy in [(905, 595), (375, 595)]:
        draw.ellipse((cx - 195, cy - 195, cx + 195, cy + 195), fill=(20, 24, 38, 255))

    # Clean the Date area (under "محاضرات الجمعة"): box (60, 160, 480, 235)
    # The background here is golden amber gradient
    for y in range(160, 235):
        ratio = (y - 160) / 75.0
        r = int(235 * (1 - ratio) + 225 * ratio)
        g = int(145 * (1 - ratio) + 130 * ratio)
        b = int(18 * (1 - ratio) + 15 * ratio)
        draw.line([(60, y), (480, y)], fill=(r, g, b, 255))

    # Clean Group Name text on parchment banner: box (70, 265, 460, 355)
    # Parchment color is warm cream #F6EFE2 to #EADCC6
    for y in range(265, 355):
        ratio = (y - 265) / 90.0
        r = int(246 * (1 - ratio) + 234 * ratio)
        g = int(239 * (1 - ratio) + 220 * ratio)
        b = int(226 * (1 - ratio) + 198 * ratio)
        draw.line([(70, y), (460, y)], fill=(r, g, b, 255))

    # Clean Lecture 1 text areas (Right):
    # Title area: (650, 960, 1160, 1070) - Red gradient #A1191E to #861014
    for y in range(960, 1070):
        ratio = (y - 960) / 110.0
        r = int(161 * (1 - ratio) + 134 * ratio)
        g = int(25 * (1 - ratio) + 16 * ratio)
        b = int(30 * (1 - ratio) + 20 * ratio)
        draw.line([(650, y), (1160, y)], fill=(r, g, b, 255))

    # Lecturer 1 name area: (650, 1100, 1160, 1220) - Deep red #7D0C10 to #68080C
    for y in range(1100, 1220):
        ratio = (y - 1100) / 120.0
        r = int(125 * (1 - ratio) + 104 * ratio)
        g = int(12 * (1 - ratio) + 8 * ratio)
        b = int(16 * (1 - ratio) + 12 * ratio)
        draw.line([(650, y), (1160, y)], fill=(r, g, b, 255))

    # Clean Lecture 2 text areas (Left):
    # Title area: (120, 960, 630, 1070) - Amber gradient #E08512 to #C96F0E
    for y in range(960, 1070):
        ratio = (y - 960) / 110.0
        r = int(224 * (1 - ratio) + 201 * ratio)
        g = int(133 * (1 - ratio) + 111 * ratio)
        b = int(18 * (1 - ratio) + 14 * ratio)
        draw.line([(120, y), (630, y)], fill=(r, g, b, 255))

    # Lecturer 2 name area: (120, 1100, 630, 1220) - Dark amber #B85F0A to #9E4D06
    for y in range(1100, 1220):
        ratio = (y - 1100) / 120.0
        r = int(184 * (1 - ratio) + 158 * ratio)
        g = int(95 * (1 - ratio) + 77 * ratio)
        b = int(10 * (1 - ratio) + 6 * ratio)
        draw.line([(120, y), (630, y)], fill=(r, g, b, 255))

    # Re-extract and preserve the ribbons ("المحاضرة الأولى" and "المحاضرة الثانية") so they overlay seamlessly
    # Ribbon 1 (Right): (720, 840, 1090, 950)
    # Ribbon 2 (Left): (190, 840, 560, 950)
    ribbon1 = orig.crop((720, 840, 1090, 950))
    ribbon2 = orig.crop((190, 840, 560, 950))
    clean.paste(ribbon1, (720, 840), ribbon1)
    clean.paste(ribbon2, (190, 840), ribbon2)

    # Save clean template base
    os.makedirs("E:/drive progect/ELKAROOZ SCHOOL/assets/templates", exist_ok=True)
    out_path = "E:/drive progect/ELKAROOZ SCHOOL/assets/templates/announcement_base.png"
    clean.save(out_path, format="PNG")
    print(f"Clean template base saved to: {out_path}")

if __name__ == "__main__":
    create_clean_template()
