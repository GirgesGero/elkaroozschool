import os
from PIL import Image, ImageDraw, ImageFilter

def build_perfect_template():
    base_img_path = r"C:\Users\Girge\OneDrive\Desktop\WhatsApp Image 2026-09-23 at 5.36.04 PM.jpeg"
    orig = Image.open(base_img_path).convert("RGBA")
    w, h = orig.size

    clean = orig.copy()
    draw = ImageDraw.Draw(clean)

    # 1. Clean Date area (center 255, 185 -> box x in [50..470], y in [135..235])
    for y in range(135, 240):
        ratio = (y - 135) / 105.0
        r = int(240 * (1 - ratio) + 226 * ratio)
        g = int(158 * (1 - ratio) + 132 * ratio)
        b = int(20 * (1 - ratio) + 14 * ratio)
        draw.line([(50, y), (470, y)], fill=(r, g, b, 255))

    # 2. Clean Group Parchment Scroll (center 255, 360 -> box x in [50..470], y in [295..425])
    for y in range(295, 430):
        ratio = (y - 295) / 135.0
        r = int(248 * (1 - ratio) + 230 * ratio)
        g = int(242 * (1 - ratio) + 215 * ratio)
        b = int(230 * (1 - ratio) + 192 * ratio)
        draw.line([(50, y), (470, y)], fill=(r, g, b, 255))
    draw.line([(50, 295), (470, 295)], fill=(210, 195, 170, 255), width=2)
    draw.line([(50, 428), (470, 428)], fill=(195, 175, 150, 255), width=3)

    # 3. Clean Right Column Text Areas (Title 1 at y~1115, Lecturer 1 at y~1240 -> box x in [660..1240], y in [1050..1330])
    for y in range(1050, 1340):
        ratio = (y - 1050) / 290.0
        r = int(145 * (1 - ratio) + 85 * ratio)
        g = int(20 * (1 - ratio) + 6 * ratio)
        b = int(24 * (1 - ratio) + 8 * ratio)
        draw.line([(660, y), (1240, y)], fill=(r, g, b, 255))

    # 4. Clean Left Column Text Areas (Title 2 at y~1115, Lecturer 2 at y~1240 -> box x in [40..620], y in [1050..1330])
    for y in range(1050, 1340):
        ratio = (y - 1050) / 290.0
        r = int(205 * (1 - ratio) + 125 * ratio)
        g = int(118 * (1 - ratio) + 60 * ratio)
        b = int(14 * (1 - ratio) + 5 * ratio)
        draw.line([(40, y), (620, y)], fill=(r, g, b, 255))

    # 5. Extract the metallic ring frames with transparent inner circle
    # Right Ring: center (950, 715), inner radius 180, outer crop size 480x480
    r_crop = orig.crop((950 - 240, 715 - 240, 950 + 240, 715 + 340)) # includes ribbon
    r_mask = Image.new("L", r_crop.size, 255)
    rm_draw = ImageDraw.Draw(r_mask)
    rm_draw.ellipse((240 - 180, 240 - 180, 240 + 180, 240 + 180), fill=0)
    r_ring = r_crop.copy()
    r_ring.putalpha(r_mask)

    # Left Ring: center (330, 715), inner radius 180, outer crop size 480x480
    l_crop = orig.crop((330 - 240, 715 - 240, 330 + 240, 715 + 340)) # includes ribbon
    l_mask = Image.new("L", l_crop.size, 255)
    lm_draw = ImageDraw.Draw(l_mask)
    lm_draw.ellipse((240 - 180, 240 - 180, 240 + 180, 240 + 180), fill=0)
    l_ring = l_crop.copy()
    l_ring.putalpha(l_mask)

    os.makedirs("E:/drive progect/ELKAROOZ SCHOOL/assets/templates", exist_ok=True)
    clean.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/announcement_base.png")
    r_ring.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/ring_right.png")
    l_ring.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/ring_left.png")
    print("Master template assets v3 built successfully.")

if __name__ == "__main__":
    build_perfect_template()
