import os
from PIL import Image, ImageDraw, ImageFilter

def reconstruct_clean_template():
    base_img_path = r"C:\Users\Girge\OneDrive\Desktop\WhatsApp Image 2026-09-23 at 5.36.04 PM.jpeg"
    orig = Image.open(base_img_path).convert("RGBA")
    w, h = orig.size  # 1280 x 1600

    # 1. Base Gradient Canvas (1280 x 1600)
    bg = Image.new("RGBA", (w, h))
    bg_draw = ImageDraw.Draw(bg)

    for x in range(w):
        t = x / float(w)
        blend = 1.0 / (1.0 + pow(2.71828, -7.5 * (t - 0.48)))
        r_col = int(242 * (1 - blend) + 165 * blend)
        g_col = int(160 * (1 - blend) + 26 * blend)
        b_col = int(25 * (1 - blend) + 30 * blend)
        bg_draw.line([(x, 0), (x, h)], fill=(r_col, g_col, b_col, 255))

    # Add lighting shade
    shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shade)
    for y in range(h):
        alpha = int(130 * (y / float(h)) ** 1.6)
        s_draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
    bg = Image.alpha_composite(bg, shade)

    # 2. Header Artwork
    # 2a. St. Mark Crest (Top Right)
    crest = orig.crop((580, 0, 1280, 460))
    bg.paste(crest, (580, 0), crest)

    # 2b. "محاضرات الجمعة" (Top Left, strictly y in [25, 120])
    header = orig.crop((80, 25, 500, 120))
    bg.paste(header, (80, 25), header)

    # 2c. Parchment Scroll for Group Name:
    # Scroll box is (40, 250, 520, 450)
    scroll_crop = orig.crop((40, 250, 520, 450))
    s_clean = scroll_crop.copy()
    s_draw = ImageDraw.Draw(s_clean)
    # Paint clean parchment background inside the scroll
    for y in range(30, 165):
        ratio = y / 165.0
        r_c = int(248 * (1 - ratio) + 228 * ratio)
        g_c = int(242 * (1 - ratio) + 210 * ratio)
        b_c = int(230 * (1 - ratio) + 188 * ratio)
        s_draw.line([(35, y), (435, y)], fill=(r_c, g_c, b_c, 255))
    s_draw.line([(35, 30), (435, 30)], fill=(210, 195, 170, 255), width=2)
    s_draw.line([(35, 163), (435, 163)], fill=(195, 175, 150, 255), width=3)
    bg.paste(s_clean, (40, 250), s_clean)

    # 3. Extract Metallic Rings & Ribbons:
    # Right Circle Center: (930, 690), radius: 210
    # Ring crop: (930 - 240, 690 - 240, 930 + 240, 690 + 350) -> 480 x 590
    r_crop = orig.crop((930 - 240, 690 - 240, 930 + 240, 690 + 350))
    r_alpha = r_crop.copy()
    r_mask = Image.new("L", r_crop.size, 255)
    rm_d = ImageDraw.Draw(r_mask)
    rm_d.ellipse((240 - 200, 240 - 200, 240 + 200, 240 + 200), fill=0) # transparent inner circle
    r_alpha.putalpha(r_mask)

    # Left Circle Center: (350, 690), radius: 210
    l_crop = orig.crop((350 - 240, 690 - 240, 350 + 240, 690 + 350))
    l_alpha = l_crop.copy()
    l_mask = Image.new("L", l_crop.size, 255)
    lm_d = ImageDraw.Draw(l_mask)
    lm_d.ellipse((240 - 200, 240 - 200, 240 + 200, 240 + 200), fill=0) # transparent inner circle
    l_alpha.putalpha(l_mask)

    # Save reconstructed template
    os.makedirs("E:/drive progect/ELKAROOZ SCHOOL/assets/templates", exist_ok=True)
    bg.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/announcement_base.png")
    r_alpha.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/ring_right.png")
    l_alpha.save("E:/drive progect/ELKAROOZ SCHOOL/assets/templates/ring_left.png")
    print("[SUCCESS] Template v4 reconstructed with exact coordinates.")

if __name__ == "__main__":
    reconstruct_clean_template()
