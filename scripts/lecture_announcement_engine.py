import os
import sys
import math
import uuid
import datetime
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont, ImageFilter

CREST_PATH = "E:/drive progect/ELKAROOZ SCHOOL/assets/templates/crest_st_mark.png"
OUTPUT_DIR = "E:/drive progect/ELKAROOZ SCHOOL/public/uploads/announcements"
FONT_DIR = "C:/Windows/Fonts"

def get_arabic_font(size, bold=True):
    font_names = ["arialbd.ttf" if bold else "arial.ttf", "tahomabd.ttf", "majallab.ttf", "segoeuib.ttf"]
    for fn in font_names:
        fp = os.path.join(FONT_DIR, fn)
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()

def shape_arabic(text):
    if not text:
        return ""
    reshaped = arabic_reshaper.reshape(str(text))
    return get_display(reshaped)

def fit_text_font(text, max_width, initial_size, min_size=20, bold=True):
    size = initial_size
    while size >= min_size:
        font = get_arabic_font(size, bold=bold)
        shaped = shape_arabic(text)
        bbox = font.getbbox(shaped)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            return font, size, shaped
        size -= 2
    return get_arabic_font(min_size, bold=bold), min_size, shape_arabic(text)

def draw_text_with_outline_and_shadow(
    draw,
    text,
    center_x,
    center_y,
    font,
    fill_color=(255, 255, 255, 255),
    stroke_color=(0, 0, 0, 255),
    stroke_width=4,
    shadow_offset=(3, 3),
    shadow_color=(0, 0, 0, 220)
):
    shaped = shape_arabic(text)
    bbox = font.getbbox(shaped)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = center_x - w / 2 - bbox[0]
    y = center_y - h / 2 - bbox[1]

    # Shadow
    if shadow_offset and shadow_color:
        sx = x + shadow_offset[0]
        sy = y + shadow_offset[1]
        draw.text((sx, sy), shaped, font=font, fill=shadow_color, stroke_width=stroke_width + 1, stroke_fill=shadow_color)

    # Main text with outline
    draw.text((x, y), shaped, font=font, fill=fill_color, stroke_width=stroke_width, stroke_fill=stroke_color)

def draw_parchment_ribbon(draw, center_x, center_y, width=320, height=64, text="", font=None, text_color=(20, 20, 20, 255)):
    # Draw realistic parchment ribbon with banner fold tails
    left = center_x - width // 2
    top = center_y - height // 2
    right = center_x + width // 2
    bottom = center_y + height // 2

    # Ribbon background (warm ivory/parchment with subtle shadow)
    draw.rectangle([left - 4, top - 2, right + 4, bottom + 4], fill=(0, 0, 0, 100)) # shadow
    draw.rectangle([left, top, right, bottom], fill=(247, 242, 230, 255), outline=(180, 160, 130, 255), width=2)
    # Inner border line
    draw.rectangle([left + 4, top + 4, right - 4, bottom - 4], outline=(210, 195, 170, 255), width=1)

    # Folded ribbon tails on left and right
    draw.polygon([(left, top), (left - 18, center_y), (left, bottom)], fill=(225, 215, 195, 255), outline=(160, 140, 110, 255))
    draw.polygon([(right, top), (right + 18, center_y), (right, bottom)], fill=(225, 215, 195, 255), outline=(160, 140, 110, 255))

    if text and font:
        shaped = shape_arabic(text)
        bbox = font.getbbox(shaped)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = center_x - tw / 2 - bbox[0]
        ty = center_y - th / 2 - bbox[1]
        draw.text((tx, ty), shaped, font=font, fill=text_color)

def draw_chrome_ring(draw, center_x, center_y, radius=190):
    # Multi-layered 3D metallic chrome ring
    # Outer drop shadow
    draw.ellipse([center_x - radius - 18, center_y - radius - 18, center_x + radius + 18, center_y + radius + 18], fill=(0, 0, 0, 80))
    # Layer 1: Dark chrome outer ring
    draw.ellipse([center_x - radius - 14, center_y - radius - 14, center_x + radius + 14, center_y + radius + 14], fill=(71, 85, 105, 255))
    # Layer 2: Bright silver bevel
    draw.ellipse([center_x - radius - 9, center_y - radius - 9, center_x + radius + 9, center_y + radius + 9], fill=(226, 232, 240, 255))
    # Layer 3: Polished platinum highlight
    draw.ellipse([center_x - radius - 4, center_y - radius - 4, center_x + radius + 4, center_y + radius + 4], fill=(148, 163, 184, 255))
    # Layer 4: Inner silver edge
    draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], fill=(203, 213, 225, 255))

def process_lecturer_photo(img_input, target_diameter=370):
    if img_input is None or not (isinstance(img_input, str) and os.path.exists(img_input)):
        placeholder = Image.new("RGBA", (target_diameter, target_diameter), (0, 0, 0, 0))
        pdraw = ImageDraw.Draw(placeholder)
        cx, cy = target_diameter // 2, target_diameter // 2

        # Draw smooth dark blue-gray circle background
        pdraw.ellipse((0, 0, target_diameter, target_diameter), fill=(18, 24, 38, 255))
        # Draw golden cross and rays
        pdraw.ellipse((cx - 65, cy - 65, cx + 65, cy + 65), outline=(197, 160, 89, 180), width=3)
        pdraw.line([(cx, cy - 45), (cx, cy + 45)], fill=(225, 190, 110, 230), width=6)
        pdraw.line([(cx - 30, cy - 18), (cx + 30, cy - 18)], fill=(225, 190, 110, 230), width=6)
        return placeholder

    try:
        im = Image.open(img_input).convert("RGBA")
        w, h = im.size
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        im_cropped = im.crop((left, top, left + min_dim, top + min_dim))
        im_resized = im_cropped.resize((target_diameter, target_diameter), Image.Resampling.LANCZOS)

        # Smooth circular alpha mask
        mask = Image.new("L", (target_diameter, target_diameter), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.ellipse((0, 0, target_diameter, target_diameter), fill=255)
        im_resized.putalpha(mask)
        return im_resized
    except Exception as e:
        print(f"Warning: Failed to process lecturer image ({e}), using placeholder.")
        return process_lecturer_photo(None, target_diameter)

def generate_lecture_announcement_graphic(
    group_name: str,
    friday_date: str,
    lecture_1_title: str,
    lecture_1_lecturer_name: str,
    lecture_1_lecturer_title: str = "",
    lecture_1_image: str = None,
    lecture_2_title: str = "",
    lecture_2_lecturer_name: str = "",
    lecture_2_lecturer_title: str = "",
    lecture_2_image: str = None,
    output_filename: str = None
) -> str:
    w, h = 1280, 1600
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. High-Resolution Dual Tone Background Gradient
    canvas = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(canvas)

    for x in range(w):
        t = x / float(w)
        blend = 1.0 / (1.0 + pow(2.71828, -7.5 * (t - 0.48)))
        # Left: Warm Golden Amber (#F2A31B -> #E08512)
        # Right: Deep Church Crimson (#AC1E23 -> #780C10)
        r_col = int(242 * (1 - blend) + 172 * blend)
        g_col = int(163 * (1 - blend) + 30 * blend)
        b_col = int(27 * (1 - blend) + 35 * blend)
        draw.line([(x, 0), (x, h)], fill=(r_col, g_col, b_col, 255))

    # Add soft top lighting & bottom vignette
    shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shade)
    for y in range(h):
        alpha = int(120 * (y / float(h)) ** 1.6)
        s_draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
    canvas = Image.alpha_composite(canvas, shade)
    draw = ImageDraw.Draw(canvas)

    # 2. Composite Church Crest on Top Right (x=580, y=0)
    if os.path.exists(CREST_PATH):
        crest = Image.open(CREST_PATH).convert("RGBA")
        canvas.paste(crest, (580, 0), crest)

    # 3. Top Left Section:
    # 3a. "محاضرات الجمعة" (Center X: 290, Y: 75)
    hdr_font = get_arabic_font(56, bold=True)
    draw_text_with_outline_and_shadow(
        draw,
        "محاضرات الجمعة",
        center_x=290,
        center_y=75,
        font=hdr_font,
        fill_color=(255, 255, 255, 255),
        stroke_color=(0, 0, 0, 255),
        stroke_width=5
    )

    # 3b. Friday Date (Center X: 290, Y: 165)
    date_font = get_arabic_font(46, bold=True)
    draw_text_with_outline_and_shadow(
        draw,
        friday_date,
        center_x=290,
        center_y=165,
        font=date_font,
        fill_color=(255, 255, 255, 255),
        stroke_color=(0, 0, 0, 255),
        stroke_width=5
    )

    # 3c. Group Parchment Banner (Center X: 290, Y: 275)
    draw_parchment_ribbon(
        draw,
        center_x=290,
        center_y=275,
        width=380,
        height=72,
        text=group_name,
        font=get_arabic_font(42, bold=True),
        text_color=(180, 115, 10, 255) # Rich amber text
    )

    # 4. Middle Lecture Layout:
    # Right Column Center: (930, 680)
    # Left Column Center: (350, 680)

    # 4a. Draw Chrome Rings
    draw_chrome_ring(draw, 930, 680, radius=185)
    draw_chrome_ring(draw, 350, 680, radius=185)

    # 4b. Paste Circular Lecturer Photos inside rings
    p1 = process_lecturer_photo(lecture_1_image, target_diameter=365)
    canvas.paste(p1, (930 - 182, 680 - 182), p1)

    p2 = process_lecturer_photo(lecture_2_image, target_diameter=365)
    canvas.paste(p2, (350 - 182, 680 - 182), p2)

    # 4c. Draw Lecture Number Ribbons at bottom of each circle (Y: 875)
    ribbon_font = get_arabic_font(34, bold=True)
    draw_parchment_ribbon(draw, center_x=930, center_y=875, width=290, height=52, text="المحاضرة الأولي", font=ribbon_font)
    draw_parchment_ribbon(draw, center_x=350, center_y=875, width=290, height=52, text="المحاضرة الثانية", font=ribbon_font)

    # 5. Lecture Titles & Lecturer Names:
    # 5a. Lecture 1 (Right Column: X = 930)
    # Title at Y ~ 1010
    l1_title_font, _, _ = fit_text_font(lecture_1_title, max_width=510, initial_size=46, min_size=26, bold=True)
    draw_text_with_outline_and_shadow(
        draw,
        lecture_1_title,
        center_x=930,
        center_y=1010,
        font=l1_title_font,
        fill_color=(255, 255, 255, 255),
        stroke_color=(0, 0, 0, 255),
        stroke_width=5,
        shadow_offset=(4, 4)
    )

    # Speaker at Y ~ 1130
    l1_full = f"( {lecture_1_lecturer_name} )" if not lecture_1_lecturer_name.startswith("(") else lecture_1_lecturer_name
    l1_name_font, _, _ = fit_text_font(l1_full, max_width=510, initial_size=40, min_size=24, bold=True)
    draw_text_with_outline_and_shadow(
        draw,
        l1_full,
        center_x=930,
        center_y=1130,
        font=l1_name_font,
        fill_color=(255, 255, 255, 255),
        stroke_color=(0, 0, 0, 255),
        stroke_width=4,
        shadow_offset=(3, 3)
    )

    # 5b. Lecture 2 (Left Column: X = 350)
    # Title at Y ~ 1010
    l2_title_font, _, _ = fit_text_font(lecture_2_title, max_width=510, initial_size=46, min_size=26, bold=True)
    draw_text_with_outline_and_shadow(
        draw,
        lecture_2_title,
        center_x=350,
        center_y=1010,
        font=l2_title_font,
        fill_color=(255, 255, 255, 255),
        stroke_color=(0, 0, 0, 255),
        stroke_width=5,
        shadow_offset=(4, 4)
    )

    # Speaker at Y ~ 1130
    l2_full = f"( {lecture_2_lecturer_name} )" if not lecture_2_lecturer_name.startswith("(") else lecture_2_lecturer_name
    l2_name_font, _, _ = fit_text_font(l2_full, max_width=510, initial_size=40, min_size=24, bold=True)
    draw_text_with_outline_and_shadow(
        draw,
        l2_full,
        center_x=350,
        center_y=1130,
        font=l2_name_font,
        fill_color=(255, 255, 255, 255),
        stroke_color=(0, 0, 0, 255),
        stroke_width=4,
        shadow_offset=(3, 3)
    )

    # Save final JPG
    if not output_filename:
        output_filename = f"announcement_{uuid.uuid4().hex[:12]}.jpg"

    output_path = os.path.join(OUTPUT_DIR, output_filename)
    final_rgb = canvas.convert("RGB")
    final_rgb.save(output_path, format="JPEG", quality=96)
    print(f"[SUCCESS] Graphic announcement generated: {output_path}")
    return output_path

if __name__ == "__main__":
    test_out = generate_lecture_announcement_graphic(
        group_name="الفرقة الأولى",
        friday_date="2026 / 9 / 25",
        lecture_1_title="الخلفيات العشرة",
        lecture_1_lecturer_name="أ / عماد رمزي",
        lecture_2_title="الوحي الإلهي",
        lecture_2_lecturer_name="القمص موريس",
        output_filename="announcement_perfect_v1.jpg"
    )
    print(f"Sample generated at: {test_out}")
