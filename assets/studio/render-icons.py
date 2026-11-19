from argparse import ArgumentParser
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image, ImageDraw


ASSETS = Path(__file__).resolve().parent
ROOT = ASSETS.parents[1]
WEB = ROOT / "apps" / "web" / "public"
WIDGET_MARK = ROOT / "apps" / "mobile" / "assets" / "widget" / "T3Mark.svg"
WINDOWS_SIZES = (16, 24, 32, 48, 64, 128, 256)
WEB_SIZES = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "apple-touch-icon.png": 180,
    "icon-192x192.png": 192,
    "icon-512x512.png": 512,
}


def render_mark(size, *, background="tile", art_size=None, monochrome=False):
    # Supersample small icons while bounding memory for the largest native renditions.
    svg = ElementTree.parse(ASSETS / "mark.svg").getroot()
    viewbox = [float(value) for value in svg.attrib["viewBox"].split()]
    assert viewbox[:2] == [0, 0] and viewbox[2] == viewbox[3]
    art_size = art_size or size
    samples = 4 if art_size <= 512 else 2
    canvas_size = art_size * samples
    scale = canvas_size / viewbox[2]
    plate_color = svg.find("{*}rect").attrib["fill"]
    image = Image.new("RGBA", (canvas_size, canvas_size))
    draw = ImageDraw.Draw(image)
    for element in svg:
        fill = element.attrib["fill"]
        tag = element.tag.rsplit("}", 1)[-1]
        if tag == "rect":
            if background == "tile":
                width = float(element.attrib["width"]) * scale
                height = float(element.attrib["height"]) * scale
                radius = float(element.attrib["rx"]) * scale
                draw.rounded_rectangle((0, 0, width - 1, height - 1), radius, fill=fill)
        elif tag == "polygon":
            points = [
                tuple(float(coordinate) * scale for coordinate in pair.split(","))
                for pair in element.attrib["points"].split()
            ]
            draw.polygon(points, fill="#FFFFFF" if monochrome else fill)
        else:
            raise ValueError(f"Unsupported mark element {tag}")
    art = image.resize((art_size, art_size), Image.Resampling.LANCZOS)
    if art_size == size and background != "solid":
        return art

    canvas = Image.new("RGBA", (size, size), plate_color if background == "solid" else None)
    offset = (size - art_size) // 2
    canvas.alpha_composite(art, (offset, offset))
    return canvas.convert("RGB") if background == "solid" else canvas


def encode_png(image):
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def widget_svg():
    svg = ElementTree.parse(ASSETS / "mark.svg").getroot()
    polygons = [
        f'  <polygon points="{node.attrib["points"]}" fill="#000000"/>'
        for node in svg.findall("{*}polygon")
    ]
    return "\n".join([
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">',
        *polygons,
        "</svg>\n",
    ]).encode("utf-8")


def outputs():
    for name, size in WEB_SIZES.items():
        yield WEB / name, encode_png(render_mark(size))

    # Respect the classic Mac inset, the Android adaptive and splash masks, and
    # the opaque canvas required by iOS App Store icons.
    yield ASSETS / "macos-1024.png", encode_png(render_mark(1024, art_size=824))
    yield ASSETS / "linux-1024.png", encode_png(render_mark(1024))
    yield ASSETS / "ios-1024.png", encode_png(render_mark(1024, background="solid", art_size=928))
    yield ASSETS / "mobile-mark.png", encode_png(render_mark(96))
    yield ASSETS / "android-foreground.png", encode_png(
        render_mark(432, background="transparent", art_size=280)
    )
    yield ASSETS / "android-monochrome.png", encode_png(
        render_mark(432, background="transparent", art_size=280, monochrome=True)
    )
    yield ASSETS / "android-notification.png", encode_png(
        render_mark(96, background="transparent", art_size=92, monochrome=True)
    )
    yield ASSETS / "android-splash.png", encode_png(render_mark(1152, art_size=680))
    yield WIDGET_MARK, widget_svg()

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


def matches(path, expected):
    if not path.is_file():
        return False
    if path.suffix == ".svg":
        return path.read_bytes() == expected
    try:
        with Image.open(path) as actual, Image.open(BytesIO(expected)) as reference:
            if path.suffix == ".ico":
                return actual.ico.sizes() == reference.ico.sizes() and all(
                    actual.ico.getimage(size).tobytes() == reference.ico.getimage(size).tobytes()
                    for size in reference.ico.sizes()
                )
            return (
                actual.mode == reference.mode
                and actual.size == reference.size
                and actual.tobytes() == reference.tobytes()
            )
    except OSError:
        return False


def main():
    parser = ArgumentParser(description="Render Studio icons from mark.svg.")
    parser.add_argument("--check", action="store_true", help="Verify the checked-in assets.")
    options = parser.parse_args()
    stale = []
    for path, contents in outputs():
        if options.check:
            if not matches(path, contents):
                stale.append(path.name)
        else:
            path.write_bytes(contents)
    if stale:
        parser.exit(1, f"Studio icons need regeneration: {', '.join(stale)}\n")
    print("Studio icons are current.")


if __name__ == "__main__":
    main()
