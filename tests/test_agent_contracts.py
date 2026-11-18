import copy
import importlib.util
from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('check_agents', ROOT / 'scripts/check_agents.py')
policy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(policy)


class AgentContractPolicyTests(unittest.TestCase):
    def setUp(self):
        self.register = json.loads((ROOT / 'docs/roadmap/work-packages.json').read_text(encoding='utf-8'))
        self.contracts = json.loads((ROOT / 'docs/roadmap/agent-contracts.json').read_text(encoding='utf-8'))

    def test_current_design_contracts_are_consistent(self):
        self.assertEqual(policy.check(self.register, self.contracts), [])

    def test_tool_and_reply_references_must_resolve(self):
        self.contracts['definitions'][0].update(replyContract='missing', allowedTools=['missing'])
        errors = policy.check(self.register, self.contracts)
        self.assertTrue(any('reply' in e for e in errors))
        self.assertTrue(any('tool' in e for e in errors))

    def test_discovery_cannot_become_authority(self):
        self.contracts['authority']['definitionIsGrant'] = True
        self.contracts['authority']['nativeRoutesRequireQualification'] = False
        self.assertTrue(policy.check(self.register, self.contracts))

    def test_reply_repair_and_receipt_authority_are_bounded(self):
        self.contracts['replyContracts'][0].update(maxRepairAttempts=99, metadataIssuer='model')
        errors = policy.check(self.register, self.contracts)
        self.assertTrue(any('repair' in e for e in errors))
        self.assertTrue(any('metadata' in e for e in errors))

    def test_council_cannot_erase_independence_or_grant_authority(self):
        self.contracts['council'].update(advisoryOnly=False, independentInitialBarrier=False,
                                         silentMemberReplacement=True)
        self.assertTrue(policy.check(self.register, self.contracts))

    def test_design_does_not_activate_multiple_dots_or_channels(self):
        self.contracts['dot'].update(enabled=True, instancesPerOwner=2, initialExternalActions=['send'])
        self.contracts['dot']['channels'][0]['enabled'] = True
        self.assertTrue(policy.check(self.register, self.contracts))

    def test_unknown_capability_and_duplicate_definition_fail(self):
        self.contracts['tools'][0]['capability'] = 'cap.missing'
        self.contracts['definitions'].append(copy.deepcopy(self.contracts['definitions'][0]))
        self.assertTrue(policy.check(self.register, self.contracts))


if __name__ == '__main__':
    unittest.main()
