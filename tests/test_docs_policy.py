import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


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

    def test_pinned_media_requires_matching_path_and_content(self):
        import hashlib
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            asset = root / 'notice.mp3'
            asset.write_bytes(b'sound')
            oid = hashlib.sha1(b'blob 5' + bytes([0]) + b'sound').hexdigest()
            with patch.dict(policy.PINNED_MEDIA, {'notice.mp3':oid}):
                self.assertEqual(policy.check(root), [])
                asset.write_bytes(b'changed')
                self.assertTrue(policy.check(root))
                asset.unlink()
                (root / 'new.mp3').write_bytes(b'sound')
                self.assertTrue(policy.check(root))

    def test_pinned_markdown_edits_and_private_links_are_checked(self):
        import hashlib
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            doc = root/'old.md'
            original = b'[Old](gone.md)'
            doc.write_bytes(original)
            oid = hashlib.sha1(b'blob 14' + bytes([0]) + original).hexdigest()
            with patch.object(policy,'public_paths',return_value=([doc], {'old.md':oid})):
                self.assertEqual(policy.check(root), [])
                doc.write_text('[Edited](gone.md)')
                self.assertTrue(policy.check(root))
            (root/'private-research').mkdir()
            (root/'private-research'/'notes.txt').write_text('fixture')
            doc.write_text('[Source](private-research/notes.txt)')
            self.assertTrue(policy.check(root))

    def test_studio_recording_requires_reviewed_path_and_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            asset = root / 'docs/acceptance/WP08/fixture.mp4'
            asset.parent.mkdir(parents=True, exist_ok=True)
            asset.write_bytes(b'synthetic frames')
            reviewed = {asset.relative_to(root).as_posix(): policy.blob_id(asset.read_bytes())}
            with patch.dict(policy.STUDIO_WINDOW_RECORDINGS, reviewed):
                self.assertEqual(policy.check(root), [])
                asset.write_bytes(b'different frames')
                self.assertTrue(policy.check(root))
                asset.unlink()
                (asset.parent / 'different.mp4').write_bytes(b'synthetic frames')
                self.assertTrue(policy.check(root))

    def test_tracked_private_candidate_rejected_without_opening(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            candidate = root/'private-research'/'secret.txt'
            with patch.object(policy,'public_paths',return_value=([candidate],{})):
                self.assertTrue(policy.check(root))

    def test_generated_directories_are_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            (root / '.git').mkdir()
            (root / '.git' / 'example.pdf').write_bytes(b'fixture')
            self.assertEqual(policy.check(root), [])


if __name__ == '__main__':
    unittest.main()
