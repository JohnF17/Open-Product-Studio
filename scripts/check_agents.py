"""Checks planning-contract coherence, not runtime authorization or model behavior."""
import json
from pathlib import Path
import sys


def check(register, data):
    if not isinstance(data, dict) or data.get('schemaVersion') != 1 or data.get('status') != 'design-only':
        return ['Expected a version 1 design-only agent contract register']
    errors = []
    caps = {c for p in register['workPackages'] for c in p['capabilities']}
    milestones = {m['id'] for m in register['milestones']}

    def index(field):
        rows = data.get(field)
        if not isinstance(rows, list) or not rows:
            errors.append(f'Missing {field}')
            return {}
        output = {}
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get('id'), str):
                errors.append(f'Invalid {field} row')
                continue
            if row['id'] in output:
                errors.append(f'Duplicate {field} ID: {row["id"]}')
            output[row['id']] = row
        return output

    tools, replies, definitions = index('tools'), index('replyContracts'), index('definitions')
    authority = data.get('authority', {})
    required_authority = dict(definitionIsGrant=False, callerAuthority='server-derived',
                              nativeRoutesRequireQualification=True, modelPolicy='exact-owner-selection',
                              resultApplication='one-logical-application-at-least-once-transport')
    for key, expected in required_authority.items():
        if authority.get(key) != expected:
            errors.append(f'Invalid authority invariant: {key}')
    for tid, tool in tools.items():
        if tool.get('capability') not in caps:
            errors.append(f'{tid}: unknown capability')
        if tool.get('risk') not in {'read', 'private-edit', 'delegate', 'request'}:
            errors.append(f'{tid}: unsupported tool risk; review external authority separately')
    for rid, reply in replies.items():
        maximum, default = reply.get('maxRepairAttempts'), reply.get('defaultRepairAttempts')
        if type(maximum) is not int or type(default) is not int or not 0 <= default <= maximum <= 2:
            errors.append(f'{rid}: repair budget must be bounded by two')
        if reply.get('metadataIssuer') != 'trusted-server':
            errors.append(f'{rid}: metadata must be issued by trusted server')
        if reply.get('version') != 1 or not reply.get('requiredFields'):
            errors.append(f'{rid}: missing version/required fields')
        if set(reply.get('allowedKinds', [])) != {'answer', 'partial', 'abstain', 'failed'}:
            errors.append(f'{rid}: reply kinds must preserve partial/abstain/failure')
    for aid, agent in definitions.items():
        if agent.get('replyContract') not in replies:
            errors.append(f'{aid}: unknown reply contract')
        if not isinstance(agent.get('allowedTools'), list) or any(t not in tools for t in agent['allowedTools']):
            errors.append(f'{aid}: unknown tool reference')
        if agent.get('definitionIsGrant') is not False or agent.get('modelPolicy') != 'exact-owner-selection':
            errors.append(f'{aid}: invalid authority/model policy')
    council = data.get('council', {})
    for key in ('advisoryOnly', 'independentInitialBarrier', 'requiredIndependentReviewer', 'requiresSynthesisReservation'):
        if council.get(key) is not True:
            errors.append(f'Council requires {key}')
    if council.get('silentMemberReplacement') is not False or council.get('milestone') not in milestones:
        errors.append('Invalid council replacement/milestone policy')
    positions, minimum = council.get('defaultPositions'), council.get('minimumSubstantivePositions')
    if type(positions) is not int or type(minimum) is not int or not 1 <= minimum <= positions:
        errors.append('Invalid council quorum')
    dot = data.get('dot', {})
    if dot.get('enabled') is not False or dot.get('instancesPerOwner') != 1 or dot.get('initialExternalActions') != []:
        errors.append('Design must retain one disabled Dot with no initial external actions')
    for channel in dot.get('channels', []):
        if channel.get('enabled') is not False or channel.get('milestone') not in milestones:
            errors.append('Invalid/activated design channel')
    return errors


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    try:
        register = json.loads((root / 'docs/roadmap/work-packages.json').read_text(encoding='utf-8'))
        data = json.loads((root / 'docs/roadmap/agent-contracts.json').read_text(encoding='utf-8'))
        failures = check(register, data)
    except (OSError, ValueError, KeyError, TypeError) as error:
        failures = [f'Invalid contract file: {error}']
    for failure in failures:
        print('ERROR:', failure)
    if failures:
        sys.exit(1)
    print('Design agent/reply/tool references and council/Dot authority invariants passed.')
