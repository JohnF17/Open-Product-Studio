# CI and independent review design

## What works today

`.github/workflows/docs.yml` is an actual read-only PR/push workflow. It uses a revision-pinned checkout action with persisted Git credentials disabled, no repository secrets, a five-minute timeout, and hosted ephemeral runners. It runs `python3 -m unittest discover -s tests -v`, `python3 scripts/check_docs.py`, `python3 scripts/check_roadmap.py` and `python3 scripts/check_agents.py` without installing dependencies.

The structural check verifies required files and local Markdown targets, rejects private files in the public candidate, and restricts research and media assets. Five inherited media blobs have an explicit path and digest allowance. Required Studio documents and changed Markdown get link checks. The check recognizes ordinary inline Markdown links. Factual sourcing, remote links, anchors, secrets, provider terms and runtime security require separate review.

The roadmap check validates package/capability ownership, required acceptance/role fields, milestone/external IDs, dangling or cyclic dependencies and local evidence references for accepted work. It also checks the feature inventory ID manifest, source IDs, software-to-package/milestone links and reverse requirement mappings, retaining explicit human/unverified dispositions. A design-only register cannot claim accepted implementation. These checks cannot decide whether a human reviewer is independent, a source supports a claim or an evidence file tells the truth. The application gate must later verify runtime behavior and accepted release records.

GitHub execution has not occurred because no remote repository was created. Local commands can prove this check locally; they cannot prove branch protection or a hosted workflow run.

`python3 scripts/check_agents.py` also runs in the workflow. It checks the design-only role/reply/tool references, bounded repair metadata, exact-model/authority invariants, advisory council settings and one disabled Dot with no initial external actions. Mutation tests exercise those guards. This is metadata coherence, not runtime tool confinement, prompt-injection resistance, actual schema-conformant model output or live service acceptance. WP52-66 require those tests with implementation.

## Required implementation gates

Add each gate with the code it validates. A green documentation job cannot substitute for an absent application check.

| Gate | Required evidence | Timing |
| --- | --- | --- |
| Static quality | formatting, lint, strict TypeScript, import boundaries, dependency/license review | WP01 onward |
| Build | frozen lockfile, reproducible production build, supported runtime matrix | WP01-02 onward |
| Domain/provider contracts | exact selections, validated protocol fixtures, cancellation/resume/approval states | WP03-06, WP12-13 |
| Security | origin/authz, paths, injection, SSRF, active previews and redaction | With affected capabilities |
| UI | Playwright core journey, mobile/desktop, axe, keyboard/reduced motion | WP08 and every new interactive surface |
| Exports | safe output, provenance, Unicode, page readability, manifest hashes, heading/reading-order/language/table semantics and external screen-reader exercise | WP14-17 |
| Cloud | tenant/parent ownership, session lifecycle, private assets | WP33-38, WP42 |
| Money | Payer/merchant/buyer and test/live isolation; server prices/checkout/portal; subscription/seat paid-through/revocation; semantic purchase dedupe/delayed/reordered events; atomic spend/refund/chargeback/restore reconciliation; exact currency/service units | WP06, WP27-30, WP33-37, WP47-48 |
| Performance | declared device/profile, app-shell budget and Web Vitals targets | WP08 onward, inside affected packages |
| Supply chain | secret scanning, dependency alerts, CodeQL/appropriate static analysis, action policy, provenance/SBOM | Before public alpha |
| Semantic quality | original fixed fixtures and reviewed rubric; accuracy and attribution, not prose similarity | WP10-11, WP15-16, WP19-24, WP32 |

Ordinary PR tests use fake providers, recorded synthetic protocol fixtures and sandbox payment events. Paid/live provider compatibility checks run only on a trusted revision, with a separate explicit budget and account authorization. A model response that says tests pass is not evidence.

## Payment implementation fixtures

[PAYMENTS.md](PAYMENTS.md) assigns future runtime acceptance, not new working CI. Synthetic fixtures must cover forged redirect/price/currency/customer IDs; cross-organization/project/merchant and stale-navigation approvals; wrong test/live signature/account; duplicate semantic payment under different event IDs; signed delivery replay versus valid late redelivery; delayed success and refund-before-paid; cancel/renewal/seat revocation races; refund racing two spends; chargeback after consumed units; worker crash/cancel after provider billing; partial refund versus transfer reversal; expired seller scope; buyer cross-access/closed-desktop delivery; deletion/restore with finance retention and no duplicate grants. Use provider-specific envelopes, not a fictional common timestamp or event ID.

Independent finance/security review and E3/E4 entity/country/product/API approval remain required even if fixtures pass. Do not run hosted CI, create accounts or make real charges for planning validation. Trusted sandbox/live acceptance later requires separately authorized accounts and bounded scope; a sandbox cannot prove production eligibility or settlement.

## Capable AI review without giving a PR the keys

AI review is planned, not wired up. It should receive a bounded diff, relevant trusted design and static-check output, and produce structured findings with file/line, severity, evidence, affected boundary and suggested validation. Treat all PR/source content as untrusted; instructions inside it cannot modify reviewer authority. Give the reviewer no shell, merge, repository-write, credential, network-browsing or deployment tool.

Use a trusted service or isolated environment distinct from the PR runner. Do not expose a model key to `pull_request` builds, interpolate PR text into shell commands, or check out a fork under `pull_request_target` with secrets. A maintainer-approved trusted request may fetch a bounded diff as data; it must not run contributor code. Redact possible secrets before model submission and document that source is sent to an external processor.

Run deterministic checks first. Use Sol xhigh for scoped review and Astra high for high-risk architectural/security changes when available and budgeted. Discover options at run time and record the exact requested/executed model; no silent substitution. Enforce maximum diff/context, output, time, retry and dollar budget. Cache only by exact diff/base/policy/model configuration, with safe data retention.

AI review is advisory initially. Require human triage of every claimed blocker and preserve disagreement. Only consider a blocking AI policy after a benchmark of known seeded defects and false positives, with a documented appeal path and maintainer override. The reviewer cannot merge, edit workflows, dismiss findings, or turn on its own tools. A clever CI bot is another security boundary.

## Hosting settings to configure when a remote exists

Require current checks, independent review, stale-approval dismissal, signed-off commits, no force-push to main, restricted bypass and protected release tags. Assign real maintainers to CODEOWNERS for auth, billing, provider execution, CI, remote grants and security documents. No fake team handles are added now. Enable private vulnerability reporting and a verified contact before public contributions.

Protect the workflow/policy files themselves. A PR can edit its own workflow under a `pull_request` event, so in-repository checks alone cannot make enforcement tamper-proof. Use repository/organization rulesets and protected required workflows where available, independent code-owner review, and review changes to checks rather than trusting a same-named green result. Hosted runner isolation also does not prove generated code is safe to execute on a user's machine.

Merge only the reviewed revision with current required checks. Release jobs use protected environments, least-privilege OIDC where supported, signed provenance and a human release action. Dependabot or Renovate should propose bounded updates; do not auto-merge major releases or new authority-bearing dependencies.

## Sources

[GitHub secure use reference](https://docs.github.com/en/actions/reference/security/secure-use), [script injection guidance](https://docs.github.com/en/actions/concepts/security/script-injections), and [pull_request_target guidance](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target). Recheck hosted protections at repository setup because platform behavior changes.

## Fork integration

The import archives upstream workflows for independent review. Studio's documentation gate reads the pinned tree to recognize unchanged upstream documents. A missing pin fails this gate, so CI fetches repository history. Package smoke tests, notices and signed update checks have their own evidence requirements. See the [Windows baseline record](BASELINE.md).

The [upstream intake workflow](../.github/workflows/upstream-intake.yml) specifies daily checks at 06:17 UTC and manual runs on the default branch. It reads official main, the five most recent published releases and published repository advisories. Both command blocks ran locally on November 19. Hosted scheduling, dependency-advisory coverage and branch protection still require qualification. A failed source fetch marks the run incomplete. The [upstream intake policy](UPSTREAM.md) assigns weekly human review of changes, urgent security triage, and revision-specific migration, license and performance checks.

## Integrated lifecycle evidence to implement

The new `acceptanceEvidence`, `conditionalDependencies` and `externalGateApplicability` fields in the canonical register are planning metadata. Existing Python checks do not enforce their runtime semantics. WP03 must implement phase-aware activation and conditional eligibility; test that WP02 component fixtures can precede WP07, and WP35/36 can precede WP37, while public activation still rejects missing restore/signing/economics evidence.

Additional required fixtures: direct-product publication without creator records; creator-backed denial without permission; M4B-disabled manual-feedback revision; two-project switching with late callbacks and revoked access; transfer during a provider schedule/Unknown send with old-host restart; cloud-only revision/asset export on lapse without purchase; expired login/revoked membership/outage/missing asset independently; t0 backup/t1 delete-revoke/t2 restore with and without newer journal; wrong-account signed events/OAuth reconnect; first-connector outage/paid-but-not-delivered support and independent mail/phone storms; changed CLI binary and stale/revoked extension trust; state-changing authenticated navigation/redirect/scripts; external-reader exported-product accessibility; low-use/zero-top-up/high-retry cost commitments. Preserve payment fixtures already listed.

Record producer, exact build/revision, input/account/reader profile, assertions, artifact and independent reviewer for component, integration and public-release evidence. Documentation structure and data synchronization checks do not execute these runtime fixtures or prove live safety, legal eligibility or product usability.

The roadmap gate owns negative tests for malformed acceptance phases/producers, conditional dependencies, channel evidence, undeclared external gates, milestone order and generated register drift. The agent-contract gate protects the seven required initial role identities, the council bounds and the selected AgentPhone.ai phone channel. Package and mutation checks assess structural claims. The [execution and release decisions](plans/2026-11-18-execution-and-release-decisions.md) assign runtime, packaged and operator evidence to the corresponding releases.
