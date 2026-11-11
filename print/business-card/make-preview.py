"""Renders riva-business-card.pdf to riva-business-card-preview.png: both sides, cropped to the trim line.
    python3 print/business-card/make-preview.py        (needs Pillow and poppler's pdftoppm)"""
import os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter

here = os.path.dirname(os.path.abspath(__file__))
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["pdftoppm", "-r", "300", "-png", os.path.join(here, "riva-business-card.pdf"), os.path.join(tmp, "pg")], check=True)
    sides = [Image.open(os.path.join(tmp, f"pg-{i}.png")).convert("RGB") for i in (1, 2)]
bleed = round(.125 * 300)
sides = [im.crop((bleed, bleed, im.width - bleed, im.height - bleed)) for im in sides]   # 1050 x 600 px
pad, (w, h) = 90, sides[0].size
out = Image.new("RGB", (w * 2 + pad * 3, h + pad * 2), (233, 238, 245))
for i, im in enumerate(sides):
    x, y = pad + i * (w + pad), pad
    shadow = Image.new("RGBA", (w + 60, h + 60), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((30, 38, 30 + w, 38 + h), radius=14, fill=(10, 30, 60, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    out.paste(shadow, (x - 30, y - 30), shadow)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=12, fill=255)
    out.paste(im, (x, y), mask)
out.save(os.path.join(here, "riva-business-card-preview.png"), optimize=True)
print("wrote preview", out.size)
