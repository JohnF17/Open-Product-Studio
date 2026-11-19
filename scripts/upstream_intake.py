"""Inventory an already-fetched upstream revision without running its code."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]


def git(repo, *args):
    # The reviewed repository can be a partial clone. Missing objects must be
    # fetched separately and deliberately, never as a side effect of this report.
    return subprocess.run(
        ["git", "-C", str(repo), "-c", "protocol.allow=never", *args],
        env={**os.environ, "GIT_NO_LAZY_FETCH": "1", "GIT_OPTIONAL_LOCKS": "0",
             "GIT_NO_REPLACE_OBJECTS": "1"},
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )


def output(repo, *args):
    result = git(repo, *args)
    if result.returncode:
        raise ValueError(result.stderr.decode("utf-8", "replace").strip() or "Git read failed")
    return result.stdout


def compare(repo, baseline, candidate):
    revisions = [
        output(repo, "rev-parse", "--verify", "--end-of-options", ref + "^{commit}").decode().strip()
        for ref in (baseline, candidate)
    ]
    base, target = revisions
    ancestry = git(repo, "merge-base", "--is-ancestor", base, target)
    if ancestry.returncode == 1:
        raise ValueError("Baseline is not a verified ancestor of the candidate in this checkout")
    if ancestry.returncode:
        raise ValueError("Git could not verify candidate ancestry")
    count = int(output(repo, "rev-list", "--count", f"{base}..{target}"))
    raw = output(repo, "diff", "--no-ext-diff", "--no-textconv", "--no-renames",
                 "--name-status", "-z", base, target, "--")
    fields = raw.split(b"\0")[:-1]
    paths = [
        {"change": status.decode("ascii"), "path": os.fsdecode(path)}
        for status, path in zip(fields[::2], fields[1::2], strict=True)
    ]
    return {"baseline": base, "candidate": target, "commits": count, "paths": paths}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", help="a local Git revision, e.g. upstream/main")
    parser.add_argument("--repo", type=Path, default=ROOT, help="checkout containing both revisions")
    parser.add_argument("--json", action="store_true", help="include every path and Git change type")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "docs/upstream/manifest.json").read_text(encoding="utf-8"))
    try:
        report = compare(args.repo, manifest["upstreamSha"], args.candidate)
    except (ValueError, OSError) as error:
        parser.exit(1, f"Intake failed: {error}\n")
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=True))
    else:
        print(f"{report['baseline']} -> {report['candidate']}")
        print(f"{report['commits']} commits, {len(report['paths'])} changed paths")
    return 0


if __name__ == "__main__":
    sys.exit(main())
