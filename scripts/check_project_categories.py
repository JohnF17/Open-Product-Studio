"""Check the design catalog and its references to the work-package register."""
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1] / "docs/roadmap"
FRAMEWORK_STAGES = (
    "style", "prepare", "brief", "storyboard", "assets", "render", "review", "export", "publish"
)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def valid_refs(refs, entries):
    return (isinstance(refs, list) and all(text(ref) and ref in entries for ref in refs)
            and len(refs) == len(set(refs)))


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
    groups = ("categories", "styles", "stackEntries")
    if any(not isinstance(catalog.get(group), dict) or not catalog[group] for group in groups):
        return errors + ["Missing category, style or stack-entry definitions"]
    categories, styles, entries = (catalog[group] for group in groups)
    launch_categories = {"blank", "digital-product", "video"}
    if not launch_categories <= categories.keys():
        errors.append("Missing a first-class starting category")
    entry_points = {
        "blank": "workspace", "digital-product": "product-builder", "video": "video-builder",
    }
    for key, category in categories.items():
        if (not isinstance(category, dict) or not text(category.get("entry"))
                or not text(category.get("label")) or type(category.get("sourceRequired")) is not bool):
            errors.append(f"{key}: missing category entry, label or source policy")
        elif key in launch_categories and category["sourceRequired"]:
            errors.append(f"{key}: a launch category must be able to start with an empty project")
        elif key in entry_points and category["entry"] != entry_points[key]:
            errors.append(f"{key}: starting category must open its own entry point")
    owners = {cap: p["id"] for p in roadmap["workPackages"] for cap in p["capabilities"]}
    stages = catalog.get("videoStages")
    if not isinstance(stages, list) or not all(isinstance(stage, dict) for stage in stages):
        return errors + ["Expected an ordered video stage list"]
    if tuple(stage.get("id") for stage in stages) != FRAMEWORK_STAGES:
        errors.append("Video builder must reach local export before the optional publish action")
    for stage in stages:
        name, capability = stage.get("id"), stage.get("capability")
        if (not text(stage.get("label")) or not text(capability) or not text(stage.get("owner"))
                or owners.get(capability) != stage["owner"]):
            errors.append(f"{name}: invalid work-package capability binding")
        if stage.get("optional") is not (name == "publish"):
            errors.append(f"{name}: invalid optional stage")
        if (name == "publish") != (capability == "cap.publishing.publish"):
            errors.append(f"{name}: publishing must stay separate from editing and export")
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
    return errors


if __name__ == "__main__":
    sources = ("project-categories.json", "work-packages.json")
    issues = check(*(json.loads((ROOT / source).read_text(encoding="utf-8")) for source in sources))
    for issue in issues:
        print(issue, file=sys.stderr)
    if issues:
        sys.exit(1)
    print("Project categories, style stacks, video stages and roadmap references passed.")
