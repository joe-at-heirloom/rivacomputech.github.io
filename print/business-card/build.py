"""Builds Riva Computech's logo lockups and the editable business-card SVGs.

    python3 print/business-card/build.py <path-to-Inter-SemiBold .woff or .ttf>

Writes:
  public/brand/riva-computech-logo.svg        wordmark + COMPUTECH (outlined), brand blue
  public/brand/riva-computech-logo-white.svg  same, white, for dark backgrounds
  print/business-card/riva-business-card-front.svg   editable (live text), 3.75 x 2.25 in incl. bleed
  print/business-card/riva-business-card-back.svg    editable (live text)

Needs fontTools (pip install fonttools). The card SVGs keep live text in Inter, so they stay editable;
make-pdf.cjs turns them into the print PDF with the fonts embedded.
"""
import re, sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "print", "business-card")
BRAND = os.path.join(ROOT, "public", "brand")

BLUE, INK, SLATE = "#0067c0", "#0b1b30", "#5c6b80"
SANS = "Inter, 'Segoe UI', Arial, sans-serif"

# ── the riva wordmark (paths from public/brand/riva-logo.svg; artwork bounds 85 56 1579 815) ──
logo_src = open(os.path.join(BRAND, "riva-logo.svg")).read()
PATHS = "".join(f'<path d="{d}"/>' for d in re.findall(r'<path d="([^"]+)"', logo_src))
WX, WY, WW, WH = 85, 56, 1579, 815


def wordmark(x, y, width, fill):
    """The wordmark placed with its top-left at (x, y), scaled to `width`."""
    s = width / WW
    return f'<g fill="{fill}" transform="translate({x - WX * s:.3f} {y - WY * s:.3f}) scale({s:.6f})">{PATHS}</g>'


# ── "COMPUTECH" as outlines, tracked to span the wordmark exactly ──
def outlined(text, font_path, size, target_width):
    f = TTFont(font_path)
    upm = f["head"].unitsPerEm
    cmap, gs, hmtx = f.getBestCmap(), f.getGlyphSet(), f["hmtx"]
    names = [cmap[ord(c)] for c in text]
    scale = size / upm
    natural = sum(hmtx[n][0] for n in names) * scale
    # tracking between letters so the word spans target_width
    track = (target_width - natural) / (len(names) - 1)
    d, x = [], 0.0
    for n in names:
        pen = SVGPathPen(gs)
        gs[n].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        d.append(pen.getCommands())
        x += hmtx[n][0] * scale + track
    cap = f["OS/2"].sCapHeight * scale
    return " ".join(d), cap


def lockups(font_path):
    gap, size = 130, 185                       # same proportions as the site header
    d, cap = outlined("COMPUTECH", font_path, size, WW - 18)
    h = WH + gap + cap
    for name, word, sub, op in (("riva-computech-logo.svg", BLUE, SLATE, 1), ("riva-computech-logo-white.svg", "#fff", "#fff", .8)):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WW} {h:.0f}" width="{WW}" height="{h:.0f}" role="img" aria-label="Riva Computech">'
               f'{wordmark(0, 0, WW, word)}'
               f'<path fill="{sub}" fill-opacity="{op}" transform="translate(4 {WH + gap + cap:.2f})" d="{d}"/></svg>\n')
        open(os.path.join(BRAND, name), "w").write(svg)
    return h


# ── the business card ─────────────────────────────────────────────────────────────────────────
# Units are points (72/in). Canvas = 3.75 x 2.25 in (270 x 162 pt) including 1/8 in (9 pt) bleed.
# Trim = 3.5 x 2 in (US standard). Keep text inside the safe area (1/8 in inside the trim).
W, H, B = 270, 162, 9
TRIM = (B, B, W - 2 * B, H - 2 * B)
SAFE = (2 * B, 2 * B, W - 4 * B, H - 4 * B)
BAND = B + 12   # back's blue base band: 12 pt (~1/6 in) visible after trimming, so cutting drift doesn't show
PETAL = "M0 0C64-118 196-292 158-498C92-470 18-398-22-300C-58-206-42-84 0 0Z"
ICONS = {  # 24x24 line icons from the site
    "phone": '<path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>',
    "mail": '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 7.5l8 5.5 8-5.5"/>',
    "web": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
}


def head(title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" '
            f'width="3.75in" height="2.25in" viewBox="0 0 {W} {H}">\n'
            f'<title>{title}</title>\n'
            '<!-- 3.5 x 2 in business card with 1/8 in bleed on every side (canvas 3.75 x 2.25 in).\n'
            '     Background art runs to the canvas edge; keep text inside the safe area (see the hidden "Guides" layer).\n'
            '     Text is live and set in Inter (free: fonts.google.com/specimen/Inter). -->\n')


def guides():
    t, s = TRIM, SAFE
    return ('<g id="guides" inkscape:groupmode="layer" inkscape:label="Guides (hidden: trim + safe area)" style="display:none">'
            f'<rect x="{t[0]}" y="{t[1]}" width="{t[2]}" height="{t[3]}" fill="none" stroke="#ff00ff" stroke-width=".5"/>'
            f'<rect x="{s[0]}" y="{s[1]}" width="{s[2]}" height="{s[3]}" fill="none" stroke="#00c8ff" stroke-width=".5" stroke-dasharray="2 2"/></g>\n')


def front():
    lw = 120; lh = lw * WH / WW
    sub_gap, sub_size = 10, 7.4
    total = lh + sub_gap + sub_size * .73
    top = (H - total) / 2 - 6
    petals = "".join(f'<use href="#petal" transform="rotate({r}) scale({sc})" fill="{c}" fill-opacity="{o}"/>'
                     for r, sc, c, o in ((-100, .22, "#2b8be6", .55), (-72, .26, "#1a7ad6", .6), (-44, .24, "#2b8be6", .5), (-16, .2, "#5aa9f0", .35)))
    return (head("Riva Computech business card, front") +
            f'<defs><path id="petal" d="{PETAL}"/></defs>\n'
            '<g id="artwork" inkscape:groupmode="layer" inkscape:label="Artwork">\n'
            f'  <rect width="{W}" height="{H}" fill="{BLUE}"/>\n'
            f'  <g transform="translate({W - 4} {H + 6})">{petals}</g>\n'
            f'  {wordmark((W - lw) / 2, top, lw, "#fff")}\n'
            '</g>\n'
            '<g id="text" inkscape:groupmode="layer" inkscape:label="Text">\n'
            f'  <text x="{W / 2 + 1.2}" y="{top + lh + sub_gap + sub_size * .73:.2f}" text-anchor="middle" font-family="{SANS}" font-weight="600" '
            f'font-size="{sub_size}" letter-spacing="{sub_size * .3:.2f}" fill="#fff" fill-opacity=".85">COMPUTECH</text>\n'
            f'  <text x="{W / 2}" y="{H - 2 * B - 3}" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="6.5" '
            f'letter-spacing=".3" fill="#fff" fill-opacity=".75">rivacomputech.com</text>\n'
            '</g>\n' + guides() + '</svg>\n')


def back():
    x0 = 2 * B + 6
    rows = (("phone", "+1 (313) 405-7164"), ("mail", "rivacomputech@gmail.com"), ("web", "rivacomputech.com"))
    lw = 46; lh = lw * WH / WW
    out = (head("Riva Computech business card, back") +
           '<g id="artwork" inkscape:groupmode="layer" inkscape:label="Artwork">\n'
           f'  <rect width="{W}" height="{H}" fill="#fff"/>\n'
           f'  <rect x="0" y="{H - BAND}" width="{W}" height="{BAND}" fill="{BLUE}"/>\n'
           f'  {wordmark(W - 2 * B - 6 - lw, 2 * B + 6, lw, BLUE)}\n'
           f'  <rect x="{x0}" y="66" width="18" height="1.6" rx=".8" fill="{BLUE}"/>\n')
    for i, (ic, _) in enumerate(rows):
        y = 80 + i * 15
        out += (f'  <g transform="translate({x0} {y - 7.2}) scale(.36)" fill="none" stroke="{BLUE}" stroke-width="2" '
                f'stroke-linecap="round" stroke-linejoin="round">{ICONS[ic]}</g>\n')
    out += ('</g>\n<g id="text" inkscape:groupmode="layer" inkscape:label="Text">\n'
            f'  <text x="{x0}" y="46" font-family="{SANS}" font-weight="700" font-size="13.5" letter-spacing="-.2" fill="{INK}">Devik Patel</text>\n'
            f'  <text x="{x0}" y="58" font-family="{SANS}" font-weight="500" font-size="7.4" fill="{SLATE}">Owner &amp; senior engineer</text>\n')
    for i, (_, t) in enumerate(rows):
        out += f'  <text x="{x0 + 13}" y="{80 + i * 15}" font-family="{SANS}" font-weight="500" font-size="7.6" fill="{INK}">{t}</text>\n'
    out += (f'  <text x="{x0}" y="{H - BAND - 10}" font-family="{SANS}" font-weight="700" font-size="5.4" letter-spacing=".7" fill="{BLUE}">'
            'MICROSOFT 365 · AZURE · INFRASTRUCTURE</text>\n'
            '</g>\n' + guides() + '</svg>\n')
    return out


if __name__ == "__main__":
    h = lockups(sys.argv[1])
    open(os.path.join(OUT, "riva-business-card-front.svg"), "w").write(front())
    open(os.path.join(OUT, "riva-business-card-back.svg"), "w").write(back())
    print("lockup height", round(h), "· wrote card SVGs to", OUT)
