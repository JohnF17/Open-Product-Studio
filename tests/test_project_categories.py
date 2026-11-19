import copy
import json
from pathlib import Path
import unittest

from scripts.check_project_categories import check


ROOT = Path(__file__).resolve().parents[1] / "docs/roadmap"


class ProjectCategoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / "project-categories.json").read_text(encoding="utf-8"))
        cls.roadmap = json.loads((ROOT / "work-packages.json").read_text(encoding="utf-8"))

    def test_committed_catalog_matches_the_roadmap(self):
        self.assertEqual(check(self.catalog, self.roadmap), [])

    def test_future_category_and_style_extend_the_same_catalog(self):
        candidate = copy.deepcopy(self.catalog)
        candidate["categories"]["audio"] = {"label": "Audio", "entry": "audio-builder", "sourceRequired": False}
        candidate["styles"]["diagram"] = {"label": "Diagram", "version": 1,
                                          "required": [{"need": "Render", "chooseOne": ["hyperframes"]}],
                                          "optional": ["voice-import"]}
        self.assertEqual(check(candidate, self.roadmap), [])

    def test_video_can_start_empty_and_local_export_ends_the_guided_flow(self):
        for mutate in (
            lambda c: c["categories"]["video"].update(sourceRequired=True),
            lambda c: c["categories"]["video"].update(entry="product-builder"),
            lambda c: c["stackEntries"]["hyperframes"].update(cost="quote-required"),
            lambda c: c["videoStages"][-1].update(optional=False),
            lambda c: c["videoStages"].reverse(),
            lambda c: c["videoStages"][-2].update(capability="cap.publishing.publish"),
        ):
            with self.subTest(mutate=mutate):
                candidate = copy.deepcopy(self.catalog)
                mutate(candidate)
                self.assertTrue(check(candidate, self.roadmap))

    def test_no_authority_or_executable_payload_on_selection(self):
        for mutate in (
            lambda c: c["selection"].update(grantsAccess=True),
            lambda c: c["stackEntries"]["blender"].update(command="launch"),
            lambda c: c["stackEntries"]["blender"].update(token="credential"),
            lambda c: c["stackEntries"]["effect-plugin"].update(capability="cap.connections.extensions"),
        ):
            with self.subTest(mutate=mutate):
                candidate = copy.deepcopy(self.catalog)
                mutate(candidate)
                self.assertTrue(check(candidate, self.roadmap))

    def test_versions_and_required_alternatives_must_resolve(self):
        for mutate in (
            lambda c: c["styles"]["kinetic-type"].update(version=0),
            lambda c: c["styles"]["product-demo"]["required"][0].update(chooseOne=["missing"]),
            lambda c: c["styles"]["3d-showcase"]["required"][0].update(chooseOne=[]),
            lambda c: c["styles"]["3d-showcase"]["optional"].append("unknown"),
            lambda c: c["videoStages"][3].update(owner="WP24"),
        ):
            with self.subTest(mutate=mutate):
                candidate = copy.deepcopy(self.catalog)
                mutate(candidate)
                self.assertTrue(check(candidate, self.roadmap))
