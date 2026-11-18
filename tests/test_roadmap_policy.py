import copy
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
        status='planned', evidence=[]
    )
    return dict(schemaVersion=1, status='design-only',
                milestones=[dict(id='M0A', title='Desktop')],
                externalPrerequisites=[dict(id='E1')], workPackages=[package])


class RoadmapPolicyTests(unittest.TestCase):
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
            data['workPackages'][0]['evidence'] = ['docs/acceptance/WP01.md']
            self.assertEqual(policy.check(data, root=root), [])
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
                               reason='Original scoped workflow', implementationStatus='unimplemented')])


class CoveragePolicyTests(unittest.TestCase):
    def fixture(self):
        register = fixture()
        register['workPackages'][0]['requirementIds'] = ['F-001']
        return register, coverage_fixture()

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
