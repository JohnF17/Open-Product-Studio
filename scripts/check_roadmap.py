"""Structural roadmap gate; it cannot judge whether acceptance evidence is true."""

import json
from pathlib import Path
import re
import sys


def check(data, root: Path | None = None) -> list[str]:
    errors = []
    if not isinstance(data, dict) or data.get('schemaVersion') != 1:
        return ['Roadmap must be a schemaVersion 1 object']
    if data.get('status') not in {'design-only', 'implementation'}:
        errors.append('Roadmap status must be design-only or implementation')

    def rows(field):
        value = data.get(field)
        if not isinstance(value, list) or not value:
            errors.append(f'{field} must be a nonempty list')
            return []
        valid = []
        for row in value:
            if not isinstance(row, dict) or not isinstance(row.get('id'), str) or not row['id']:
                errors.append(f'{field} contains an invalid row/ID')
            else:
                valid.append(row)
        return valid

    milestones = rows('milestones')
    externals = rows('externalPrerequisites')
    packages = rows('workPackages')
    known_milestones = {m['id'] for m in milestones}
    known_external = {e['id'] for e in externals}
    known_packages = {p['id'] for p in packages}
    for field, entries in [('milestone', milestones), ('external prerequisite', externals)]:
        if len({row['id'] for row in entries}) != len(entries):
            errors.append(f'Duplicate {field} ID')
    seen_packages = set()
    seen_capabilities = set()
    graph = {}
    for p in packages:
        pid = p['id']
        if pid in seen_packages:
            errors.append(f'Duplicate work package {pid}')
        seen_packages.add(pid)
        if not re.fullmatch(r'WP\d{2,}', pid):
            errors.append(f'Invalid work package ID: {pid}')
        for field in ('title', 'consumes', 'produces', 'owner', 'reviewer'):
            if not isinstance(p.get(field), str) or not p[field].strip():
                errors.append(f'{pid}: missing {field}')
        for field in ('dependencies', 'capabilities', 'files', 'acceptance', 'externalPrerequisites', 'evidence'):
            value = p.get(field)
            if not isinstance(value, list) or any(not isinstance(v, str) or not v.strip() for v in value):
                errors.append(f'{pid}: invalid {field} list')
                p = dict(p, **{field: []})
            if field in {'capabilities', 'files', 'acceptance'} and not p.get(field):
                errors.append(f'{pid}: empty {field}')
        if p.get('milestone') not in known_milestones:
            errors.append(f'{pid}: unknown milestone {p.get("milestone")}')
        graph[pid] = p['dependencies']
        for dep in p['dependencies']:
            if dep not in known_packages:
                errors.append(f'{pid}: unknown dependency {dep}')
        for ext in p['externalPrerequisites']:
            if ext not in known_external:
                errors.append(f'{pid}: unknown external prerequisite {ext}')
        for cap in p['capabilities']:
            if not re.fullmatch(r'cap\.[a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*)+', cap):
                errors.append(f'{pid}: invalid capability {cap}')
            if cap in seen_capabilities:
                errors.append(f'Duplicate capability ownership: {cap}')
            seen_capabilities.add(cap)
        status = p.get('status')
        if status not in {'planned', 'in-progress', 'blocked', 'accepted'}:
            errors.append(f'{pid}: invalid status {status}')
        if status == 'accepted':
            if data.get('status') == 'design-only':
                errors.append(f'{pid}: design-only register cannot claim accepted implementation')
            if not p['evidence']:
                errors.append(f'{pid}: accepted work requires evidence')
            for target in p['evidence']:
                if root is None:
                    errors.append(f'{pid}: evidence requires a repository root')
                    continue
                base = root.resolve()
                path = (base / target).resolve()
                if not path.is_relative_to(base) or not path.is_file() or path.stat().st_size == 0:
                    errors.append(f'{pid}: missing/unsafe evidence target {target}')

    visiting, visited = set(), set()

    def visit(pid):
        if pid in visiting:
            errors.append(f'Dependency cycle at {pid}')
            return
        if pid in visited or pid not in graph:
            return
        visiting.add(pid)
        for dep in graph[pid]:
            visit(dep)
        visiting.remove(pid)
        visited.add(pid)

    for pid in graph:
        visit(pid)
    by_id = {p['id']: p for p in packages}
    for p in packages:
        if p.get('status') == 'accepted':
            for dep in graph[p['id']]:
                if dep in by_id and by_id[dep].get('status') != 'accepted':
                    errors.append(f'{p["id"]}: dependency {dep} is not accepted')
    return errors


def check_coverage(register, coverage) -> list[str]:
    if not isinstance(coverage, dict) or coverage.get('schemaVersion') != 1:
        return ['Feature coverage must be a schemaVersion 1 object']
    errors = []
    packages = {p['id']: p for p in register.get('workPackages', []) if isinstance(p, dict) and 'id' in p}
    external = {p['id'] for p in register.get('externalPrerequisites', []) if isinstance(p, dict) and 'id' in p}
    features, sources = coverage.get('features'), coverage.get('sources')
    if not isinstance(features, list) or not isinstance(sources, list):
        return ['Feature coverage requires feature/source lists']
    source_ids = {s['id'] for s in sources if isinstance(s, dict) and isinstance(s.get('id'), str)}
    if len(source_ids) != len(sources):
        errors.append('Duplicate or invalid source ID')
    expected = coverage.get('inventoryIds')
    if not isinstance(expected, list) or any(not isinstance(v, str) for v in expected):
        errors.append('Invalid inventory ID manifest')
        expected = []
    if len(set(expected)) != len(expected):
        errors.append('Duplicate inventory ID')
    feature_ids, reverse = set(), {pid: set() for pid in packages}
    software = {'planned-original', 'planned-extension', 'connector-dependent'}
    other = {'external-human-or-promotion', 'unverified'}
    for f in features:
        if not isinstance(f, dict) or not isinstance(f.get('id'), str):
            errors.append('Invalid feature row')
            continue
        fid = f['id']
        if fid in feature_ids:
            errors.append(f'Duplicate feature {fid}')
        feature_ids.add(fid)
        for field in ('title', 'acceptance', 'reason'):
            if not isinstance(f.get(field), str) or not f[field].strip():
                errors.append(f'{fid}: missing {field}')
        if f.get('evidenceClass') not in {'advertised', 'recorded', 'requirement_only'}:
            errors.append(f'{fid}: invalid evidenceClass')
        if coverage.get('status') == 'design-only' and f.get('implementationStatus') != 'unimplemented':
            errors.append(f'{fid}: design-only feature must be unimplemented')
        disposition = f.get('disposition')
        if disposition not in software | other:
            errors.append(f'{fid}: invalid disposition')
        lists = {}
        for field in ('workPackages', 'milestones', 'externalPrerequisites', 'sources'):
            value = f.get(field)
            if not isinstance(value, list) or any(not isinstance(v, str) for v in value):
                errors.append(f'{fid}: invalid {field} list')
                value = []
            lists[field] = value
        owned = lists['workPackages']
        if disposition in software and not owned:
            errors.append(f'{fid}: software needs a work package')
        if disposition == 'unverified' and owned:
            errors.append(f'{fid}: unverified behavior cannot claim implementation ownership')
        derived = set()
        for pid in owned:
            if pid not in packages:
                errors.append(f'{fid}: unknown work package {pid}')
            else:
                derived.add(packages[pid]['milestone'])
                reverse[pid].add(fid)
        if set(lists['milestones']) != derived:
            errors.append(f'{fid}: milestone mapping differs from owned work packages')
        for sid in lists['sources']:
            if sid not in source_ids:
                errors.append(f'{fid}: unknown source {sid}')
        if not lists['sources']:
            errors.append(f'{fid}: source/requirement reference required')
        for eid in lists['externalPrerequisites']:
            if eid not in external:
                errors.append(f'{fid}: unknown external prerequisite {eid}')
    if set(expected) != feature_ids:
        errors.append('Feature inventory rows differ from inventory ID manifest')
    for pid, linked in reverse.items():
        declared = packages[pid].get('requirementIds')
        if not isinstance(declared, list) or any(not isinstance(v, str) for v in declared) or set(declared) != linked:
            errors.append(f'{pid}: reverse requirement mapping differs from feature ownership')
    return errors


if __name__ == '__main__':
    repository = Path(__file__).resolve().parents[1]
    try:
        document = json.loads((repository / 'docs/roadmap/work-packages.json').read_text(encoding='utf-8'))
        failures = check(document, root=repository)
        coverage = json.loads((repository / 'docs/roadmap/feature-coverage.json').read_text(encoding='utf-8'))
        if not failures:
            failures.extend(check_coverage(document, coverage))
    except (OSError, ValueError) as error:
        failures = [f'Cannot read roadmap: {error}']
    for failure in failures:
        print(f'ERROR: {failure}')
    if failures:
        sys.exit(1)
    print('Roadmap/feature IDs, ownership, dependency graph, coverage and acceptance references passed.')
