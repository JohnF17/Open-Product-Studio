from argparse import ArgumentParser
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image, ImageDraw


ASSETS = Path(__file__).resolve().parent
WEB = ASSETS.parents[1] / "apps" / "web" / "public"
WINDOWS_SIZES = (16, 24, 32, 48, 64, 128, 256)
WEB_SIZES = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "apple-touch-icon.png": 180,
    "icon-192x192.png": 192,
    "icon-512x512.png": 512,
}


def render_mark(size):
    # Render the simple SVG primitives at 4x before antialiasing.
    svg = ElementTree.parse(ASSETS / "mark.svg").getroot()
    viewbox = [float(value) for value in svg.attrib["viewBox"].split()]
    assert viewbox[:2] == [0, 0] and viewbox[2] == viewbox[3]
    canvas_size = size * 4
    scale = canvas_size / viewbox[2]
    image = Image.new("RGBA", (canvas_size, canvas_size))
    draw = ImageDraw.Draw(image)
    for element in svg:
        fill = element.attrib["fill"]
        tag = element.tag.rsplit("}", 1)[-1]
        if tag == "rect":
            width = float(element.attrib["width"]) * scale
            height = float(element.attrib["height"]) * scale
            radius = float(element.attrib["rx"]) * scale
            draw.rounded_rectangle((0, 0, width - 1, height - 1), radius, fill=fill)
        elif tag == "polygon":
            points = [
                tuple(float(coordinate) * scale for coordinate in pair.split(","))
                for pair in element.attrib["points"].split()
            ]
            draw.polygon(points, fill=fill)
        else:
            raise ValueError(f"Unsupported mark element {tag}")
    return image.resize((size, size), Image.Resampling.LANCZOS)


def outputs():
    for name, size in WEB_SIZES.items():
        png = BytesIO()
        render_mark(size).save(png, format="PNG")
        yield WEB / name, png.getvalue()

    images = [render_mark(size) for size in WINDOWS_SIZES]
    ico = BytesIO()
    images[-1].save(
        ico,
        format="ICO",
        sizes=[image.size for image in images],
        append_images=images[:-1],
    )
    yield ASSETS / "windows.ico", ico.getvalue()
    yield WEB / "favicon.ico", ico.getvalue()


def main():
    parser = ArgumentParser(description="Render Studio icons from mark.svg.")
    parser.add_argument("--check", action="store_true", help="Verify the checked-in assets.")
    options = parser.parse_args()
    stale = []
    for path, contents in outputs():
        if options.check:
            if not path.is_file() or path.read_bytes() != contents:
                stale.append(path.name)
        else:
            path.write_bytes(contents)
    if stale:
        parser.exit(1, f"Studio icons need regeneration: {', '.join(stale)}\n")
    print("Studio icons are current.")


if __name__ == "__main__":
    main()
