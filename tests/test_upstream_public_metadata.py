import contextlib
import importlib.util
import io
from pathlib import Path
import unittest


SPEC = importlib.util.spec_from_file_location(
    "upstream_public_metadata", Path(__file__).resolve().parents[1] / "scripts/upstream_public_metadata.py"
)
intake = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(intake)


class UpstreamMetadataTests(unittest.TestCase):
    def test_hostile_release_text_is_excluded(self):
        def page(url):
            return [{
                "id": 42, "published_at": "2026-11-10T00:00:00Z", "draft": False,
                "tag_name": "bad\n# text", "body": "unsafe text", "name": "unsafe title",
            }], None

        summary = "\n".join(intake.releases(page))
        self.assertIn("42", summary)
        self.assertNotIn("unsafe", summary)
        self.assertNotIn("# text", summary)

    def test_pagination_restores_fixed_endpoint_and_filters(self):
        urls = []
        ghsa = {"ghsa_id": "GHSA-2222-3333-4444", "state": "published",
                "published_at": "2026-01-01T00:00:00Z", "severity": "high", "description": "external prose"}

        def page(url):
            urls.append(url)
            if len(urls) == 1:
                link = '<https://api.github.com/repositories/1/security-advisories?after=a%2Fb>; rel="next"'
                return [ghsa], link
            return [ghsa], None

        summary = "\n".join(intake.advisories(page))
        self.assertEqual(len(urls), 2)
        self.assertTrue(urls[1].startswith(intake.REPO_API + "/security-advisories?"))
        self.assertIn("state=published", urls[1])
        self.assertIn("after=a%2Fb", urls[1])
        self.assertEqual(summary.count(ghsa["ghsa_id"]), 1)
        self.assertNotIn("external prose", summary)

    def test_unusable_external_or_cyclic_page_cannot_be_complete(self):
        for link in [
            '<https://other.example/repositories/1/security-advisories?after=a>; rel="next"',
            '<https://api.github.com/repositories/1/security-advisories?foo=a>; rel="next"',
            '<https://api.github.com/repositories/1/security-advisories?after=a>; rel="next"',
        ]:
            with self.subTest(link=link), self.assertRaises(ValueError):
                intake.advisories(lambda url: ([], link))

    def test_partial_failure_keeps_completed_source_and_exits_nonzero(self):
        def page(url):
            if "/releases?" in url:
                raise ValueError("HTTP 403")
            return [], None

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertNotEqual(intake.report(page), 0)
        self.assertIn("HTTP 403", output.getvalue())
        self.assertIn("0 published", output.getvalue())
