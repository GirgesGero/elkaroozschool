import os
from PIL import Image, ImageDraw, ImageFilter

def build_pristine_template():
    base_img_path = r"C:\Users\Girge\OneDrive\Desktop\WhatsApp Image 2026-09-23 at 5.36.04 PM.jpeg"
    orig = Image.open(base_img_path).convert("RGBA")
    w, h = orig.size

    # Start with a pristine copy
    clean = orig.copy()
    draw = ImageDraw.Draw(clean)

    # 1. Clean the Date area (box from x=40 to x=490, y=140 to y=240)
    # The background is the warm yellow/amber radial/linear gradient
    # We interpolate horizontally and vertically based on adjacent clean pixels
    for y in range(140, 245):
        ratio_y = (y - 140) / 105.0
        r = int(240 * (1 - ratio_y) + 226 * ratio_y)
        g = int(158 * (1 - ratio_y) + 132 * ratio_y)
        b = int(20 * (1 - ratio_y) + 14 * ratio_y)
        draw.line([(40, y), (490, y)], fill=(r, g, b, 255))

    # 2. Clean the Parchment Banner for Group Name (box x=50 to x=470, y=255 to y=365)
    # Parchment texture has a warm gradient from #FAF4EC at top to #E6D7BD at bottom
    # with a slight dark bevel on the left and right edges
    for y in range(255, 365):
        ratio = (y - 255) / 110.0
        r = int(248 * (1 - ratio) + 232 * ratio)
        g = int(242 * (1 - ratio) + 218 * ratio)
        b = int(230 * (1 - ratio) + 195 * ratio)
        draw.line([(50, y), (470, y)], fill=(r, g, b, 255))

    # Add subtle parchment shadow borders to preserve the 3D scroll feel
    draw.line([(50, 255), (470, 255)], fill=(210, 195, 170, 255), width=2)
    draw.line([(50, 363), (470, 363)], fill=(195, 175, 150, 255), width=3)

    # 3. Clean Right Column (Lecture 1) text area (x=640 to x=1180, y=950 to y=1250)
    # Red gradient from #9B161B at y=950 to #60080B at y=1250
    for y in range(950, 1260):
        ratio = (y - 950) / 310.0
        r = int(158 * (1 - ratio) + 94 * ratio)
        g = int(24 * (1 - ratio) + 8 * ratio)
        b = int(28 * (1 - ratio) + 11 * ratio)
        draw.line([(640, y), (1180, y)], fill=(r, g, b, 255))

    # 4. Clean Left Column (Lecture 2) text area (x=100 to x=640, y=950 to y=1250)
    # Amber gradient from #D97E11 at y=950 to #8C4405 at y=1250
    for y in range(950, 1260):
        ratio = (y - 950) / 310.0
        r = int(218 * (1 - ratio) + 138 * ratio)
        g = int(127 * (1 - ratio) + 68 * ratio)
        b = int(17 * (1 - ratio) + 6 * ratio)
        draw.line([(100, y), (640, y)], fill=(r, g, b, 255))

    # 5. Re-apply the crisp ribbons ("المحاضرة الأولى" and "المحاضرة الثانية")
    # Ribbon 1 (Right): crop from original at (720, 835, 1090, 955)
    # Ribbon 2 (Left): crop from original at (190, 835, 560, 955)
    ribbon1 = orig.crop((720, 835, 1090, 955))
    ribbon2 = orig.crop((190, 835, 560, 955))
    clean.paste(ribbon1, (720, 835), ribbon1)
    clean.paste(ribbon2, (190, 835), ribbon2)

    # Save master pristine plate
    os.makedirs("E:/drive progect/ELKAROOZ SCHOOL/assets/templates", exist_ok=True)
    out_path = "E:/drive progect/ELKAROOZ SCHOOL/assets/templates/announcement_base.png"
    clean.save(out_path, format="PNG")
    print(f"Master pristine base saved to: {out_path}")

if __name__ == "__main__":
    build_pristine_template()
