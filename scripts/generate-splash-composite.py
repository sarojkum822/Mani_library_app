#!/usr/bin/env python3
"""Build assets/images/splash-composite.png: small square logo + app name (matches app.json splash)."""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON = os.path.join(ROOT, "assets/images/icon.png")
OUT = os.path.join(ROOT, "assets/images/splash-composite.png")

W, H = 1284, 2778
BG = (0xE6, 0xF0, 0xFB)
LOGO_BOX = 160
TITLE = "Mani Library"
FONT_SIZE = 44


def load_font() -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/Library/Fonts/Arial.ttf",
    ):
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, FONT_SIZE)
            except OSError:
                continue
    return ImageFont.load_default()


def main() -> int:
    if not os.path.isfile(ICON):
        print(f"Missing icon: {ICON}", file=sys.stderr)
        return 1

    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    font = load_font()

    icon = Image.open(ICON).convert("RGBA")
    icon.thumbnail((LOGO_BOX, LOGO_BOX), Image.Resampling.LANCZOS)
    ix = (W - icon.width) // 2
    iy = int(H * 0.38) - icon.height // 2
    img.paste(icon, (ix, iy), icon)

    bbox = draw.textbbox((0, 0), TITLE, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (W - tw) // 2
    ty = iy + icon.height + 28
    draw.text((tx, ty), TITLE, font=font, fill=(0x11, 0x18, 0x27))

    img.save(OUT, "PNG", optimize=True)
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
