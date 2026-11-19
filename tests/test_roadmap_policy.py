import copy
import hashlib
import json
import importlib.util
from pathlib import Path
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location(
    'check_roadmap', Path(__file__).resolve().parents[1] / 'scripts' / 'check_roadmap.py'
)
policy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(policy)


def fixture():
    package = dict(
        id='WP01', title='Foundation', milestone='M0A', dependencies=[],
        capabilities=['cap.project.create'], files=['apps/server/src/studio/project.ts'],
        consumes='Authenticated request', produces='Project receipt',
        acceptance=['Unauthorized access is rejected'], owner='platform owner',
        reviewer='independent reviewer', externalPrerequisites=['E1'],
        status='planned', evidence=[],
        acceptanceEvidence=[dict(item=1, phase='component', producers=['WP01'], state='not-run')],
        externalGateApplicability=[dict(gate='E1', when='Publishing the first installer')]
    )
    return dict(schemaVersion=1, status='design-only',
                milestones=[dict(id='M0A', title='Desktop', allowsDependencyOn=[])],
                externalPrerequisites=[dict(id='E1')], workPackages=[package])


class RoadmapPolicyTests(unittest.TestCase):
    def test_acceptance_metadata_rejects_wrong_phase_producer_state_or_item(self):
        for field, value in [('phase','unrecognized'), ('producers',['WP99']), ('state','passed'), ('item',2),
                             ('item',True), ('conditionalProducers',[{'capability':'cap.unknown','producer':'WP01'}])]:
            with self.subTest(field=field):
                data = fixture()
                data['workPackages'][0]['acceptanceEvidence'][0][field] = value
                self.assertTrue(policy.check(data))

    def test_missing_or_duplicate_acceptance_metadata(self):
        for mutation in (lambda rows: rows.clear(), lambda rows: rows.append(rows[0].copy())):
            data = fixture()
            mutation(data['workPackages'][0]['acceptanceEvidence'])
            self.assertTrue(policy.check(data))

    def test_conditional_dependencies_and_gate_applicability(self):
        for field, value in [('conditionalDependencies',[dict(package=d, when='With mail', acceptance='Inbox enabled')])
                             for d in ('WP99','WP01')] + [('externalGateApplicability',[]),
                             ('externalGateApplicability',[dict(gate='E9',when='Later')])]:
            with self.subTest(field=field, value=value):
                data = fixture()
                data['workPackages'][0][field] = value
                self.assertTrue(policy.check(data))

    def test_later_packages_cannot_produce_early_component_evidence(self):
        data = fixture()
        early = data['workPackages'][0]
        late = copy.deepcopy(early)
        late.update(id='WP02', dependencies=['WP01'], capabilities=['cap.project.other'])
        late['acceptanceEvidence'][0]['producers'] = ['WP02']
        data['workPackages'].append(late)
        early['acceptanceEvidence'][0]['producers'] = ['WP02']
        self.assertTrue(policy.check(data))
        early['acceptanceEvidence'][0]['producers'] = ['WP01']
        early['acceptanceEvidence'].append(dict(item=1,phase='integration',producers=['WP01','WP02'],state='not-run'))
        self.assertEqual(policy.check(data), [])

    def test_milestone_dependency_direction_and_policy(self):
        data = fixture()
        data['milestones'].append(dict(id='M2', title='Later', allowsDependencyOn=['M0A']))
        early = data['workPackages'][0]
        late = copy.deepcopy(early)
        late.update(id='WP02', milestone='M2', capabilities=['cap.project.other'])
        late['acceptanceEvidence'][0]['producers'] = ['WP02']
        early['dependencies'] = ['WP02']
        data['workPackages'].append(late)
        self.assertTrue(policy.check(data))
        early['dependencies'] = []
        late['dependencies'] = ['WP01']
        self.assertEqual(policy.check(data), [])
        data['milestones'][0]['allowsDependencyOn'] = ['M2']
        self.assertTrue(policy.check(data))

    def test_readme_alone_cannot_certify_package(self):
        data = fixture()
        data['status'] = 'implementation'
        data['workPackages'][0].update(status='accepted',evidence=['README.md'])
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'README.md').write_text('Readme')
            self.assertTrue(policy.check(data,root))

    def test_valid_planned_register(self):
        self.assertEqual(policy.check(fixture()), [])

    def test_unknown_and_cyclic_dependencies(self):
        data = fixture()
        second = copy.deepcopy(data['workPackages'][0])
        second.update(id='WP02', dependencies=['WP01'], capabilities=['cap.project.edit'])
        data['workPackages'].append(second)
        data['workPackages'][0]['dependencies'] = ['WP02', 'WP99']
        errors = policy.check(data)
        self.assertTrue(any('WP99' in error for error in errors))
        self.assertTrue(any('cycle' in error.lower() for error in errors))

    def test_duplicate_package_and_capability_ownership(self):
        data = fixture()
        data['workPackages'].append(copy.deepcopy(data['workPackages'][0]))
        errors = policy.check(data)
        self.assertTrue(any('Duplicate work package' in error for error in errors))
        self.assertTrue(any('Duplicate capability' in error for error in errors))

    def test_missing_owner_gate_or_acceptance(self):
        data = fixture()
        data['workPackages'][0].update(owner='', milestone='M99', acceptance=[])
        errors = policy.check(data)
        self.assertTrue(any('owner' in error for error in errors))
        self.assertTrue(any('M99' in error for error in errors))
        self.assertTrue(any('acceptance' in error for error in errors))

    def test_unknown_external_prerequisite(self):
        data = fixture()
        data['workPackages'][0]['externalPrerequisites'] = ['E99']
        self.assertTrue(any('E99' in error for error in policy.check(data)))

    def test_bad_shapes_are_errors_not_exceptions(self):
        for data in [None, [], {}, {'schemaVersion': 1, 'workPackages': [None]},
                     dict(fixture(), workPackages='WP01')]:
            with self.subTest(data=data):
                self.assertTrue(policy.check(data))

    def test_accepted_package_requires_local_evidence(self):
        data = fixture()
        data['status'] = 'implementation'
        data['workPackages'][0]['status'] = 'accepted'
        self.assertTrue(any('evidence' in error.lower() for error in policy.check(data)))
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            evidence = root / 'docs' / 'acceptance' / 'WP01.md'
            evidence.parent.mkdir(parents=True)
            evidence.write_text('Independent acceptance evidence', encoding='utf-8')
            package = data['workPackages'][0]
            package['evidence'] = ['docs/acceptance/WP01.json']
            package['acceptanceEvidence'][0]['state'] = 'passed'
            record = dict(item=1, phase='component', revision='1' * 40, scope='fixture', action='launch',
                          assertion='Unauthorized access is rejected', reviewer='release reviewer', outcome='passed',
                          artifact='docs/acceptance/WP01.md', sha256=hashlib.sha256(evidence.read_bytes()).hexdigest())
            receipt = evidence.parent / 'WP01.json'
            receipt.write_text(json.dumps(dict(package='WP01', records=[record])), encoding='utf-8')
            self.assertEqual(policy.check(data, root=root), [])
            evidence.write_text('A different result for the same operation', encoding='utf-8')
            self.assertTrue(any('changed evidence' in e for e in policy.check(data, root)))
            record['phase'] = 'public-release'
            receipt.write_text(json.dumps(dict(package='WP01', records=[record])), encoding='utf-8')
            self.assertTrue(any('unbound phase' in e for e in policy.check(data, root)))
            data['workPackages'][0]['evidence'] = ['../outside.md']
            self.assertTrue(any('evidence' in error.lower() for error in policy.check(data, root=root)))

    def test_design_only_cannot_claim_accepted_work(self):
        data = fixture()
        data['workPackages'][0]['status'] = 'accepted'
        self.assertTrue(any('design-only' in error for error in policy.check(data)))

    def test_accepted_child_requires_accepted_dependencies(self):
        data = fixture()
        data['status'] = 'implementation'
        child = copy.deepcopy(data['workPackages'][0])
        child.update(id='WP02', capabilities=['cap.project.edit'], dependencies=['WP01'],
                     status='accepted', evidence=['docs/acceptance/WP02.md'])
        data['workPackages'].append(child)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            evidence = root / child['evidence'][0]
            evidence.parent.mkdir(parents=True)
            evidence.write_text('Recorded independent acceptance', encoding='utf-8')
            self.assertTrue(any('not accepted' in error for error in policy.check(data, root=root)))


def coverage_fixture():
    return dict(schemaVersion=1, status='design-only', inventoryIds=['F-001'], sources=[dict(id='SRC-1', url='https://example.com')],
                features=[dict(id='F-001', title='Create project', evidenceClass='advertised',
                               disposition='planned-original', workPackages=['WP01'],
                               milestones=['M0A'], externalPrerequisites=['E1'],
                               sources=['SRC-1'], acceptance='Reject unauthorized create',
                               reason='Original scoped workflow', implementationStatus='unimplemented',
                               evidence=[dict(source='SRC-1', locator='Project creation', inspection='body_retrieved', observed='2026-11-18')])])


class CoveragePolicyTests(unittest.TestCase):
    def fixture(self):
        register = fixture()
        register['workPackages'][0]['requirementIds'] = ['F-001']
        return register, coverage_fixture()

    def test_qualification_custody_and_transfer_keep_later_evidence_separate(self):
        register_path = Path(__file__).resolve().parents[1] / 'docs/roadmap/work-packages.json'
        register = json.loads(register_path.read_text(encoding='utf-8'))
        packages = {p['id']: p for p in register['workPackages']}
        contracts = [
            ('WP05', 5, {'WP05', 'WP53'}),
            ('WP06', 7, {'WP06', 'WP34'}),
            ('WP12', 3, {'WP12'}),
            ('WP34', 8, {'WP34'}),
        ]
        for pid, item, producers in contracts:
            with self.subTest(package=pid, item=item):
                rows = {r['phase']: r for r in packages[pid]['acceptanceEvidence'] if r['item'] == item}
                self.assertEqual(rows['component']['producers'], [pid])
                self.assertEqual(set(rows['integration']['producers']), producers)
        transfer = next(r for r in packages['WP34']['acceptanceEvidence']
                        if r['item'] == 8 and r['phase'] == 'integration')
        bindings = {r['capability']: r['producer'] for r in transfer['conditionalProducers']}
        self.assertEqual(bindings, {
            'cap.campaigns.send': 'WP26',
            'cap.publishing.publish': 'WP28',
            'cap.dot.identity': 'WP60',
            'cap.dot.mail': 'WP62',
            'cap.dot.browser': 'WP63',
            'cap.dot.phone': 'WP65',
        })

    def test_generated_views_detect_json_markdown_and_phase_drift(self):
        root = Path(__file__).resolve().parents[1]
        register = json.loads((root/'docs/roadmap/work-packages.json').read_text(encoding='utf-8'))
        coverage = json.loads((root/'docs/roadmap/feature-coverage.json').read_text(encoding='utf-8'))
        package = register['workPackages'][0]
        package['acceptance'][0] = 'New criterion lacking a rendered entry'
        package['acceptanceEvidence'][0]['scope'] = 'Revised evidence scope'
        coverage['features'][0]['title'] = 'Revised title'
        errors = policy.check_views(root, register, coverage)
        for name in ('WORK-PACKAGES.md','FEATURE-COVERAGE.md','explorer.html'):
            self.assertTrue(any(name in e for e in errors),name)

    def test_missing_detailed_source_evidence_is_rejected(self):
        register, coverage = self.fixture()
        coverage['features'][0]['evidence'] = []
        self.assertTrue(policy.check_coverage(register,coverage))

    def test_complete_forward_reverse_mapping(self):
        self.assertEqual(policy.check_coverage(*self.fixture()), [])

    def test_software_cannot_drop_its_work_package(self):
        register, coverage = self.fixture()
        coverage['features'][0]['workPackages'] = []
        self.assertTrue(any('work package' in error for error in policy.check_coverage(register, coverage)))

    def test_unknown_source_package_and_gate(self):
        register, coverage = self.fixture()
        coverage['features'][0].update(sources=['MISSING'], workPackages=['WP99'], milestones=['M99'])
        errors = policy.check_coverage(register, coverage)
        for marker in ['MISSING', 'WP99', 'milestone']:
            self.assertTrue(any(marker in error for error in errors))

    def test_reverse_mapping_and_duplicate_features(self):
        register, coverage = self.fixture()
        register['workPackages'][0]['requirementIds'] = ['UNKNOWN']
        coverage['features'].append(copy.deepcopy(coverage['features'][0]))
        errors = policy.check_coverage(register, coverage)
        self.assertTrue(any('Duplicate feature' in error for error in errors))
        self.assertTrue(any('reverse' in error for error in errors))

    def test_external_and_unverified_items_need_explicit_reason(self):
        register, coverage = self.fixture()
        for disposition in ['external-human-or-promotion', 'unverified']:
            with self.subTest(disposition=disposition):
                row = coverage['features'][0]
                row.update(disposition=disposition, workPackages=[], milestones=[], reason='')
                self.assertTrue(any('reason' in error for error in policy.check_coverage(register, coverage)))

    def test_evidence_class_and_implementation_status_are_not_inferred(self):
        register, coverage = self.fixture()
        coverage['features'][0].update(evidenceClass='tested', implementationStatus='implemented')
        errors = policy.check_coverage(register, coverage)
        self.assertTrue(any('evidenceClass' in error for error in errors))
        self.assertTrue(any('unimplemented' in error for error in errors))

    def test_entire_inventory_row_cannot_disappear(self):
        register, coverage = self.fixture()
        coverage['features'] = []
        self.assertTrue(any('inventory' in error for error in policy.check_coverage(register, coverage)))


if __name__ == '__main__':
    unittest.main()
