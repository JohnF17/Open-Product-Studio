"""Bind this fork's declared source baseline to its retained Git objects."""

import hashlib
import json
import unittest
from pathlib import Path

from scripts.upstream_intake import git, output


ROOT = Path(__file__).resolve().parents[1]


class BaselineProvenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / "docs/upstream/manifest.json").read_text("utf-8"))
        cls.pin = cls.manifest["upstreamSha"]
        cls.merge = cls.manifest["integrationCommit"]

    def test_pinned_source_and_toolchain(self):
        self.assertEqual(git(ROOT, "merge-base", "--is-ancestor", self.merge, "HEAD").returncode, 0)
        parents = output(ROOT, "show", "-s", "--format=%P", self.merge).decode().split()
        self.assertEqual(len(parents), 2)
        self.assertIn(self.pin, parents)
        for key, suffix in (("upstreamTree", "^{tree}"), ("upstreamParent", "^")):
            self.assertEqual(output(ROOT, "rev-parse", self.pin + suffix).decode().strip(), self.manifest[key])
        for path, key in (("LICENSE", "sourceLicenseSha256"), ("pnpm-lock.yaml", "rootLockSha256")):
            source = output(ROOT, "show", f"{self.pin}:{path}")
            self.assertEqual(hashlib.sha256(source).hexdigest(), self.manifest[key])
        package = json.loads(output(ROOT, "show", f"{self.pin}:package.json"))
        self.assertEqual(package["engines"]["node"], self.manifest["node"])
        self.assertEqual(package["packageManager"], f"pnpm@{self.manifest['pnpm']}")

    def test_inherited_workflows_are_archived(self):
        source = output(ROOT, "rev-parse", f"{self.pin}:.github/workflows")
        archived = output(ROOT, "rev-parse", "HEAD:.upstream/workflows")
        self.assertEqual(archived, source)
        source_names = set(output(ROOT, "ls-tree", "--name-only", f"{self.pin}:.github/workflows").splitlines())
        active = set(output(ROOT, "ls-tree", "--name-only", "HEAD:.github/workflows").splitlines())
        self.assertEqual(len(source_names), self.manifest["intake"]["archivedWorkflows"])
        self.assertFalse(active & source_names, active & source_names)
