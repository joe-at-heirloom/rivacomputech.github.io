"""Marks the 1/8 in bleed and the 3.5 x 2 in trim on every page of riva-business-card.pdf
(TrimBox / BleedBox, so print software knows where to cut) and sets the document metadata.
    python3 print/business-card/set-boxes.py        (needs pypdf)"""
import os
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "riva-business-card.pdf")
r = PdfReader(path)
w = PdfWriter()
for page in r.pages:
    W, H = float(page.mediabox.width), float(page.mediabox.height)   # 270 x 162 pt = 3.75 x 2.25 in
    page.bleedbox = RectangleObject([0, 0, W, H])
    page.trimbox = RectangleObject([9, 9, W - 9, H - 9])                # 252 x 144 pt = 3.5 x 2 in
    page.cropbox = RectangleObject([0, 0, W, H])
    w.add_page(page)
w.add_metadata({"/Title": "Riva Computech business card", "/Author": "Riva Computech", "/Subject": "3.5 x 2 in business card, 1/8 in bleed. Page 1: front, page 2: back."})
with open(path, "wb") as f:
    w.write(f)
print("set TrimBox/BleedBox on", len(r.pages), "pages")
