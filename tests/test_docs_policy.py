import importlib.util
from pathlib import Path
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location(
    'check_docs', Path(__file__).resolve().parents[1] / 'scripts' / 'check_docs.py'
)
policy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(policy)


class DocumentationPolicyTests(unittest.TestCase):
    def fixture(self, root):
        for name in policy.REQUIRED:
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('# Document\n', encoding='utf-8')

    def test_valid_relative_links_and_external_urls(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            (root / 'README.md').write_text(
                '# Start\n[Plan](docs/PRODUCT.md#purpose)\n'
                '[Web](https://example.com/a)\n`[Code](missing.md)`\n'
                '```text\n[Example](missing.md)\n```\n', encoding='utf-8'
            )
            self.assertEqual(policy.check(root), [])

    def test_missing_document_and_broken_target_are_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            (root / 'SECURITY.md').unlink()
            (root / 'README.md').write_text('[Missing](docs/no.md)\n', encoding='utf-8')
            errors = policy.check(root)
            self.assertTrue(any('SECURITY.md' in error for error in errors))
            self.assertTrue(any('docs/no.md' in error for error in errors))

    def test_link_cannot_escape_repository(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'repo'
            root.mkdir()
            self.fixture(root)
            (root.parent / 'private.md').write_text('private', encoding='utf-8')
            (root / 'README.md').write_text('[Private](../private.md)\n', encoding='utf-8')
            self.assertTrue(any('outside repository' in error for error in policy.check(root)))

    def test_private_asset_types_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            (root / 'workbook.pdf').write_bytes(b'fixture')
            self.assertTrue(any('workbook.pdf' in error for error in policy.check(root)))

    def test_generated_directories_are_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            (root / '.git').mkdir()
            (root / '.git' / 'example.pdf').write_bytes(b'fixture')
            self.assertEqual(policy.check(root), [])


if __name__ == '__main__':
    unittest.main()
