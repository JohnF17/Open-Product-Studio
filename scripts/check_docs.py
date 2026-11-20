"""Small structural documentation gate; not a security or factual-content scanner."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import re
import sys
from urllib.parse import unquote, urlsplit


REQUIRED = (
    'README.md', 'LICENSE', 'CONTRIBUTING.md', 'AGENTS.md', 'SECURITY.md',
    'docs/PRODUCT.md', 'docs/ARCHITECTURE.md', 'docs/SECURITY-MODEL.md',
    'docs/CI.md', 'docs/LAUNCH.md', 'docs/MILESTONES.md',
    'docs/RECOMMENDATIONS.md', 'docs/UPSTREAM.md',
    'docs/PLATFORM-BOUNDARIES.md', 'docs/TOOLING.md',
    'docs/ROADMAP.md', 'docs/WORK-PACKAGES.md',
    'docs/FEATURE-COVERAGE.md', 'docs/roadmap/feature-coverage.json',
    'docs/PLATFORMS.md', 'docs/roadmap/explorer.html',
    'docs/roadmap/work-packages.json',
    'docs/AGENT-HARNESS.md', 'docs/PROACTIVE-DOT.md',
    'docs/roadmap/agent-contracts.json',
    'docs/plans/2026-11-12-open-product-studio.md',
    'docs/research/t3-code.md', 'docs/research/free-model-access.md',
    'docs/research/episodes.md', 'docs/research/engineering-review-resolution.md',
    'docs/research/current-demos.md', 'docs/PAYMENTS.md', 'docs/SERVICES.md', 'docs/PROJECT-EXPERIENCE.md',
)
# private-research/ is intentionally local and excluded by .gitignore.
IGNORED = {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', 'private-research'}
RESTRICTED = {'.pdf', '.vtt', '.srt', '.asar', '.mp4', '.webm', '.mp3'}
# Mode 100644 blobs individually reviewed against the active baseline manifest.
# A new path or a changed asset needs a new review, including its distribution rights.
PINNED_MEDIA = {
    '.repos/alchemy-effect/website/public/blog/beta-77/alchemy-cli.mp4':'b724dd6b740caafc245c56740305bc8dcf3db498',
    'apps/web/src/assets/notification-completion.mp3':'1955f5eb05f16bf90d2290dc14f46eaa210f4958',
    'apps/web/src/assets/notification-input.mp3':'07e10da3bd574a1d8f2f913644bfae69c6ba5c55',
    'apps/web/src/assets/snap-shot-click.mp3':'6a512d22a5c69aa5b024695288db74022b9feeb1',
    'apps/web/src/assets/snap-shot-whoosh.mp3':'e982d49b17b49abdf830234cb451938ecfe692fa',
}
LINK = re.compile(r'!?\[[^\]\n]*\]\(([^\n)]+)\)')

# Generated from the Studio renderer using a synthetic project. Capture provenance
# and SHA-256 are in the receipts under docs/acceptance/WP08. Review replacements explicitly.
STUDIO_WINDOW_RECORDINGS = {
    'docs/acceptance/WP24/clipper-marks/desktop-marks.webm': '9fd4c0b5b81089b79aeab8c4ef65051a6c75a3dc',
    'docs/acceptance/WP11/video-series/desktop-series.webm': 'b1b531253e7668a3668ddfc9790240bdde7f6f9a',
    'docs/acceptance/WP08/style-audition/desktop-motion.webm': 'c03dcc95c797cbb0dfd069beb3a762b4125fd174',
    'docs/acceptance/WP08/affiliate/builder-window.webm': '974c363bb1656cd7e46e588600b8a8e2ddf8b658',
    'docs/acceptance/WP08/categories/entry-resume-edit.webm': '81fb9c80d556428648f0a9f10d7c6e062c9e884a',
    'docs/acceptance/WP08/builder-window.mp4': '83266c9147a27423aad09c8ee8ceac069797bb7c',
    'docs/acceptance/WP08/manuscript/delivery-window.webm': '503b230134bd6df4946d8cd457be5bf093471fb5',
    'docs/acceptance/WP08/tour/tour-window.webm': '386e24ec2f1073283d2bce0c67ed9531cc4e87a1',
    'docs/acceptance/WP08/video-cues/video-cue-sheet.webm': '41e1cf9b556e932df60fbb34298d544bd555e658',
}


def public_paths(root):
    """Enumerate candidate paths without descending into excluded working material."""
    git_dir = root / '.git'
    if not git_dir.is_file() and not (git_dir / 'HEAD').is_file():
        files = []
        for directory, subdirs, names in os.walk(root, followlinks=False):
            subdirs[:] = [name for name in subdirs if name not in IGNORED]
            files.extend(Path(directory) / name for name in names)
        return files, {}

    def git(*args):
        return subprocess.run(['git', '-C', str(root), *args], capture_output=True, check=True,
                              env={**os.environ, 'GIT_OPTIONAL_LOCKS':'0'}).stdout

    names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split(b'\0')
    files = [root / os.fsdecode(n) for n in names if n]
    if not (root / 'apps' / 'desktop' / 'package.json').exists():
        return files, {}
    manifest = json.loads((root / 'docs/upstream/manifest.json').read_text(encoding='utf-8'))
    pin = manifest.get('upstreamSha')
    if not isinstance(pin, str) or not re.fullmatch(r'[0-9a-f]{40}', pin):
        raise ValueError('Baseline manifest requires a full upstream commit SHA')
    try:
        tree = git('ls-tree', '-r', '-z', pin)
    except subprocess.CalledProcessError as exc:
        raise ValueError(f'Import requires the pinned Git tree {pin} to check upstream provenance') from exc
    pinned = {}
    for entry in tree.rstrip(b'\0').split(b'\0'):
        metadata, name = entry.split(b'\t', 1)
        if name.lower().endswith(b'.md'):
            pinned[os.fsdecode(name)] = metadata.split()[2].decode('ascii')
    return files, pinned


def blob_id(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def private_source(relative):
    return ('private-research' in (part.lower() for part in relative.parts) or
            relative.name.lower() in {'passwords.txt', '.env', '.env.local'})


def check(root: Path) -> list[str]:
    root = root.resolve()
    errors = []
    for name in REQUIRED:
        path = root / name
        if path.is_symlink() or not path.resolve().is_relative_to(root) or not path.is_file() or path.stat().st_size == 0:
            errors.append(f'Missing or unsafe required document: {name}')
    try:
        files, pinned = public_paths(root)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        return errors + [f'Cannot enumerate public candidate: {error}']

    for path in files:
        relative = path.relative_to(root)
        if private_source(relative):
            errors.append(f'Private file in public candidate: {relative.as_posix()}')
            continue
        suffix = path.suffix.lower()
        if suffix not in RESTRICTED and suffix != '.md':
            continue
        resolved = path.resolve()
        if path.is_symlink() or not resolved.is_relative_to(root):
            # Imported Git links can be preserved as metadata without following them.
            if (suffix == '.md' and path.is_symlink() and
                    blob_id(os.fsencode(os.readlink(path))) == pinned.get(relative.as_posix())):
                continue
            errors.append(f'Unsafe documentation or asset path: {relative.as_posix()}')
            continue
        if private_source(resolved.relative_to(root)):
            errors.append(f'Documentation or asset resolves to private material: {relative.as_posix()}')
            continue
        if not path.is_file():  # Deleted working-tree path still in the Git index.
            continue
        if suffix in RESTRICTED:
            name = relative.as_posix()
            expected = PINNED_MEDIA.get(name) or STUDIO_WINDOW_RECORDINGS.get(name)
            if expected is None or blob_id(path.read_bytes()) != expected:
                errors.append(f'Restricted research/media asset: {relative}; explicit review required')
            continue
        raw = path.read_bytes()
        baseline = pinned.get(relative.as_posix())
        if (relative.as_posix() not in REQUIRED and baseline and
                (blob_id(raw) == baseline or blob_id(raw.replace(b'\r\n', b'\n')) == baseline)):
            continue
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            errors.append(f'{relative}: document must be UTF-8')
            continue
        text = re.sub(r'(?ms)^\s*(`{3,}|~{3,}).*?^\s*\1\s*$', '', text)
        text = re.sub(r'`[^`\n]*`', '', text)
        for match in LINK.finditer(text):
            target = match.group(1).strip()
            if target.startswith('<') and '>' in target:
                target = target[1:target.index('>')]
            else:
                target = target.split(' "', 1)[0]
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            destination = (path.parent / unquote(parsed.path)).resolve()
            if not destination.is_relative_to(root):
                errors.append(f'{relative}: link outside repository: {target}')
            elif private_source(destination.relative_to(root)):
                errors.append(f'{relative}: link to private content')
            elif not destination.exists():
                errors.append(f'{relative}: broken local link: {target}')
    return errors


if __name__ == '__main__':
    failures = check(Path(__file__).resolve().parents[1])
    for failure in failures:
        print(f'ERROR: {failure}')
    if failures:
        sys.exit(1)
    print('Documentation structure and local targets passed.')
