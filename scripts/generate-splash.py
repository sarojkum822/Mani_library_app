#!/usr/bin/env python3
"""Build assets/images/splash.png: brand nav logo centered on app splash background."""
from __future__ import annotations

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, "assets/images/brand-navlogo.png")
OUT = os.path.join(ROOT, "assets/images/splash.png")
W, H = 1080, 1920
BG = (0xE6, 0xF0, 0xFB)
# Logo source is ~300px wide — upscale with side padding so nothing is clipped on device.
MAX_LOGO_W = int(W * 0.68)


def key_black_to_alpha(logo: Image.Image) -> Image.Image:
    """Nav logo PNGs often ship on black; key so splash/app use brand background only."""
    out = logo.convert("RGBA")
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a > 0 and r < 40 and g < 40 and b < 40:
                px[x, y] = (r, g, b, 0)
    return out


def scale_logo(logo: Image.Image, max_width: int) -> Image.Image:
    scale = max_width / logo.width
    return logo.resize(
        (max(1, int(logo.width * scale)), max(1, int(logo.height * scale))),
        Image.Resampling.LANCZOS,
    )


def main() -> int:
    if not os.path.isfile(LOGO):
        print(f"Missing logo: {LOGO}", file=sys.stderr)
        return 1

    logo = key_black_to_alpha(Image.open(LOGO))
    logo.save(LOGO, "PNG", optimize=True)

    splash_logo = scale_logo(logo, MAX_LOGO_W)

    canvas = Image.new("RGB", (W, H), BG)
    x = (W - splash_logo.width) // 2
    y = (H - splash_logo.height) // 2
    canvas.paste(splash_logo, (x, y), splash_logo)
    canvas.save(OUT, "PNG", optimize=True)
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
