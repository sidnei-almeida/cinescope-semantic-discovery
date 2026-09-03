#!/usr/bin/env python3
"""
Render the brand mark into every icon asset the app ships.

The SVG in public/brand-aperture.svg is the single source of truth; this script
rasterizes it with headless Chromium and writes the favicons, the Apple touch
icon, the PWA icons and the multi-resolution .ico.

Transparent icons look wrong on iOS and Android, which composite them onto an
opaque tile, so those two get the app's own background and a little inset.

    python scripts/build_brand_assets.py [--chromium /path/to/chromium]
"""
import argparse
import base64
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "brand-aperture.svg"
BACKGROUND = "#0a0a09"

# (filename, pixel size, background or None for transparent, inset fraction)
TARGETS = [
    ("favicon-16x16.png", 16, None, 0.0),
    ("favicon-32x32.png", 32, None, 0.0),
    ("apple-touch-icon.png", 180, BACKGROUND, 0.18),
    ("android-chrome-192x192.png", 192, BACKGROUND, 0.14),
    ("android-chrome-512x512.png", 512, BACKGROUND, 0.14),
]

ICO_SIZES = (16, 32, 48)


def find_chromium(explicit: str | None) -> str:
    if explicit:
        return explicit
    for name in ("chromium", "chromium-browser", "google-chrome-stable", "google-chrome"):
        found = shutil.which(name)
        if found:
            return found
    sys.exit("no chromium binary found; pass --chromium")


def render(chromium: str, svg: str, size: int, background: str | None, inset: float) -> bytes:
    """Screenshot the mark at exactly size x size pixels."""
    pad = round(size * inset)
    box = size - 2 * pad
    page = (
        "<html><head><meta charset='utf-8'><style>"
        f"html,body{{margin:0;padding:0;width:{size}px;height:{size}px;"
        f"background:{background or 'transparent'};}}"
        f".m{{position:absolute;left:{pad}px;top:{pad}px;width:{box}px;height:{box}px;}}"
        "svg{width:100%;height:100%;display:block}"
        f"</style></head><body><div class='m'>{svg}</div></body></html>"
    )

    with tempfile.TemporaryDirectory() as tmp:
        html = Path(tmp) / "icon.html"
        out = Path(tmp) / "icon.png"
        html.write_text(page, encoding="utf-8")

        command = [
            chromium,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            f"--window-size={size},{size}",
            "--force-device-scale-factor=1",
            "--virtual-time-budget=2000",
            f"--screenshot={out}",
        ]
        if background is None:
            command.append("--default-background-color=00000000")
        command.append(f"file://{html}")

        subprocess.run(command, check=True, capture_output=True)
        return out.read_bytes()


def build_ico(images: dict[int, bytes]) -> bytes:
    """Pack PNGs into an .ico container (PNG payloads, supported since Vista)."""
    count = len(images)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count

    entries, payloads = b"", b""
    for size in sorted(images):
        data = images[size]
        entries += struct.pack(
            "<BBBBHHII",
            size if size < 256 else 0,
            size if size < 256 else 0,
            0,
            0,
            1,
            32,
            len(data),
            offset,
        )
        payloads += data
        offset += len(data)

    return header + entries + payloads


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium")
    args = parser.parse_args()

    chromium = find_chromium(args.chromium)
    svg = SOURCE.read_text(encoding="utf-8")

    for name, size, background, inset in TARGETS:
        (PUBLIC / name).write_bytes(render(chromium, svg, size, background, inset))
        print(f"  {name:32s} {size}px")

    ico_images = {size: render(chromium, svg, size, None, 0.0) for size in ICO_SIZES}
    (PUBLIC / "favicon.ico").write_bytes(build_ico(ico_images))
    print(f"  {'favicon.ico':32s} {', '.join(f'{s}px' for s in ICO_SIZES)}")

    shutil.copyfile(SOURCE, PUBLIC / "favicon.svg")
    print(f"  {'favicon.svg':32s} vector")

    # Inline copy for the README badge / social preview, if ever needed.
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    print(f"\ndata URI length: {len(encoded)} chars")


if __name__ == "__main__":
    main()
