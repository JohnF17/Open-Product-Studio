"""Structural roadmap gate; it cannot judge whether acceptance evidence is true."""

import hashlib
import json
from pathlib import Path
import re
import sys


PHASES = {'component', 'integration', 'public-release'}


def has_text(value):
    return isinstance(value, str) and bool(value.strip())


def id_list(value):
    return (isinstance(value, list) and all(has_text(v) for v in value)
            and len(value) == len(set(value)))


def entries(data, field, errors, owner):
    rows = data.get(field, [])
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        errors.append(f'{owner}: invalid {field} rows')
        return []
    return rows


def ancestors(edges, errors, label):
    """Return predecessor sets. Unknown vertices and cycles make the graph invalid."""
    result = {}
    for start, direct in edges.items():
        seen = set()
        pending = list(direct)
        while pending:
            node = pending.pop()
            if node in seen:
                continue
            seen.add(node)
            if node not in edges:
                errors.append(f'{start}: unknown {label} dependency {node}')
                continue
            pending.extend(edges[node] - seen)
        if start in seen:
            errors.append(f'{start}: {label} dependency cycle')
        result[start] = seen
    return result


def check_metadata(register, root):
    errors = []
    packages = {p['id']: p for p in register['workPackages']}
    caps = {c: p['id'] for p in packages.values() for c in p['capabilities']}
    milestone_edges = {}
    for row in register['milestones']:
        allowed = row.get('allowsDependencyOn')
        if not id_list(allowed):
            errors.append(f"{row['id']}: invalid allowsDependencyOn")
            allowed = []
        milestone_edges[row['id']] = set(allowed)
    allowed = ancestors(milestone_edges, errors, 'milestone')
    hard = {p['id']: set(p['dependencies']) for p in packages.values()}
    hard_ancestors = ancestors(hard, errors, 'component')
    combined = {pid: parents.copy() for pid, parents in hard.items()}
    for pid, p in packages.items():
        for row in entries(p, 'conditionalDependencies', errors, pid):
            target = row.get('package')
            if not has_text(target) or not has_text(row.get('when')) or not has_text(row.get('acceptance')):
                errors.append(f'{pid}: incomplete conditional dependency')
                continue
            if target in combined[pid]:
                errors.append(f'{pid}: repeated dependency {target}')
            combined[pid].add(target)
        stage = p['milestone']
        for dep in combined[pid]:
            if dep in packages and packages[dep]['milestone'] not in allowed[stage] | {stage}:
                errors.append(f'{pid}: milestone {stage} cannot depend on {dep} in {packages[dep]["milestone"]}')
        gate_ids = []
        for row in entries(p, 'externalGateApplicability', errors, pid):
            if not has_text(row.get('gate')) or not has_text(row.get('when')):
                errors.append(f'{pid}: incomplete external gate applicability')
                continue
            gate_ids.append(row['gate'])
        if sorted(gate_ids) != sorted(p['externalPrerequisites']):
            errors.append(f'{pid}: external gate applicability differs from declared gates')
        check_phases(p, packages, caps, hard_ancestors[pid], register['status'], root, errors)
    ancestors(combined, errors, 'conditional/component')
    return errors


def check_phases(p, packages, caps, predecessors, status, root, errors):
    pid = p['id']
    count = len(p['acceptance'])
    rows = entries(p, 'acceptanceEvidence', errors, pid)
    seen, passed = set(), set()
    for row in rows:
        item, phase, state = row.get('item'), row.get('phase'), row.get('state')
        if type(item) is not int or not 1 <= item <= count or not has_text(phase) or phase not in PHASES:
            errors.append(f'{pid}: invalid acceptanceEvidence item or phase')
            continue
        key = (item, phase)
        if key in seen:
            errors.append(f'{pid}: duplicate evidence phase {key}')
        seen.add(key)
        if state not in ('not-run', 'failed', 'passed') or (status == 'design-only' and state != 'not-run'):
            errors.append(f'{pid} A{item}: invalid evidence state for {status}')
        if state == 'passed':
            passed.add(key)
        producers = row.get('producers')
        if not producers or not id_list(producers) or any(i not in packages for i in producers):
            errors.append(f'{pid} A{item}: invalid evidence producers')
            producers = []
        if phase == 'component' and set(producers) - (predecessors | {pid}):
            errors.append(f'{pid} A{item}: component needs a non-ancestor producer')
        optional = set()
        for edge in entries(row, 'conditionalProducers', errors, f'{pid} A{item}'):
            cap, producer = edge.get('capability'), edge.get('producer')
            if (phase == 'component' or not has_text(cap) or not has_text(producer)
                    or caps.get(cap) != producer or cap in optional or producer in producers):
                errors.append(f'{pid} A{item}: invalid conditional producer')
            elif cap:
                optional.add(cap)
    expected = {(i, 'component') for i in range(1, count + 1)}
    if not expected <= seen:
        errors.append(f'{pid}: missing component acceptanceEvidence')
    if p['status'] == 'accepted' and not expected <= passed:
        errors.append(f'{pid}: accepted package lacks passed component evidence')
    if passed:
        if root is None:
            errors.append(f'{pid}: passed evidence requires a local repository')
        else:
            check_receipts(p, root, passed, errors)


def check_receipts(p, root, passed, errors):
    """A receipt attests a particular phase. Structural checks cannot verify reviewer identity."""
    pid = p['id']
    base = root.resolve()
    directory = base / 'docs' / 'acceptance'
    covered = set()
    for target in p.get('evidence', []):
        path = (base / target).resolve()
        if path.suffix != '.json':
            continue
        if not (path == directory / f'{pid}.json' or path.is_relative_to(directory / pid)):
            errors.append(f'{pid}: evidence receipt outside package scope')
            continue
        try:
            record = json.loads(path.read_text(encoding='utf-8'))
            if not isinstance(record, dict) or record.get('package') != pid or not isinstance(record.get('records'), list):
                raise ValueError('wrong receipt package or records')
            for row in record['records']:
                required = ('scope', 'action', 'assertion', 'artifact', 'sha256', 'reviewer', 'revision')
                if not isinstance(row, dict) or any(not has_text(row.get(k)) for k in required):
                    raise ValueError('incomplete evidence record')
                if type(row.get('item')) is not int or not has_text(row.get('phase')):
                    raise ValueError('invalid item or phase')
                key = (row['item'], row['phase'])
                if (key not in passed or row.get('outcome') != 'passed' or
                        not re.fullmatch(r'[0-9a-f]{40}(?:[0-9a-f]{24})?', row['revision'])):
                    raise ValueError(f'unbound phase, revision or outcome for {key}')
                artifact = (base / row['artifact']).resolve()
                if (not artifact.is_relative_to(directory) or artifact == path or not artifact.is_file()
                        or not artifact.stat().st_size
                        or hashlib.sha256(artifact.read_bytes()).hexdigest() != row['sha256']):
                    raise ValueError(f'missing, unsafe or changed evidence artifact for {key}')
                covered.add(key)
        except (OSError, ValueError, RuntimeError) as exc:
            errors.append(f'{pid}: invalid evidence receipt {target}: {exc}')
    if covered != passed:
        errors.append(f'{pid}: passed evidence phases lack matching package receipts')


def check(data, root: Path | None = None) -> list[str]:
    errors = []
    if not isinstance(data, dict) or data.get('schemaVersion') != 1:
        return ['Roadmap must be a schemaVersion 1 object']
    if data.get('status') not in ('design-only', 'implementation'):
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
        if not has_text(p.get('milestone')) or p['milestone'] not in known_milestones:
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
        if status not in ('planned', 'in-progress', 'blocked', 'accepted'):
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
    if not errors:
        errors.extend(check_metadata(data, root))
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
        observed_sources = []
        for e in entries(f, 'evidence', errors, fid):
            if not all(has_text(e.get(k)) for k in ('source', 'observed', 'locator', 'inspection')):
                errors.append(f'{fid}: missing detailed evidence fields')
                continue
            observed_sources.append(e['source'])
        if not observed_sources or set(observed_sources) != set(lists['sources']):
            errors.append(f'{fid}: detailed evidence must support all declared sources')
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


def package_view_errors(markdown, packages):
    """Compare the structured parts of the rendered contracts with their source."""
    blocks = re.split(r'^## (WP\d+): ', markdown, flags=re.M)[1:]
    by_id = dict(zip(blocks[::2], blocks[1::2]))
    errors = []
    if len(by_id) != len(blocks) // 2 or set(by_id) != {p['id'] for p in packages}:
        errors.append('WORK-PACKAGES.md: package headings differ from register')

    for package in packages:
        pid = package['id']
        if pid not in by_id:
            continue
        title, *lines = by_id[pid].splitlines()
        dependencies = ', '.join(package['dependencies']) or 'none'
        gates = ', '.join(package['externalPrerequisites']) or 'none beyond global policy'
        fields = [
            f"**Milestone:** {package['milestone']}. **Dependencies:** {dependencies}. **Status:** {package['status']}.",
            f"**Owner:** {package['owner']}. **Independent acceptance:** {package['reviewer']}. **External gates:** {gates}.",
            f"**Consumes:** {package['consumes']}",
            f"**Produces:** {package['produces']}",
        ]
        for key in ('capabilities', 'files'):
            rendered = ', '.join(f'`{value}`' for value in package[key])
            fields.append(f'**{key.title()}:** {rendered}.')
        if title != package['title'] or any(lines.count(line) != 1 for line in fields):
            errors.append(f'WORK-PACKAGES.md: {pid} contract header differs')

        sections = {}
        section = None
        for line in lines:
            if line.startswith('**'):
                section = line
                sections[section] = []
            elif section and line.startswith('- '):
                sections[section].append(line[2:])
        expected_lists = {
            '**Acceptance and failure behavior:**': package['acceptance'],
            '**Conditional input dependencies (not universal prerequisites):**': [
                f"{d['package']}: {d['when']} {d['acceptance']}" for d in package.get('conditionalDependencies', [])
            ],
            '**External gate applicability:**': [
                f"{g['gate']}: {g['when']}" for g in package.get('externalGateApplicability', [])
            ],
        }
        for heading, expected in expected_lists.items():
            if sections.get(heading, []) != expected:
                errors.append(f'WORK-PACKAGES.md: {pid} differs in {heading}')

        expected_rows = {}
        default_scope = 'Package-owned fixture/contract evidence; live activation needs applicable later gates.'
        for evidence in package['acceptanceEvidence']:
            scope = evidence.get('scope', default_scope)
            conditional = evidence.get('conditionalProducers', [])
            if conditional:
                bindings = ', '.join(f"{b['capability']} \u2192 {b['producer']}" for b in conditional)
                scope += f' Conditional producers: {bindings}.'
            key = (evidence['item'], evidence['phase'])
            expected_rows[key] = (', '.join(evidence['producers']), scope)
        headings = [s for s in sections if s.startswith('**Evidence phase / producer')]
        rows = {}
        valid = len(headings) == 1
        if headings:
            if 'all not-run' in headings[0] and any(e['state'] != 'not-run' for e in package['acceptanceEvidence']):
                valid = False
            for line in sections[headings[0]]:
                match = re.fullmatch(r'(A\d+(?:, A\d+)*): \*\*(component|integration|public-release)\*\*, producer (WP\d+(?:, WP\d+)*)\. (.+)', line)
                if not match:
                    valid = False
                    continue
                items, phase, producers, scope = match.groups()
                for item in items.split(', '):
                    key = (int(item[1:]), phase)
                    if key in rows:
                        valid = False
                    rows[key] = (producers, scope)
        if not valid or rows != expected_rows:
            errors.append(f'WORK-PACKAGES.md: {pid} evidence phases, producers or scopes differ')
    return errors


def check_views(root, register, coverage):
    """Fail CI when a committed reader-facing register view becomes stale."""
    docs = root / 'docs'
    contracts_md = (docs / 'WORK-PACKAGES.md').read_text(encoding='utf-8')
    errors = package_view_errors(contracts_md, register['workPackages'])
    features = coverage['features']
    sources = {s['id']: s for s in coverage['sources']}
    rows = []
    for feature in features:
        owned = feature['workPackages']
        mapping = ', '.join(owned) + ' / ' + ', '.join(feature['milestones']) if owned else feature['reason']
        url = sources[feature['sources'][0]].get('url') or ''
        source = f'[source]({url})' if url.startswith(('http://', 'https://')) else 'owner requirement'
        cells = (feature['id'], feature['title'], feature['disposition'], mapping, source)
        rows.append('| ' + ' | '.join(cells) + ' |')
    coverage_md = (docs / 'FEATURE-COVERAGE.md').read_text(encoding='utf-8')
    actual = [line for line in coverage_md.splitlines() if re.match(r'^\| [A-Z]+-\d+ \| ', line)]
    if sorted(actual) != sorted(rows):
        errors.append('FEATURE-COVERAGE.md: feature rows differ from register')

    explorer = (docs / 'roadmap/explorer.html').read_text(encoding='utf-8')
    embedded = re.findall(r'<script type="application/json" id="data">(.*?)</script>', explorer, flags=re.S)
    expected = {
        'features': features,
        'packages': register['workPackages'],
        'milestones': register['milestones'],
        'sources': coverage['sources'],
        'acceptanceEvidencePolicy': register['acceptanceEvidencePolicy'],
    }
    try:
        in_sync = len(embedded) == 1 and json.loads(embedded[0]) == expected
    except ValueError:
        in_sync = False
    if not in_sync:
        errors.append('explorer.html: embedded register differs from canonical JSON')
    return errors


if __name__ == '__main__':
    repository = Path(__file__).resolve().parents[1]
    try:
        document = json.loads((repository / 'docs/roadmap/work-packages.json').read_text(encoding='utf-8'))
        failures = check(document, root=repository)
        coverage = json.loads((repository / 'docs/roadmap/feature-coverage.json').read_text(encoding='utf-8'))
        if not failures:
            failures.extend(check_coverage(document, coverage))
        if not failures:
            failures.extend(check_views(repository, document, coverage))
    except (OSError, ValueError, TypeError, KeyError) as error:
        failures = [f'Cannot read roadmap: {error}']
    for failure in failures:
        print(f'ERROR: {failure}')
    if failures:
        sys.exit(1)
    print('Roadmap/feature IDs, ownership, dependency graph, coverage and acceptance references passed.')
