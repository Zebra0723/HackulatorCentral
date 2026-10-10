"""Derive web brand assets from the supplied HACKULATOR logo.

Usage: python3 -I scripts/prepare-brand-assets.py <source-logo-image> <public-dir>

Only removes the flat warm-white background and crops surrounding whitespace;
shapes, colours and proportions of the supplied artwork are untouched in the
light version. The dark version is a PROVISIONAL derivative (near-black
outline/wordmark pixels recoloured to warm white) until the official dark
adaptation is supplied.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), Path(sys.argv[2])
BG = (252, 250, 246)
WARM_WHITE = (247, 245, 240)

im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()

# Colour-to-alpha against the flat background.
rgba = Image.new("RGBA", im.size)
rp = rgba.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        d = max(abs(r - BG[0]), abs(g - BG[1]), abs(b - BG[2]))
        if d <= 10:
            rp[x, y] = (r, g, b, 0)
        elif d < 40:
            a = int(255 * (d - 10) / 30)
            rp[x, y] = (r, g, b, a)
        else:
            rp[x, y] = (r, g, b, 255)

bbox = rgba.getbbox()
pad = 24
box = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, w), min(bbox[3] + pad, h))
light = rgba.crop(box)
light.save(out / "brand/hackulator-logo-light.png", optimize=True)
light.save(out / "brand/hackulator-logo-light.webp", quality=92, method=6)

# Provisional dark adaptation: very dark, low-saturation pixels (outlines,
# wordmark, black pixel squares) become warm white; the charcoal body,
# grey keys and lime accents keep their colours.
dark = light.copy()
dp = dark.load()
for y in range(dark.size[1]):
    for x in range(dark.size[0]):
        r, g, b, a = dp[x, y]
        if a and max(r, g, b) < 18:
            dp[x, y] = (*WARM_WHITE, a)
        elif a and a < 255 and max(r, g, b) < 60:
            dp[x, y] = (*WARM_WHITE, a)
dark.save(out / "brand/hackulator-logo-dark.png", optimize=True)
dark.save(out / "brand/hackulator-logo-dark.webp", quality=92, method=6)

# Icon-only crop (everything above the wordmark) for favicon/OG use.
cols_rows = [y for y in range(light.size[1]) if any(light.getpixel((x, y))[3] for x in range(0, light.size[0], 3))]
# find the transparent gap between icon and wordmark
gap = None
prev = None
for y in cols_rows:
    if prev is not None and y - prev > 6:
        gap = (prev, y)
        break
    prev = y
icon_bottom = gap[0] + 1 if gap else light.size[1] // 2
icon = light.crop((0, 0, light.size[0], icon_bottom))
icon = icon.crop(icon.getbbox())
s = max(icon.size) + 32
sq = Image.new("RGBA", (s, s), (*BG, 255))
sq.alpha_composite(icon, ((s - icon.size[0]) // 2, (s - icon.size[1]) // 2))
sq.resize((512, 512), Image.LANCZOS).save(out.parent / "src/app/icon.png")
sq.resize((180, 180), Image.LANCZOS).save(out.parent / "src/app/apple-icon.png")

# Provisional 4:5 film poster: near-black stage with the dark logo.
PW, PH = 1080, 1350
poster = Image.new("RGB", (PW, PH), (10, 10, 10))
lw = 760
lh = round(dark.size[1] * lw / dark.size[0])
logo = dark.resize((lw, lh), Image.LANCZOS)
poster.paste(logo, ((PW - lw) // 2, (PH - lh) // 2 - 20), logo)
poster.save(out / "media/hackulator-concept-poster.webp", quality=88, method=6)
poster.save(out / "media/hackulator-concept-poster.jpg", quality=86, optimize=True, progressive=True)

print("light", light.size, "icon gap", gap)
