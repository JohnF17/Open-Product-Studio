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

    def test_stick_figure_explainer_has_a_manual_path_and_editable_recipe(self):
        style_id = "stick-figure-explainer"
        for section in ("chooser", "recipe"):
            with self.subTest(section=section):
                candidate = copy.deepcopy(self.catalog)
                styles = (candidate["styles"] if section == "chooser"
                          else candidate["styleRecipes"]["builders"]["video"]["presets"])
                self.assertIn(style_id, styles)
                del styles[style_id]
                self.assertTrue(check(candidate, self.roadmap))
        candidate = copy.deepcopy(self.catalog)
        candidate["styles"][style_id]["required"][0]["chooseOne"] = ["storyboard-skill"]
        self.assertTrue(check(candidate, self.roadmap))

    def test_clipper_cannot_be_removed_or_redirected_to_another_builder(self):
        for change, expected in (
            (None, "Missing a first-class starting category"),
            ({"entry": "video-builder"}, "clipper: starting category must open its own entry point"),
            ({"sourceRequired": True}, "clipper: a starting category must be able to start with an empty project"),
            ({"label": "Video"}, "clipper: starting category must be labeled Clipper"),
            ({"grantsAccess": True}, "clipper: categories only describe entry, label and source policy"),
        ):
            with self.subTest(change=change):
                candidate = copy.deepcopy(self.catalog)
                if change is None:
                    del candidate["categories"]["clipper"]
                else:
                    candidate["categories"]["clipper"].update(change)
                self.assertIn(expected, check(candidate, self.roadmap))

    def test_clipper_stages_preserve_owners_authority_and_local_completion(self):
        for mutate, expected in (
            (lambda c: c.pop("clipperStages"), "Expected an ordered Clipper stage list"),
            (lambda c: c["clipperStages"].reverse(), "Clipper builder must reach local export before the optional publish action"),
            (lambda c: c["clipperStages"][0].update(owner="WP24"), "source: invalid work-package capability binding"),
            (lambda c: c["clipperStages"][1].update(owner="WP24", capability="cap.media.video"),
             "moments: invalid Clipper stage capability or owner"),
            (lambda c: c["clipperStages"][3].update(grantsAccess=True),
             "review: Clipper stages only describe the stage and its capability"),
            (lambda c: c["clipperStages"][4].update(optional=True), "export: invalid optional stage"),
            (lambda c: c["clipperStages"][4].update(owner="WP28", capability="cap.publishing.publish"),
             "export: publishing must stay separate from editing and export"),
            (lambda c: c["clipperStages"][5].update(optional=False), "publish: invalid optional stage"),
        ):
            with self.subTest(expected=expected):
                candidate = copy.deepcopy(self.catalog)
                mutate(candidate)
                self.assertIn(expected, check(candidate, self.roadmap))

    def test_design_builders_have_distinct_empty_start_routes(self):
        for key, label in (("replica", "Replica"), ("day-trader", "Day Trader")):
            with self.subTest(category=key):
                self.assertEqual(self.catalog["categories"].get(key), {
                    "label": label, "sourceRequired": False, "entry": f"{key}-builder",
                })

    def test_design_builders_reject_routing_and_permission_changes(self):
        for key in ("replica", "day-trader"):
            for change, expected in (
                (None, "Missing a first-class starting category"),
                ({"entry": "video-builder"}, f"{key}: starting category must open its own entry point"),
                ({"sourceRequired": True}, f"{key}: a starting category must be able to start with an empty project"),
                ({"networkGrant": True}, f"{key}: categories only describe entry, label and source policy"),
            ):
                with self.subTest(category=key, change=change):
                    candidate = copy.deepcopy(self.catalog)
                    if change is None:
                        del candidate["categories"][key]
                    else:
                        candidate["categories"][key].update(change)
                    self.assertIn(expected, check(candidate, self.roadmap))
        candidate = copy.deepcopy(self.catalog)
        candidate["categories"]["alias"] = dict(candidate["categories"]["replica"])
        self.assertIn("alias: duplicate category entry point replica-builder", check(candidate, self.roadmap))

    def test_design_builder_stages_reject_discontinuity_and_misbinding(self):
        for group, mutate, expected in (
            ("replicaStages", lambda stages: stages.reverse(),
             "Replica builder must preserve the planned stage order"),
            ("replicaStages", lambda stages: stages[-1].update(optional=False),
             "prototype: invalid optional stage"),
            ("replicaStages", lambda stages: stages.insert(-1, {
                "id": "publish", "label": "Publish", "optional": True,
                "capability": "cap.publishing.publish", "owner": "WP28",
            }), "Replica builder must preserve the planned stage order"),
            ("replicaStages", lambda stages: stages[-2].update(capability="cap.media.library"),
             "export: invalid Replica stage capability or owner"),
            ("dayTraderStages", lambda stages: stages.pop(3),
             "Day Trader builder must preserve the planned stage order"),
            ("dayTraderStages", lambda stages: stages[2].update(capability="cap.interactive.build"),
             "replay: invalid Day Trader stage capability or owner"),
            ("dayTraderStages", lambda stages: stages[2].update(networkGrant=True),
             "replay: Day Trader stages only describe the stage and its capability"),
        ):
            with self.subTest(expected=expected):
                candidate = copy.deepcopy(self.catalog)
                mutate(candidate[group])
                self.assertIn(expected, check(candidate, self.roadmap))

    def test_design_builder_policy_requires_local_practice_and_scoped_references(self):
        for key, change in (
            ("clipper", {"executorsPerAction": 2}),
            ("clipper", {"proposalBindings": ["source-revision"]}),
            ("clipper", {"supoclip": "bundled-default"}),
            ("replica", {"references": "unrestricted"}),
            ("replica", {"publication": "automatic"}),
            ("day-trader", {"replay": "live"}),
            ("day-trader", {"network": "enabled"}),
            ("day-trader", {"liveOrders": "enabled"}),
            ("day-trader", {"financialTransactions": "enabled"}),
        ):
            with self.subTest(category=key, change=change):
                candidate = copy.deepcopy(self.catalog)
                candidate["designBuilderPolicy"][key].update(change)
                self.assertIn("Expected the scoped design-only builder policy", check(candidate, self.roadmap))

    def test_replay_capability_must_belong_to_wp41(self):
        roadmap = copy.deepcopy(self.roadmap)
        for package in roadmap["workPackages"]:
            if "cap.trading.replay" in package["capabilities"]:
                package["capabilities"].remove("cap.trading.replay")
        video_package = next(package for package in roadmap["workPackages"] if package["id"] == "WP24")
        video_package["capabilities"].append("cap.trading.replay")
        self.assertIn("replay: invalid work-package capability binding", check(self.catalog, roadmap))

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

    def test_design_recipes_support_both_builders_without_extending_current_guide(self):
        recipes = self.catalog["styleRecipes"]
        self.assertEqual(recipes["status"], "design-only")
        self.assertEqual(recipes["policy"]["skipStyle"], "use-manual-default-without-reference")
        self.assertEqual(set(recipes["builders"]), {"video", "clipper"})
        self.assertTrue(set(recipes["tools"]) - self.catalog["stackEntries"].keys())
        for builder in recipes["builders"].values():
            self.assertEqual(builder["origins"], ["manual", "built-in-example", "supplied-reference"])
            self.assertGreaterEqual(len(builder["presets"]), 2)
            treatments = {tuple(preset["treatment"].items()) for preset in builder["presets"].values()}
            self.assertGreaterEqual(len(treatments), 2)
        video = recipes["builders"]["video"]
        self.assertEqual((video["styleAt"], video["prepareAt"]), ("style", ["prepare"]))
        clipper = recipes["builders"]["clipper"]
        self.assertEqual((clipper["styleAt"], clipper["prepareAt"]), ("edit", ["source", "edit"]))
        portrait = clipper["presets"][clipper["defaultPreset"]]
        self.assertEqual(portrait["aspectRatio"], "9:16")
        self.assertEqual(portrait["required"]["render"][0], "ffmpeg")

    def test_recipe_policy_keeps_reference_use_and_preparation_scoped(self):
        def remove_origin(recipes):
            recipes["builders"]["video"]["origins"].remove("supplied-reference")

        for mutate in (
            lambda r: r.update(status="available"),
            lambda r: r["policy"].update(install="automatic"),
            lambda r: r["policy"].update(skipStyle="disabled"),
            lambda r: r["policy"].update(upload="allowed-by-selection"),
            lambda r: r["policy"].update(referenceUse="unrestricted"),
            lambda r: r["policy"].update(acquisition="download-any-link"),
            lambda r: r["builders"]["clipper"].update(prepareAt=["source"]),
            lambda r: r["builders"]["clipper"].update(styleAt="publish"),
            lambda r: r["builders"]["video"].update(grantsAccess=True),
            remove_origin,
        ):
            with self.subTest(mutate=mutate):
                candidate = copy.deepcopy(self.catalog)
                mutate(candidate["styleRecipes"])
                self.assertTrue(check(candidate, self.roadmap))

    def test_recipe_choices_preserve_manual_defaults_and_gate_optional_tools(self):
        def update_default(recipes, **changes):
            builder = recipes["builders"]["clipper"]
            builder["presets"][builder["defaultPreset"]].update(**changes)

        for mutate in (
            lambda r: r["tools"]["yt-dlp"].update(scope="local"),
            lambda r: r["tools"]["yt-dlp"].update(command="start"),
            lambda r: r["tools"]["whisper-cpp"].update(capability="cap.media.video"),
            lambda r: r["tools"]["remotion"].update(status="available"),
            lambda r: r["tools"].pop("hyperframes"),
            lambda r: update_default(r, aspectRatio="16:9"),
            lambda r: update_default(r, treatment={"script": "run-this"}),
            lambda r: update_default(r, required={"inspect": ["yt-dlp"], "edit": ["manual-clip-editor"],
                                                   "render": ["ffmpeg"]}),
            lambda r: update_default(r, optional=["ffmpeg"]),
            lambda r: r["builders"]["video"]["presets"]["timed-text"].update(optional=["whisper-cpp"]),
        ):
            with self.subTest(mutate=mutate):
                candidate = copy.deepcopy(self.catalog)
                mutate(candidate["styleRecipes"])
                self.assertTrue(check(candidate, self.roadmap))

    def test_design_only_tools_cannot_enter_current_guide(self):
        candidate = copy.deepcopy(self.catalog)
        candidate["stackEntries"]["remotion"] = copy.deepcopy(candidate["stackEntries"]["hyperframes"])
        candidate["styles"]["kinetic-type"]["required"][-1]["chooseOne"].append("remotion")
        self.assertTrue(check(candidate, self.roadmap))
