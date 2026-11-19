"""Summarize public upstream metadata without credentials, release notes or advisory bodies."""

import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import parse_qs, urlencode, urlsplit


REPO_API = "https://api.github.com/repos/pingdotgg/t3code"
TIMESTAMP = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z")
RECENT_RELEASES = 5


def fetch_page(url):
    with tempfile.TemporaryDirectory() as tmp:
        headers = Path(tmp) / "headers"
        body = Path(tmp) / "body"
        result = subprocess.run([
            "curl", "--disable", "--silent", "--fail", "--proto", "=https",
            "--connect-timeout", "15", "--max-time", "60", "--max-filesize", "32000000",
            "--header", "Accept: application/vnd.github+json",
            "--header", "X-GitHub-Api-Version: 2022-11-28",
            "--user-agent", "Open-Product-Studio-Intake",
            "--dump-header", str(headers), "--output", str(body), "--write-out", "%{http_code}", url,
        ], capture_output=True, text=True, timeout=65)
        status = result.stdout.strip()
        if result.returncode or status != "200":
            raise ValueError(f"HTTP {status} / curl exit {result.returncode}")
        try:
            records = json.loads(body.read_bytes())
        except (ValueError, UnicodeError):
            raise ValueError("invalid JSON response") from None
        if not isinstance(records, list) or any(not isinstance(row, dict) for row in records):
            raise ValueError("unexpected API response shape")
        links = re.findall(r"^Link:\s*(.*)$", headers.read_text(encoding="iso-8859-1"), re.I | re.M)
        return records, ", ".join(links)


def published_at(row):
    stamp = row.get("published_at")
    if not isinstance(stamp, str) or not TIMESTAMP.fullmatch(stamp):
        raise ValueError("invalid publication timestamp")
    return stamp


def releases(page):
    records, _ = page(f"{REPO_API}/releases?per_page={RECENT_RELEASES}")
    lines = [f"{len(records)} recent upstream releases (up to {RECENT_RELEASES})."]
    for row in records:
        release_id = row.get("id")
        if row.get("draft") is not False or type(release_id) is not int or release_id < 1:
            raise ValueError("invalid published release record")
        tag = row.get("tag_name")
        if isinstance(tag, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/+-]{0,95}", tag):
            label = f"`{tag}` (release {release_id})"
        else:
            label = f"release {release_id}"
        lines.append(f"- {published_at(row)} {label}")
    return lines


def next_cursor(link):
    for target, rel in re.findall(r'<([^>]+)>;\s*rel="([^"]+)"', link or ""):
        if rel != "next":
            continue
        parsed = urlsplit(target)
        cursors = parse_qs(parsed.query).get("after", [])
        if (parsed.scheme != "https" or parsed.netloc != "api.github.com" or
                not parsed.path.endswith("/security-advisories") or len(cursors) != 1):
            raise ValueError("invalid next-page link")
        return cursors[0]
    if link and re.search(r'\bnext\b', link):
        raise ValueError("unreadable next-page link")
    return None


def advisories(page):
    params = {"state": "published", "per_page": 100}
    seen = set()
    published = {}
    while True:
        records, link = page(f"{REPO_API}/security-advisories?" + urlencode(params))
        for row in records:
            identifier = row.get("ghsa_id")
            if (row.get("state") != "published" or not isinstance(identifier, str) or
                    not re.fullmatch(r"GHSA(?:-[a-z0-9]{4}){3}", identifier)):
                raise ValueError("invalid published advisory record")
            severity = row.get("severity")
            if severity not in ("critical", "high", "medium", "moderate", "low"):
                severity = "unscored"
            published[identifier] = f"- {published_at(row)} {identifier} ({severity})"
        cursor = next_cursor(link)
        if cursor is None:
            break
        if cursor in seen:
            raise ValueError("repeated advisory page")
        seen.add(cursor)
        params["after"] = cursor
    return [f"{len(published)} published repository advisories.", *sorted(published.values(), reverse=True)]


def report(page=fetch_page):
    failed = False
    for label, read in (("Releases", releases), ("Repository advisories", advisories)):
        try:
            print("\n" + "\n".join(read(page)))
        except (OSError, subprocess.TimeoutExpired, ValueError) as exc:
            reason = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
            print(f"\n{label} unavailable ({reason}). Coverage is incomplete.")
            failed = True
    return int(failed)


if __name__ == "__main__":
    sys.exit(report())
