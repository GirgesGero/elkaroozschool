"""Generate the PWA icon set from the master logo.

Why this exists
---------------
manifest.json declared /logo.png as both a 192x192 and a 512x512 icon. The file is
actually 723x1024. Browsers validate the declared size against the decoded image and
refuse the install prompt on a mismatch, so the app was not installable -- the one
thing a PWA manifest exists to provide.

Declaring the same file twice also cannot satisfy both sizes even when it is square:
an icon set needs a real 192px and a real 512px variant, because the OS scales the
decoded bitmap rather than re-rasterising it. On a 723x1024 source scaled down to 192,
that is a visibly soft icon.

A maskable icon is cropped to a circle inscribed in the safe zone: Android applies a
mask of its own shape and may crop up to 20% from each edge, so the artwork has to sit
inside the middle 80%. The 'any' variant keeps the full logo on the brand background.
"""

import os
import sys

from PIL import Image, ImageDraw

# PIL re-exports the resampling filters under Image as well as ImageModule; the
# Resampling enum is the documented home for LANCZOS across Pillow versions.
from PIL.Image import Resampling

MASTER = os.path.join(os.path.dirname(__file__), "..", "public", "logo.png")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

# Matches manifest.json's background_color, so a maskable icon has no transparent
# edge for the OS to blend against a mismatched backdrop.
BG = (15, 23, 42)

SIZES = (192, 512)


def contain_on_canvas(logo: Image.Image, size: int, inset: float = 0.0) -> Image.Image:
    """Centre the logo on a square canvas at `size`, optionally with a safe-zone inset."""
    canvas = Image.new("RGB", (size, size), BG)

    box = int(size * (1.0 - inset * 2))
    art = logo.copy()
    art.thumbnail((box, box), Resampling.LANCZOS)

    canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


def as_maskable(icon: Image.Image) -> Image.Image:
    """Knock the corners out to transparent so the OS mask is not double-rounded.

    The manifest lists the maskable icon with `any maskable`, which lets a browser use
    the same file for the plain and the masked case. That only works if the corners are
    already transparent -- otherwise Android's circle mask sits on top of our opaque
    square and the edge shows.
    """
    size = icon.width
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)

    out = icon.convert("RGBA")
    out.putalpha(mask)
    return out


def main() -> int:
    master_path = os.path.normpath(MASTER)
    if not os.path.exists(master_path):
        print(f"FAIL  master logo missing: {master_path}")
        return 1

    logo = Image.open(master_path).convert("RGB")
    print(f"master {logo.width}x{logo.height}  {os.path.getsize(master_path) // 1024} KB")

    os.makedirs(os.path.normpath(OUT_DIR), exist_ok=True)
    made = []

    for size in SIZES:
        plain = contain_on_canvas(logo, size)
        plain_path = os.path.join(OUT_DIR, f"icon-{size}x{size}.png")
        plain.save(plain_path, "PNG", optimize=True)
        made.append((plain_path, plain, False))

        # 20% safe zone on every side, per the maskable icon spec.
        masked = as_maskable(contain_on_canvas(logo, size, inset=0.20))
        masked_path = os.path.join(OUT_DIR, f"icon-{size}x{size}-maskable.png")
        masked.save(masked_path, "PNG", optimize=True)
        made.append((masked_path, masked, True))

    print()
    for path, img, is_masked in made:
        with Image.open(path) as check:
            actual = check.size
        declared = os.path.basename(path)
        if actual[0] != actual[1]:
            print(f"FAIL  {declared} is not square: {actual}")
            return 1
        size = actual[0]
        kind = "maskable" if is_masked else "any"
        print(f"  ok  {declared:28} {size}x{size}  {os.path.getsize(path) // 1024:>4} KB  ({kind})")

    print(f"\n{len(made)} icons written to {os.path.normpath(OUT_DIR)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())