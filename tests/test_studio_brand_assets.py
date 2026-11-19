"""Verify Studio icon files and the installable web manifest without building an app."""

import json
import struct
import unittest
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
STUDIO = ROOT / "assets" / "studio"
WEB = ROOT / "apps" / "web" / "public"


class StudioBrandAssetTests(unittest.TestCase):
    def assert_png(self, path, size, color_type=6):
        data = path.read_bytes()
        self.assertEqual(data[:16], b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR")
        self.assertEqual(struct.unpack_from(">IIBB", data, 16), (size, size, 8, color_type))

    def test_installable_web_icons_match_manifest(self):
        manifest = json.loads((WEB / "manifest.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual(manifest["name"], "Open Product Studio")
        self.assertEqual(manifest["short_name"], "Studio")
        self.assertEqual(
            {entry["sizes"] for entry in manifest["icons"]},
            {"32x32", "180x180", "192x192", "512x512"},
        )
        for entry in manifest["icons"]:
            with self.subTest(icon=entry["src"]):
                self.assert_png(WEB / entry["src"].lstrip("/"), int(entry["sizes"].split("x")[0]))

    def test_native_icons_match_platform_dimensions(self):
        for name, size, color_type in (
            ("macos-1024.png", 1024, 6),
            ("linux-1024.png", 1024, 6),
            ("ios-1024.png", 1024, 2),
            ("android-foreground.png", 432, 6),
            ("android-monochrome.png", 432, 6),
            ("android-notification.png", 96, 6),
            ("android-splash.png", 1152, 6),
        ):
            with self.subTest(icon=name):
                self.assert_png(STUDIO / name, size, color_type)

    def test_windows_icon_sizes_and_browser_favicon_match(self):
        ico = (STUDIO / "windows.ico").read_bytes()
        self.assertEqual((WEB / "favicon.ico").read_bytes(), ico)
        self.assertEqual(struct.unpack_from("<HHH", ico), (0, 1, 7))
        sizes = tuple(ico[6 + index * 16] or 256 for index in range(7))
        self.assertEqual(sizes, (16, 24, 32, 48, 64, 128, 256))

    def test_widget_mark_uses_studio_geometry(self):
        mark = ElementTree.parse(STUDIO / "mark.svg")
        widget = ElementTree.parse(ROOT / "apps/mobile/assets/widget/T3Mark.svg")
        for art in (mark, widget):
            self.assertEqual(art.getroot().attrib["viewBox"], "0 0 32 32")
        self.assertEqual(
            [polygon.attrib["points"] for polygon in mark.findall("{*}polygon")],
            [polygon.attrib["points"] for polygon in widget.findall("{*}polygon")],
        )
