"""Check the design catalog and its references to the work-package register."""
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1] / "docs/roadmap"
FRAMEWORK_STAGES = (
    "style", "prepare", "brief", "storyboard", "assets", "render", "review", "export", "publish"
)
CLIPPER_STAGES = {
    "source": ("cap.media.library", "WP17"),
    "moments": ("cap.content.versions", "WP14"),
    "edit": ("cap.content.versions", "WP14"),
    "review": ("cap.media.video", "WP24"),
    "export": ("cap.media.video", "WP24"),
    "publish": ("cap.publishing.publish", "WP28"),
}


REPLICA_STAGES = {
    "reference": ("cap.evidence.import", "WP10"),
    "brief": ("cap.brief.capture", "WP11"),
    "design": ("cap.content.versions", "WP14"),
    "export": ("cap.library.export", "WP17"),
    "prototype": ("cap.interactive.build", "WP41"),
}
DAY_TRADER_STAGES = {
    "practice-data": ("cap.trading.replay", "WP41"),
    "rules": ("cap.content.versions", "WP14"),
    "replay": ("cap.trading.replay", "WP41"),
    "journal": ("cap.content.versions", "WP14"),
    "export": ("cap.library.export", "WP17"),
}
DESIGN_BUILDER_POLICY = {
    "clipper": {
        "editAuthority": "studio-project-variant",
        "executorsPerAction": 1,
        "executionBindings": ["host", "qualified-route", "selected-model-if-used", "approved-inputs-and-destination", "bounded-cost"],
        "proposalBindings": ["source-revision", "variant-revision"],
        "apply": "reviewed-undoable-edit",
        "supoclip": "documented-workflow-reference",
        "clipsKitty": "optional-unqualified-external-engine",
    },
    "replica": {
        "references": "permitted-material",
        "design": "original",
        "prototype": "small-local-sandbox",
        "network": "disabled",
        "publication": "outside-builder",
    },
    "day-trader": {
        "purpose": "local-practice-only",
        "replay": "deterministic-offline",
        "network": "disabled",
        "liveOrders": "disabled",
        "financialTransactions": "disabled",
    },
}


RECIPE_POLICY = {
    "selection": "save-recipe-and-prepare-checklist",
    "skipStyle": "use-manual-default-without-reference",
    "qualification": "exact-tool-build-and-selected-host",
    "referenceUse": "derive-style-traits-from-permitted-material",
    "referenceRetention": "project-scoped",
    "install": "explicit-approval",
    "acquisition": "explicit-approval-for-authorized-source",
    "upload": "explicit-approval-for-specific-data-and-destination",
}
RECIPE_ROLES = {
    "edit": ("built-in", "local", "cap.content.versions"),
    "inspect": ("local-tool", "local", "cap.media.library"),
    "render": ("local-tool", "local", "cap.media.video"),
    "transcribe": ("local-tool", "local", "cap.evidence.transcribe"),
    "acquire": ("local-tool", "authorized-download", "cap.media.library"),
}
RECIPE_TOOLS = {
    "manual-scene-editor": "edit",
    "manual-clip-editor": "edit",
    "ffprobe": "inspect",
    "ffmpeg": "render",
    "hyperframes": "render",
    "remotion": "render",
    "whisper-cpp": "transcribe",
    "yt-dlp": "acquire",
}
RECIPE_TREATMENTS = {
    "framing": ("canvas", "screen", "manual-subject"),
    "captions": ("editable", "timed-text"),
    "graphics": ("none", "text-motion", "callouts"),
}
RECIPE_BUILDERS = {
    "video": ("style", ["prepare"], {"edit": "manual-scene-editor", "render": "hyperframes"}),
    "clipper": ("edit", ["source", "edit"], {"inspect": "ffprobe", "edit": "manual-clip-editor", "render": "ffmpeg"}),
}


def text(value):
    return isinstance(value, str) and bool(value.strip())


def valid_refs(refs, entries):
    return (isinstance(refs, list) and all(text(ref) and ref in entries for ref in refs)
            and len(refs) == len(set(refs)))


def check_stages(stages, builder, stage_ids, owners, expected_bindings=None, *, optional_stage="publish"):
    if not isinstance(stages, list) or not all(isinstance(stage, dict) for stage in stages):
        return [f"Expected an ordered {builder} stage list"]
    errors = []
    if tuple(stage.get("id") for stage in stages) != tuple(stage_ids):
        if optional_stage == "publish":
            errors.append(f"{builder.capitalize()} builder must reach local export before the optional publish action")
        else:
            errors.append(f"{builder} builder must preserve the planned stage order")
    for stage in stages:
        name, capability, owner = stage.get("id"), stage.get("capability"), stage.get("owner")
        if (not text(stage.get("label")) or not text(capability) or not text(owner)
                or owners.get(capability) != owner):
            errors.append(f"{name}: invalid work-package capability binding")
        if stage.get("optional") is not (optional_stage is not None and name == optional_stage):
            errors.append(f"{name}: invalid optional stage")
        if (optional_stage == "publish" and name == "publish") != (capability == "cap.publishing.publish"):
            errors.append(f"{name}: publishing must stay separate from editing and export")
        if expected_bindings is not None:
            if set(stage) != {"id", "label", "capability", "owner", "optional"}:
                errors.append(f"{name}: {builder} stages only describe the stage and its capability")
            if text(name) and name in expected_bindings and (capability, owner) != expected_bindings[name]:
                errors.append(f"{name}: invalid {builder} stage capability or owner")
    return errors


def check_style_recipes(recipes, legacy_entries, owners):
    if (not isinstance(recipes, dict) or set(recipes) != {"status", "policy", "tools", "builders"}
            or recipes["status"] != "design-only" or recipes["policy"] != RECIPE_POLICY):
        return ["Expected design-only recipes with scoped reference and explicit preparation policy"]
    tools, builders = recipes["tools"], recipes["builders"]
    if not isinstance(tools, dict) or not RECIPE_TOOLS.keys() <= tools.keys():
        return ["Missing planned recipe tools"]
    if not isinstance(builders, dict) or builders.keys() != RECIPE_BUILDERS.keys():
        return ["Expected style recipes for Video and Clipper"]

    errors = []
    tool_roles = {}
    for key, tool in tools.items():
        if not isinstance(tool, dict) or set(tool) != {"label", "role", "kind", "scope", "capability"}:
            errors.append(f"{key}: recipe tools only describe labels, roles, kinds, scopes and capabilities")
            continue
        role = tool["role"]
        if (not text(tool["label"]) or not text(role) or role not in RECIPE_ROLES
                or role != RECIPE_TOOLS.get(key, role)
                or (tool["kind"], tool["scope"], tool["capability"]) != RECIPE_ROLES[role]
                or tool["capability"] not in owners):
            errors.append(f"{key}: invalid scope or capability for the recipe role")
            continue
        tool_roles[key] = role
    if (tools.keys() & legacy_entries.keys()) - {"hyperframes"}:
        errors.append("New design-only recipe tools must stay outside the current guide")

    for builder, (style_stage, prepare_stages, local_defaults) in RECIPE_BUILDERS.items():
        definition = builders[builder]
        if (not isinstance(definition, dict)
                or set(definition) != {"styleAt", "prepareAt", "origins", "defaultPreset", "presets"}
                or (definition["styleAt"], definition["prepareAt"]) != (style_stage, prepare_stages)
                or definition["origins"] != ["manual", "built-in-example", "supplied-reference"]):
            errors.append(f"{builder}: use existing stages for manual, built-in and supplied-reference recipes")
            continue
        presets, default = definition["presets"], definition["defaultPreset"]
        if not isinstance(presets, dict) or len(presets) < 2 or not text(default) or default not in presets:
            errors.append(f"{builder}: choose a local default and offer multiple built-in presets")
            continue
        has_composition_choice = False
        for key, preset in presets.items():
            if (not isinstance(preset, dict)
                    or set(preset) != {"label", "version", "aspectRatio", "treatment", "required", "optional"}
                    or not text(preset["label"]) or type(preset["version"]) is not int or preset["version"] < 1
                    or preset["aspectRatio"] not in ("16:9", "9:16", "1:1")):
                errors.append(f"{builder}/{key}: preset needs a label, positive version and aspect ratio")
                continue
            treatment = preset["treatment"]
            if (not isinstance(treatment, dict) or treatment.keys() != RECIPE_TREATMENTS.keys()
                    or any(treatment[trait] not in choices for trait, choices in RECIPE_TREATMENTS.items())):
                errors.append(f"{builder}/{key}: preset must use editable style traits")
            required, optional = preset["required"], preset["optional"]
            if (not isinstance(required, dict) or required.keys() != local_defaults.keys()
                    or any(not refs or not valid_refs(refs, tool_roles)
                           or any(tool_roles[ref] != role for ref in refs) for role, refs in required.items())
                    or not valid_refs(optional, tool_roles)
                    or any(ref in optional for refs in required.values() for ref in refs)):
                errors.append(f"{builder}/{key}: bind local tools to the required roles and keep optional actions separate")
                continue
            if key == default and (
                any(required[role][0] != tool for role, tool in local_defaults.items())
                or (builder == "clipper" and preset["aspectRatio"] != "9:16")
            ):
                errors.append(f"{builder}/{key}: preserve the manual local default")
            if key == default and not {"whisper-cpp", "yt-dlp"} <= set(optional):
                errors.append(f"{builder}/{key}: keep transcription and authorized acquisition optional")
            has_composition_choice |= {"hyperframes", "remotion"} <= set(required["render"])
        if not has_composition_choice:
            errors.append(f"{builder}: offer HyperFrames and Remotion as alternative composition renderers")
    return errors


def check(catalog, roadmap):
    if not isinstance(catalog, dict) or catalog.get("schemaVersion") != 1 or catalog.get("status") != "design-only":
        return ["Expected a version 1 design-only project category catalog"]
    errors = []
    if catalog.get("selection") != {
        "effect": "save-preferences-and-prepare-checklist",
        "grantsAccess": False,
        "readiness": "per-action-on-selected-host",
    }:
        errors.append("Category or style selection cannot authorize preparation actions")
    if catalog.get("designBuilderPolicy") != DESIGN_BUILDER_POLICY:
        errors.append("Expected the scoped design-only builder policy")
    groups = ("categories", "styles", "stackEntries")
    if any(not isinstance(catalog.get(group), dict) or not catalog[group] for group in groups):
        return errors + ["Missing category, style or stack-entry definitions"]
    categories, styles, entries = (catalog[group] for group in groups)
    entry_points = {
        "blank": "workspace", "digital-product": "product-builder", "video": "video-builder",
        "clipper": "clipper-builder", "replica": "replica-builder", "day-trader": "day-trader-builder",
    }
    fixed_labels = {"clipper": "Clipper", "replica": "Replica", "day-trader": "Day Trader"}
    if not entry_points.keys() <= categories.keys():
        errors.append("Missing a first-class starting category")
    seen_entries = set()
    for key, category in categories.items():
        if (not isinstance(category, dict) or not text(category.get("entry"))
                or not text(category.get("label")) or type(category.get("sourceRequired")) is not bool):
            errors.append(f"{key}: missing category entry, label or source policy")
            continue
        entry = category["entry"]
        if entry in seen_entries:
            errors.append(f"{key}: duplicate category entry point {entry}")
        seen_entries.add(entry)
        if key in entry_points:
            if category["sourceRequired"]:
                errors.append(f"{key}: a starting category must be able to start with an empty project")
            if category["entry"] != entry_points[key]:
                errors.append(f"{key}: starting category must open its own entry point")
        if key in fixed_labels:
            if category["label"] != fixed_labels[key]:
                errors.append(f"{key}: starting category must be labeled {fixed_labels[key]}")
            if set(category) != {"entry", "label", "sourceRequired"}:
                errors.append(f"{key}: categories only describe entry, label and source policy")
    owners = {cap: p["id"] for p in roadmap["workPackages"] for cap in p["capabilities"]}
    errors.extend(check_stages(catalog.get("videoStages"), "video", FRAMEWORK_STAGES, owners))
    errors.extend(check_stages(
        catalog.get("clipperStages"), "Clipper", CLIPPER_STAGES, owners, expected_bindings=CLIPPER_STAGES,
    ))
    errors.extend(check_stages(
        catalog.get("replicaStages"), "Replica", REPLICA_STAGES, owners,
        expected_bindings=REPLICA_STAGES, optional_stage="prototype",
    ))
    errors.extend(check_stages(
        catalog.get("dayTraderStages"), "Day Trader", DAY_TRADER_STAGES, owners,
        expected_bindings=DAY_TRADER_STAGES, optional_stage=None,
    ))
    for key, entry in entries.items():
        if not isinstance(entry, dict) or set(entry) != {"label", "kind", "cost", "capability"}:
            errors.append(f"{key}: stack entries only describe capabilities, labels, kinds and costs")
            continue
        if (not text(entry["label"]) or entry["kind"] not in ("built-in", "local-tool", "skill", "mcp", "plugin", "connector")
                or entry["cost"] not in ("local", "selected-model", "quote-required", "route-specific")
                or not text(entry["capability"]) or entry["capability"] not in owners):
            errors.append(f"{key}: unknown stack kind, cost or capability")
        elif entry["kind"] == "plugin" and owners[entry["capability"]] != "WP40":
            errors.append(f"{key}: executable plugins require the isolated runtime in WP40")
    if not {"kinetic-type", "product-demo", "3d-showcase"} <= styles.keys():
        errors.append("Missing a reference video style")
    for key, style in styles.items():
        if (not isinstance(style, dict) or type(style.get("version")) is not int or style["version"] < 1
                or not text(style.get("label")) or not isinstance(style.get("required"), list) or not style["required"]):
            errors.append(f"{key}: style needs a version and required stack")
            continue
        required = set()
        for slot in style["required"]:
            if (not isinstance(slot, dict) or not text(slot.get("need")) or not slot.get("chooseOne")
                    or not valid_refs(slot["chooseOne"], entries)):
                errors.append(f"{key}: required slot needs explicit catalog alternatives")
                continue
            required.update(slot["chooseOne"])
            if key == "kinetic-type" and not any(
                isinstance(entries[ref], dict) and entries[ref].get("cost") == "local"
                and entries[ref].get("kind") in ("built-in", "local-tool")
                for ref in slot["chooseOne"]
            ):
                errors.append(f"{key}: {slot['need']} needs a local option in the starter recipe")
        optional = style.get("optional")
        if not valid_refs(optional, entries) or required.intersection(optional):
            errors.append(f"{key}: invalid or overlapping optional stack")
    errors.extend(check_style_recipes(catalog.get("styleRecipes"), entries, owners))
    return errors


if __name__ == "__main__":
    sources = ("project-categories.json", "work-packages.json")
    issues = check(*(json.loads((ROOT / source).read_text(encoding="utf-8")) for source in sources))
    for issue in issues:
        print(issue, file=sys.stderr)
    if issues:
        sys.exit(1)
    print("Project categories, style recipes, builder stages and roadmap references passed.")
