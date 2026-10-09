import os
from PIL import Image, ImageDraw, ImageFilter

def reconstruct_master_template():
    base_img_path = r"C:\Users\Girge\OneDrive\Desktop\WhatsApp Image 2026-09-23 at 5.36.04 PM.jpeg"
    orig = Image.open(base_img_path).convert("RGBA")
    w, h = orig.size  # 1280 x 1600

    # 1. Create a pristine 1280x1600 background gradient matching the original
    # Left is golden yellow, Right is deep burgundy red
    bg = Image.new("RGBA", (w, h))
    bg_draw = ImageDraw.Draw(bg)

    for x in range(w):
        t = x / float(w)
        # Smooth sigmoid curve for gradient transition in center
        blend = 1.0 / (1.0 + pow(2.71828, -8.0 * (t - 0.48)))
        # Left color: Amber Gold (#F2A31B at top, #DC7D10 at bottom)
        # Right color: Deep Crimson Red (#A81C21 at top, #650A0E at bottom)
        r_col = int(242 * (1 - blend) + 168 * blend)
        g_col = int(163 * (1 - blend) + 28 * blend)
        b_col = int(27 * (1 - blend) + 33 * blend)
        bg_draw.line([(x, 0), (x, h)], fill=(r_col, g_col, b_col, 255))

    # Add vertical shading (top lighting to darker bottom)
    shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shade)
    for y in range(h):
        alpha = int(120 * (y / float(h)) ** 1.5)
        s_draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
    bg = Image.alpha_composite(bg, shade)

    # 2. Extract and composite the clean Header Artwork from original:
    # 2a. St. Mark Crest & Logo (Top Right: x in [560, 1280], y in [0, 480])
    crest_crop = orig.crop((560, 0, 1280, 480))
    bg.paste(crest_crop, (560, 0), crest_crop)

    # 2b. "محاضرات الجمعة" Header (Top Left: x in [60, 520], y in [20, 150])
    # Extract only the text "محاضرات الجمعة"
    header_crop = orig.crop((60, 20, 520, 155))
    bg.paste(header_crop, (60, 20), header_crop)

    # 2c. Clean Parchment Scroll for Group Name:
    # We crop the parchment scroll from orig (40, 260, 520, 450) and clone its clean texture
    scroll_crop = orig.crop((40, 260, 520, 450))
    # Inpaint text out of scroll_crop using clean parchment color
    s_clean = scroll_crop.copy()
    s_draw = ImageDraw.Draw(s_clean)
    for y in range(25, 160):
        ratio = y / 160.0
        r_c = int(248 * (1 - ratio) + 228 * ratio)
        g_c = int(242 * (1 - ratio) + 210 * ratio)
        b_c = int(230 * (1 - ratio) + 188 * ratio)
        s_draw.line([(30, y), (440, y)], fill=(r_c, g_c, b_c, 255))
    s_draw.line([(30, 25), (440, 25)], fill=(210, 195, 170, 255), width=2)
    s_draw.line([(30, 158), (440, 158)], fill=(195, 175, 150, 255), width=3)
    bg.paste(s_clean, (40, 260), s_clean)

    # 3. Extract Metallic Rings & Ribbons:
    # In the original image:
    # Right Center: (950, 715)
    # Left Center: (330, 715)
    # Right Ring: (950-240, 715-240, 950+240, 715+340) -> size 480 x 580
    r_crop = orig.crop((950 - 240, 715 - 240, 950 + 240, 715 + 340))
    r_alpha = r_crop.copy()
    r_mask = Image.new("L", r_crop.size, 255)
    rm_d = ImageDraw.Draw(r_mask)
    rm_d.ellipse((240 - 180, 240 - 180, 240 + 180, 240 + 180), fill=0) # transparent inner circle
    r_alpha.putalpha(r_mask)

    # Left Ring: (330-240, 715-240, 330+240, 715+340) -> size 480 x 580
    l_crop = orig.crop((330 - 240, 715 - 240, 330 + 240, 715 + 340))
    l_alpha = l_crop.copy()
    l_mask = Image.new("L", l_crop.size, 255)
    lm_d = ImageDraw.Draw(l_mask)
    lm_d.ellipse((240 - 180, 240 - 180, 240 + 180, 240 + 180), fill=0) # transparent inner circle
    l_alpha.putalpha(l_mask)

    # Save assets
    os.makedirs("E:/drive progect/ELKAROOZ SCHOOL/assets/templates", exist_ok=True)
    bg.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/announcement_base.png")
    r_alpha.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/ring_right.png")
    l_alpha.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/ring_left.png")
    print("[SUCCESS] Pristine master template and ring overlays reconstructed.")

if __name__ == "__main__":
    reconstruct_master_template()
