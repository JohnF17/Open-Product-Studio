import subprocess
import tempfile
import unittest
from pathlib import Path

from scripts.upstream_intake import compare


class UpstreamIntakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        self.git("config", "commit.gpgsign", "false")
        self.git("config", "core.hooksPath", ".absent-hooks")
        (self.repo / "README.md").write_text("baseline", encoding="utf-8")
        self.git("add", "README.md")
        self.git("commit", "-qm", "baseline")
        self.base = self.git("rev-parse", "HEAD")

    def git(self, *args):
        return subprocess.check_output(
            ["git", "-C", str(self.repo), *args], text=True
        ).strip()

    def test_diff_includes_deletions_and_preserves_paths_with_spaces(self):
        self.git("rm", "-q", "README.md")
        (self.repo / "with spaces.txt").write_text("addition", encoding="utf-8")
        self.git("add", "with spaces.txt")
        self.git("commit", "-qm", "next")
        report = compare(self.repo, self.base, "HEAD")
        self.assertEqual(report["commits"], 1)
        self.assertEqual(report["paths"], [
            {"change": "D", "path": "README.md"},
            {"change": "A", "path": "with spaces.txt"},
        ])
        with self.assertRaisesRegex(ValueError, "ancestor"):
            compare(self.repo, "HEAD", self.base)

    def test_no_changes_and_option_like_input(self):
        self.assertEqual(compare(self.repo, self.base, "HEAD")["paths"], [])
        with self.assertRaises(ValueError):
            compare(self.repo, self.base, "--help")
