"""Small structural documentation gate; not a security or factual-content scanner."""

from pathlib import Path
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
    'docs/research/current-demos.md',
)
# private-research/ is intentionally local and excluded by .gitignore.
IGNORED = {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', 'private-research'}
RESTRICTED = {'.pdf', '.vtt', '.srt', '.asar', '.mp4', '.mp3'}
LINK = re.compile(r'!?\[[^\]\n]*\]\(([^\n)]+)\)')


def check(root: Path) -> list[str]:
    root = root.resolve()
    errors = []
    for name in REQUIRED:
        path = root / name
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f'Missing or empty required document: {name}')
    files = sorted(
        path for path in root.rglob('*')
        if path.is_file() and not any(part in IGNORED for part in path.relative_to(root).parts)
    )
    for path in files:
        relative = path.relative_to(root)
        if path.suffix.lower() in RESTRICTED:
            errors.append(f'Restricted research/media asset: {relative}; review and change policy explicitly if needed')
        if path.suffix.lower() != '.md':
            continue
        text = path.read_text(encoding='utf-8')
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
