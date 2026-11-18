# Dependency-ordered implementation contracts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Read the [canonical roadmap](ROADMAP.md) and relevant specs before implementation.

Design only; all 66 packages are unimplemented. Machine-readable source: [work-packages.json](roadmap/work-packages.json). Paths below are proposed additions or pinned upstream seams. Check the source at import; do not fabricate existing files or test results. A maintainer must assign real people to owner/reviewer roles.

## Common execution and review contract

Run the named failing regression/contract fixtures first, implement the smallest coherent deliverable, then run targeted tests and affected upstream checks. Add actual pnpm studio:test/studio:e2e scripts only alongside their suites. The pinned root uses vp test run; inspect its current flags before composing filtered commands. Package gates also require build:desktop/dist:desktop:win:x64/release:smoke as applicable. No application command has been run for this planning repository.

Keep static types/lint, authorization, recovery, accessibility, performance and privacy checks inside the affected package. Tests use fake providers and synthetic events; trusted live checks require separate account/budget evidence. Commit the reviewed files and acceptance evidence; do not push, deploy or release merely because a local task passes.

The [payment design](PAYMENTS.md) and [provider decision](plans/2026-11-13-payment-provider-decisions.md) refine WP27-31, WP33-37 and WP46-48. All payment controls below are future acceptance requirements; provider eligibility and independent review remain external gates. No package or capability count changes.

The [service design](SERVICES.md) and [project experience](PROJECT-EXPERIENCE.md) refine the same scope. Dependencies below consume component contracts; conditional dependencies apply only to their named input/action. Every acceptance item is numbered by position (A1, A2, ...) and has phase/producer attribution. All evidence remains **not-run**. Component acceptance alone never activates an action: applicable integration/public-release evidence and external gates must pass for the exact build. In mixed-phase items, the scope column separates what each producer proves. See ROADMAP for WP02/WP07 and WP35-37 ordering.

## WP01: Import and reproduce the pinned upstream baseline

**Milestone:** M0A. **Dependencies:** none. **Status:** planned.

**Owner:** platform maintainer. **Independent acceptance:** independent platform reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.platform.baseline`.

**Files:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `docs/BASELINE.md`, `docs/UPSTREAM.md`, `LICENSE`.

**Consumes:** Upstream SHA 7d71f852a8edd298ffde67c295760c286a71a27c plus the preserved planning tree.

**Produces:** BaselineManifest {upstreamSha, toolchain, rootLockHash, stagedGraphs, nativeArtifacts, notices, checks}.

**Acceptance and failure behavior:**

- Inspect install/build hooks before execution; import upstream history without overwriting planning or notices.

- Run frozen-lockfile baseline checks and build:desktop; separate upstream/environment failures from downstream changes.

- Record resolved packaging dependency graphs and native hashes; retain untouched upstream tracking refs.

- Establish the upstream manifest, patch/decision ledger and primary/backup ownership from docs/UPSTREAM.md; configure daily read-only intake and weekly reviewed integration before public alpha. Record source/dependency/advisory failures and deferred fixes.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP01. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP01.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP02: Independent Electron identity and Windows development package

**Milestone:** M0A. **Dependencies:** WP01. **Status:** planned.

**Owner:** desktop maintainer. **Independent acceptance:** security/platform reviewer. **External gates:** E1, E7.

**Capabilities:** `cap.platform.desktop`.

**Files:** `apps/desktop/src/boot.ts`, `apps/desktop/src/main.ts`, `apps/desktop/src/preload.ts`, `apps/desktop/src/electron/ElectronUpdater.ts`, `scripts/build-desktop-artifact.ts`, `apps/desktop/src/studioIdentity.test.ts`.

**Consumes:** BaselineManifest and reviewed upstream packaging/configuration.

**Produces:** ProductIdentity {appId, scheme, dataNamespace, vaultNamespace, updateFeed, telemetryPolicy}; isolated local package.

**External gate applicability:**

- E1: Public signed desktop distribution, not unsigned development fixtures.

- E7: Advertising an added supported platform after its packaging matrix.

**Acceptance and failure behavior:**

- Configuration fixtures reject upstream identity, data, credentials and production service endpoints.

- Package with dist:desktop:win:x64; synthetic clean install/restart/uninstall and spaces/Unicode paths.

- Validate custom-scheme/IPC senders, navigation and local launch without studio login; disclose unsigned development status.

- Keep identity/feed/vault/telemetry checks permanent for every upstream candidate; verify notice files in packaged artifacts, signed beta-to-stable promotion and populated-data upgrade/restore behavior.

- Component acceptance uses isolated unsigned development packaging and upstream-schema fixtures. Populated Studio data upgrade/restore is integration evidence produced jointly with WP07; signed beta-to-stable promotion is public-release evidence under E1/E7, not an input to WP03.

- A synthetic evidence-order walk accepts WP02 component evidence before WP07 exists but rejects public activation of the affected build without populated-data restore and signing evidence. No reverse dependency may conceal an acceptance cycle.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A5, A6: **component**, producer WP02. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A4: **component**, producer WP02. Permanent identity/feed/vault/telemetry and packaged notices checks.

- A4: **integration**, producer WP02, WP07. Populated Studio upgrade/restore after WP07; not an input to WP03.

- A4: **public-release**, producer WP02. Signed beta-to-stable promotion, E1/E7.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP02.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP03: Business schemas, capability register and eligibility

**Milestone:** M0B. **Dependencies:** WP02. **Status:** planned.

**Owner:** domain architect. **Independent acceptance:** data/authorization reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.project.create`, `cap.modules.registry`.

**Files:** `packages/studio-contracts/src/project.ts`, `packages/studio-contracts/src/capability.ts`, `packages/studio-domain/src/eligibility.ts`, `packages/studio-domain/src/eligibility.test.ts`, `modules/catalog.json`.

**Consumes:** ProductIdentity and canonical roadmap capability IDs.

**Produces:** BusinessProject; RevisionRef; CapabilityManifest; evaluateEligibility(actor, project, capability): Eligibility with typed blockers.

**Acceptance and failure behavior:**

- Independent release/development/progress/entitlement states; available code differs from completed development.

- Direct RPC cannot dispatch planned capabilities, stale revisions or unauthorized projects.

- Imported valid inputs satisfy project prerequisites without forcing every screen; input edits preserve history and mark dependents stale.

- Evaluate conditionalDependencies and externalGateApplicability for the requested action, not every optional adapter in a package. Manual feedback, direct-product publication and hypothetical split calculations remain independent of email execution, creator records and operational merchant setup respectively.

- Separate component acceptance from integration/public-release activation evidence with producer, exact revision, applicable action, pending/passed state and independent reviewer. Component acceptance alone cannot make a capability available; reject missing or stale activation evidence through direct RPC.

- Workspace, BusinessProject, BillingOrganization, provider connection, execution host, sender and merchant are separate typed references. Two projects with overlapping display names cannot share private notes, defaults, callbacks or authority through navigation state.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6: **component**, producer WP03. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP03.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP04: Atomic studio command and upstream execution bridge

**Milestone:** M0B. **Dependencies:** WP03. **Status:** planned.

**Owner:** execution maintainer. **Independent acceptance:** independent transaction/recovery reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.execution.durable`.

**Files:** `apps/server/src/studio/commands.ts`, `apps/server/src/studio/commit.ts`, `apps/server/src/studio/runtime-bridge.ts`, `apps/server/src/studio/commit.test.ts`, `apps/server/src/orchestration-v2/EventSink.ts`, `apps/server/src/orchestration-v2/EffectWorker.ts`.

**Consumes:** CommandEnvelope {commandId, projectId, capabilityId, expectedRevision, inputRefs, payload}; authenticated actor/environment and Eligibility.

**Produces:** commitStudio(command): CommandReceipt; one versioned studio.execute effect with durable operation ID and native-run mapping.

**Acceptance and failure behavior:**

- Same SQLite transaction commits owned state, studio_events, reservations and outbox intent; reuse the injected outbox.

- Duplicate ID/digest returns original receipt; changed digest conflicts; no dispatch before commit.

- Kill process at commit/claim/dispatch boundaries; classify safe replay versus Unknown; provider completion differs from artifact finalization.

- Non-Git BusinessProject can create/edit and use a separately controlled execution workspace; benchmark dispatch-critical FULL durability.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP04. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP04.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP05: Exact model selection and supervised defaults

**Milestone:** M0B. **Dependencies:** WP04. **Status:** planned.

**Owner:** provider maintainer. **Independent acceptance:** protocol/security reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.connections.cli`, `cap.models.exact`.

**Files:** `apps/web/src/components/chat/ProviderModelPicker.tsx`, `apps/web/src/components/chat/ProviderModelPicker.logic.ts`, `apps/web/src/modelSelection.ts`, `apps/server/src/studio/model-policy.ts`, `apps/server/src/studio/model-policy.test.ts`.

**Consumes:** Native ModelSelection {instanceId, model, options}; provider catalog/descriptors and execution host.

**Produces:** validateSelection(selection, catalog, host): SelectionCheck; requested/effective identity receipts and mismatch stop policy.

**Acceptance and failure behavior:**

- Retain native picker, account search/favorites/options; no universal invented effort setting.

- Unavailable selections remain visible; queued/retried/delegated work validates exact selection again.

- Synthetic missing model, invalid effort, native reroute and absent effective identity fixtures; stop dependents and label unverified identity.

- Beginner Supervised defaults and supported advanced modes remain distinct from business grants.

- Revalidate WP53 qualification identity on queued dispatch as well as requested model/options; preserve the unavailable selection while changed binaries or scopes await requalification.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP05. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP05.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP06: Grants, operational budgets and cancellation

**Milestone:** M0B. **Dependencies:** WP04, WP05. **Status:** planned.

**Owner:** execution maintainer. **Independent acceptance:** security/cost reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.execution.grants`, `cap.execution.budgets`.

**Files:** `packages/studio-contracts/src/execution.ts`, `apps/server/src/studio/policy.ts`, `apps/server/src/studio/budgets.ts`, `apps/server/src/studio/recovery.test.ts`.

**Consumes:** CommandReceipt, exact selection policy and authenticated actor.

**Produces:** WorkflowGrant; BudgetReservation; reserve/settle/release; cancelIntent and reconciled operation outcomes.

**Acceptance and failure behavior:**

- Reserve shared child budgets atomically before dispatch; money uses integer units and unknown CLI cost stays unknown.

- Cap queries/bytes/time/tokens/tools/concurrency/retries/depth; child grants cannot expand parent scope.

- Approval binds exact payload/destination/revision/actor/expiry/price; changed inputs invalidate it.

- Restart preserves denials/cancellation intent; exhausted budgets stop; cancellation is not proof of external termination.

- Cost views separate owned/recurring access, incremental estimate, reservation, provider-reported actual charges and unknown components by currency, period and tool route; incomplete actuals are a known subtotal plus unknowns, never zero or an all-in total. Include failed/retried work without double settlement.

- Nested-run cost views declare whether parent totals include children. Aggregate each stable operation/attempt and charge receipt once; do not sum inclusive parent estimates with the same child charges. Repeated delivery/reconciliation must not double settle, and unresolved attribution or currency/period differences remain explicit unknowns.

- Transfer/Stop fences new dispatch and inventories queued native work, active attempts, remote schedules, sessions and Unknown results. Cancellation intent and expiry never clear an unresolved resource fence or prove provider termination; use the WP34 custody barrier when changing host.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7: **component**, producer WP06. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP06.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP07: Database/assets migration, backup and restore

**Milestone:** M0B. **Dependencies:** WP04, WP06. **Status:** planned.

**Owner:** data maintainer. **Independent acceptance:** independent recovery reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.library.restore`.

**Files:** `apps/server/src/studio/storage.ts`, `apps/server/src/studio/migrations.ts`, `apps/server/src/studio/backups.ts`, `apps/server/src/studio/backups.test.ts`, `apps/server/src/persistence/Sqlite.ts`.

**Consumes:** Versioned owned state, operation intents and immutable asset references.

**Produces:** SnapshotManifest {schema, minReader, minWriter, revision, hashes}; verified restore and ownership lock.

**Acceptance and failure behavior:**

- Temp-write/hash/rename/reference protocol handles orphan/missing blobs without claiming DB/filesystem atomicity.

- Consistent snapshot pins assets; restore into a new directory verifies hashes/schema before ownership swap.

- Forward migrations have checksums/journal, pre-upgrade backup and interruption tests; old binaries reject incompatible writes.

- Outstanding external actions reconcile before dispatch resumes; retention/tombstone/deletion fixtures prevent resurrection.

- Managed restore reconciles a deletion/revocation generation from the current authority or a durable journal outside the rewound snapshot before indexes, summaries, queued context or dispatch rebuild. Snapshot hashes alone cannot prove current permission or deletion state.

- Portable bundles exclude active grants, device bindings, wakes and approvals; restored authority remains inactive until current reconciliation and explicit reauthorization. An unmanaged old archive without a newer journal opens as content-only recovery with a historical-data warning and review, never a universal non-resurrection guarantee.

- Back up at t0, delete/forget/revoke/suppress at t1, restore t0 at t2: test records, blobs, derived summaries/indexes, queued model context and future sends. Repeat offline on a fresh machine with only t0; display the limitation, quarantine historical content before normal retrieval and activate no old authority.

- Produce populated Studio upgrade/restore integration evidence for WP02 after component fixtures; a public release still rejects missing or incompatible data/asset recovery evidence.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8: **component**, producer WP07. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP07.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP08: Dashboard, all module routes and accessible guidance

**Milestone:** M0B. **Dependencies:** WP03, WP05, WP06, WP07. **Status:** planned.

**Owner:** frontend/accessibility maintainer. **Independent acceptance:** novice UX and accessibility reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.dashboard.workspace`, `cap.guidance.tour`.

**Files:** `apps/web/src/routes/_chat.tsx`, `apps/web/src/features/studio/Dashboard.tsx`, `apps/web/src/features/studio/ModulePage.tsx`, `apps/web/src/features/studio/Guidance.tsx`, `apps/web/src/features/studio/dashboard.spec.ts`.

**Consumes:** CapabilityManifest, Eligibility, CommandReceipt and activity snapshots.

**Produces:** Integrated project dashboard; honest module states; resumable contextual tour and optional native thread detail.

**Acceptance and failure behavior:**

- Preserve existing shell/sidebar/overlays/focus/background state; every planned module links its milestone.

- Keyboard, 320px, zoom, reduced motion and screen-reader journeys; accessible forms/errors and virtualized long lists.

- Tour never grants permissions; skip/resume works; project prerequisites differ from missing connection/entitlement.

- Measure shell performance on declared hardware; test restart/reconnect and missing-provider states.

- Guided entry groups saved brief fields into a short diagnostic and shows one next eligible result with a backup route; M0B uses labeled fixtures and pilot instrumentation, M1 recommendations activate only after their gate. Measure the real setup, generation, review, export/reopen and interventions at WP17/M2; M0B does not require later live capabilities.

- Apply PROJECT-EXPERIENCE.md: persistent workspace/project context, recent/pinned/search/archive navigation, guided next-action home and advanced module/library/inspector views share the same state. Global billing/connections and project settings are visibly distinct; planned modules remain discoverable.

- Switch A to B with unsaved edits, a pending approval and running work in A; preserve draft/focus/scroll per project, invalidate any retargeted action and apply late callbacks only to A by immutable run binding. Notifications deep-link to the owning project after access recheck; cross-project search is explicitly scoped.

- Exercise empty/example, loading/partial, stale/offline, denied/revoked, quota/Unknown, retry and recovered states without sign-in for local work. Distinct blocker/remediation text preserves keyboard focus and useful partial exports; no fake percent, completed action or automatic connection.

- Measure the motion/performance profile in PROJECT-EXPERIENCE.md on declared hardware: 120-200 ms local transitions, 250 ms maximum decorative transition, reduced-motion removal, batched streaming, virtualized lists and retained scroll. Record baseline startup/idle memory and reviewed regression budgets, not claimed measurements.

- Business-project lifecycle covers create, rename, archive/unarchive, duplicate, original template, validated import, artifact/bundle export and safe delete without requiring a Git repository. Duplicate/template/import never carry credentials, grants, active schedules or financial authority; delete previews retained copies/finance records/provider work, fences dispatch and cannot revive from a late callback.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9, A10: **component**, producer WP08. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP08.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP09: Typed capability broker and untrusted input confinement

**Milestone:** M0B. **Dependencies:** WP04, WP06. **Status:** planned.

**Owner:** security/tooling maintainer. **Independent acceptance:** independent security reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.tools.broker`.

**Files:** `apps/server/src/studio/capabilities.ts`, `apps/server/src/studio/tools/files.ts`, `apps/server/src/studio/tools/fetch.ts`, `apps/server/src/studio/security.test.ts`, `packages/studio-contracts/src/connector.ts`.

**Consumes:** WorkflowGrant, BudgetReservation, connector scopes and approved project roots.

**Produces:** CapabilityBroker dispatch; reviewed connector manifest and safe importer/preview worker ports.

**Acceptance and failure behavior:**

- Path/junction/symlink/UNC/device/alternate-stream/traversal and ZIP expansion fixtures.

- SSRF/private-IP/redirect/DNS/size/time checks; prompt injection cannot expand authority.

- Provider-supported permissions plus verified OS containment for autonomous document operations; cwd alone never passes.

- No arbitrary generated-code execution; isolated parsing/preview denies engine/local-file/network access by default.

- ConnectorBinding is server-derived from authenticated actor/workspace and verified provider account: provider, externalAccountId, environment, allowed resources/scopes, credentialGeneration and revocation epoch. OAuth completion uses initiating actor/connection and short-lived one-use state with supported native/web flow; sign-in email is not account ownership.

- Route events by trusted endpoint/subscription/account binding and namespaced resource/event/effect keys; validate object-to-project/offer/buyer relationships and reject conflicting payload metadata. Separate billing, creator commerce and personal-channel secrets/replay stores even at one provider.

- Test two accounts/workspaces with overlapping remote IDs, a valid B signature carrying A metadata, stale callback state, wrong-account reconnect, test/live mismatch, revoked subscription and delayed event after reassignment. No event or OAuth redirect can select authority from the active UI project.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7: **component**, producer WP09. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP09.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP10: Evidence ingestion, web research and claim support

**Milestone:** M1. **Dependencies:** WP06, WP07, WP09, WP57. **Status:** planned.

**Owner:** research-quality maintainer. **Independent acceptance:** source-support/domain reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.evidence.import`, `cap.evidence.research`.

**Files:** `packages/studio-contracts/src/evidence.ts`, `apps/server/src/studio/evidence.ts`, `apps/server/src/studio/evidence.test.ts`, `apps/web/src/features/studio/evidence/EvidencePage.tsx`, `evals/studio/v1/evidence.json`.

**Consumes:** Bounded question plan, source permissions, selected web-capable connection and imported source refs.

**Produces:** EvidencePack {sources, claims, support, contradictions, gaps, freshness, rights, provenance}.

**Acceptance and failure behavior:**

- Actual inspected bodies differ from snippets/metadata/inaccessible URLs; canonicalize repeated underlying sources.

- Version/hash/time/locator and analysis/redistribution permissions; stale and contradictory evidence retained.

- Malicious/missing/duplicated evidence fixtures; no invented source IDs; offline cache is visibly dated.

- Enforce request/byte/runtime budgets and safe retries; no bypass of verification/rate restrictions.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP10. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP10.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP11: Brief, strategy and recommendations at every active decision

**Milestone:** M1. **Dependencies:** WP05, WP06, WP08, WP10, WP57. **Status:** planned.

**Owner:** product/research maintainer. **Independent acceptance:** independent domain and novice UX reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.brief.capture`, `cap.strategy.opportunity`, `cap.strategy.format`, `cap.strategy.transformation`, `cap.guidance.recommend`.

**Files:** `packages/studio-contracts/src/recommendation.ts`, `apps/server/src/studio/recommendations.ts`, `apps/web/src/features/studio/decisions/DecisionPanel.tsx`, `apps/server/src/studio/recommendations.test.ts`, `evals/studio/v1/recommendations.json`.

**Consumes:** DecisionContext, EvidencePack, WorkflowGrant, exact model policy and reserved job budget.

**Produces:** recommend(context, request): RecommendationSet; acceptDecision(id, option, revision); executeSafePlan(id, grant, revision).

**Acceptance and failure behavior:**

- Knowledge, no-idea, authorized creator and existing-product entry paths; locale/preferences preserved.

- Audience/problem/format/positioning/pricing/outcome options have rationale, evidence, alternatives and uncertainty.

- Accept/override/refine/refresh create revisioned decisions; all active modules use the same policy, not prompt invention by novices.

- No-evidence abstention, unsupported scores, stale inputs and model-reroute fixtures; debounced schedules and sleeping-host queues.

- Versioned five-scenario human-labeled evidence/usefulness rubric; bounded private auto-work stops before external actions.

- Opportunity rankings are explained heuristics; pricing/recurring-offer scenarios include assumptions and cannot imply proven demand or profit.

- Diagnostic brief reuses goals, skills/knowledge/permitted material, reachable audience, time/budget, prior attempts and constraints; unknowns and skipped nonessential answers remain explicit. Recommend one route plus one backup with evidence gaps, a small deliverable, operational/cost ceiling and next checkpoint; no custom prompt or income promise.

- A backup is an alternative project route, never silent model fallback. Prefer an eligible first result; show later creator/service/media gates honestly. Revisioned answers stale dependent advice; the M2 product/export path requires no M3 contact, creator or campaign record.

- Offer an optional editable 30-day execution plan with weekly checkpoints, first-week steps, dependencies, time/budget assumptions and a user-adjustable activity target. It is revisioned recommendation data at M1, separate from the sellable action-plan product at M2; input changes stale dependent steps and unavailable capabilities keep their gates.

- Manual progress and user-requested check-ins need no CRM, mailbox, calendar account or Dot. Converting eligible steps into M3 task/campaign records requires an explicit choice; advice and checklists never activate reminders, external actions or persistent wakes. Activity targets are hypotheses, not income or reply guarantees.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9, A10: **component**, producer WP11. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP11.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP12: Official API and explicitly free connection adapters

**Milestone:** M1. **Dependencies:** WP05, WP06, WP09, WP53, WP54. **Status:** planned.

**Owner:** provider maintainer. **Independent acceptance:** provider terms/protocol reviewer. **External gates:** E2.

**Capabilities:** `cap.connections.api`, `cap.connections.free`.

**Files:** `packages/studio-contracts/src/provider-policy.ts`, `apps/server/src/studio/provider-compatibility.ts`, `apps/server/src/studio/provider-compatibility.test.ts`, `docs/PROVIDER-COMPATIBILITY.md`.

**Consumes:** Upstream driver ports, official provider contract, source-reviewed current terms and selected model descriptors.

**Produces:** Separately enabled official API/fixed free/explicit free-router capabilities with destinations, receipts and cost policy.

**Acceptance and failure behavior:**

- Keys remain in secure local custody; no copying consumer CLI tokens or implied resale rights.

- Fixed model and free router are distinct policies; deny paid fallback, unauthorized destinations and silent substitution.

- Synthetic quota/rate/error/stream/cancel/tool-use fixtures; bounded trusted live compatibility evidence before advertising.

- Gateway optional; no guarantee of aggregate credits or premium availability; unsupported adapters remain disabled.

- Qualification receipts bind executable digest/driver/CLI/runtime version, model/route, permission configuration, OS/sandbox and tool-schema digest. Recheck observable identity at startup/dispatch; any changed field invalidates affected authority, preserves the saved selection and requires trusted fixture requalification with no silent fallback.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP12. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP12.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP13: Local inference compatibility and hardware UX

**Milestone:** M1. **Dependencies:** WP05, WP06, WP09, WP53, WP54. **Status:** planned.

**Owner:** local-runtime maintainer. **Independent acceptance:** protocol/privacy reviewer. **External gates:** E2, E7.

**Capabilities:** `cap.connections.local`.

**Files:** `apps/server/src/studio/local-models.ts`, `apps/server/src/studio/local-models.test.ts`, `apps/web/src/features/studio/connections/LocalModels.tsx`, `docs/PROVIDER-COMPATIBILITY.md`.

**Consumes:** Reviewed local runtime adapter, model identity/license, hardware profile and bounded job policy.

**Produces:** LocalModelCompatibility {runtime, modelRevision, hardware, tools, limits, privacyDestinations}.

**Acceptance and failure behavior:**

- Pinned licensed model/runtime; manual installation guidance and resource/disk estimates.

- Tool/structured-output/context/stream/cancel fixtures per supported model; insufficient hardware clearly blocks.

- No automatic cloud fallback; localhost gateways disclose any upstream cloud destinations.

- Unsupported advanced capability stays disabled rather than passing on text completion alone.

- Qualification receipts bind executable digest/driver/CLI/runtime version, model/route, permission configuration, OS/sandbox and tool-schema digest. Recheck observable identity at startup/dispatch; any changed field invalidates affected authority, preserves the saved selection and requires trusted fixture requalification with no silent fallback.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP13. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP13.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP14: Immutable artifacts, typed edits and safe previews

**Milestone:** M2. **Dependencies:** WP07, WP09, WP11, WP55. **Status:** planned.

**Owner:** content/data maintainer. **Independent acceptance:** editorial and preview-security reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.content.versions`, `cap.content.preview`.

**Files:** `packages/studio-contracts/src/artifact.ts`, `apps/server/src/studio/content.ts`, `apps/web/src/features/studio/content/ArtifactEditor.tsx`, `apps/server/src/studio/content.test.ts`.

**Consumes:** Accepted project/outline revisions, EvidencePack and rights-reviewed asset refs.

**Produces:** ArtifactVersion {schema, parents, inputRefs, sections, claims, manualEdits, hash}; revision-checked section edit/merge.

**Acceptance and failure behavior:**

- Regenerate individual sections without discarding accepted manual edits; explicit conflict review.

- Provider success is distinct from complete artifact finalization; crash resumes only unfinished sections.

- Sandboxed HTML/Markdown/SVG/PDF preview fixtures block scripts, privileged links and network/file fetches.

- Historical versions/claim links remain inspectable; stale evidence flags affected sections.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP14. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP14.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP15: Five complete document product families

**Milestone:** M2. **Dependencies:** WP14. **Status:** planned.

**Owner:** content/workflow maintainer. **Independent acceptance:** independent instructional/content reviewer. **External gates:** E6.

**Capabilities:** `cap.product.guide`, `cap.product.workbook`, `cap.product.template`, `cap.product.curriculum`, `cap.product.plan`, `cap.product.coachingoffer`.

**Files:** `packages/studio-contracts/src/products.ts`, `modules/product-guide.json`, `modules/product-workbook.json`, `modules/product-template.json`, `modules/product-curriculum.json`, `modules/product-plan.json`, `apps/server/src/studio/products.test.ts`.

**Consumes:** Accepted transformation, charter/outline, artifact section-edit ports and recommendation service.

**Produces:** Complete editable guide, workbook, template kit, curriculum and action-plan artifacts with family-specific acceptance. ProductConfiguration {family, subtype, depth, locale, sourceRefs, reviewPolicy}; coaching-offer/program draft without a promise of human coaching.

**Acceptance and failure behavior:**

- Each family completes an original end-to-end example, not merely a registered schema.

- Guide has supported explanations/examples; workbook has usable prompts/exercises; templates have instructions/examples.

- Curriculum has progression/assessment materials; action plan has concrete steps/dependencies/checkpoints.

- Titles/TOC/reading estimates are derived honestly; completion/quality/coverage differs from generated word count.

- Separate product family from ebook subtype and depth; standard prose, cookbook, step-by-step and drawing-book structures have individually declared support.

- Quick/complete/deep coverage profiles change outline expectations rather than merely requesting more words; configuration changes version the brief.

- Illustrated/cookbook subtypes need domain review and permitted supplied assets; automated image/video production stays behind M4A and learner fulfillment behind M4C.

- Coaching-offer and prerecorded-course authoring explicitly state whether the result is an offer/outline/script/content; no generated human service, video production or enrollment is implied.

- Create a short original, editable, review-ready guide/workbook sample from an M1 brief with M3 capabilities disabled; this production fixture does not replace the five complete family gates. The full reviewed-export/reopen journey is accepted by WP17 at M2.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9: **component**, producer WP15. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP15.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP16: Editorial, claims and originality review workflow

**Milestone:** M2. **Dependencies:** WP14, WP15. **Status:** planned.

**Owner:** editorial-quality maintainer. **Independent acceptance:** independent domain reviewer. **External gates:** E6.

**Capabilities:** `cap.product.qa`.

**Files:** `apps/server/src/studio/editorial.ts`, `apps/web/src/features/studio/content/ReviewQueue.tsx`, `apps/server/src/studio/editorial.test.ts`, `evals/studio/v1/products.json`.

**Consumes:** ArtifactVersion, source/claim support and rights records.

**Produces:** ReviewRecord with correctness/usability/specificity/originality/completeness decisions and revision requests.

**Acceptance and failure behavior:**

- Detect unsupported factual/numeric assertions and missing exercise instructions; no fabricated plagiarism guarantee.

- Specialist subject matter requires named domain approval under E6; retain disagreements and corrections.

- Human review each product family; fixed original fixtures and no failing rubric dimension.

- Approvals bind exact artifact/input revision; changed content reopens affected review.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP16. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP16.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP17: Reusable brand/library and six exports

**Milestone:** M2. **Dependencies:** WP07, WP14, WP16. **Status:** planned.

**Owner:** document/platform maintainer. **Independent acceptance:** accessibility/data reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.media.library`, `cap.library.context`, `cap.library.export`.

**Files:** `apps/server/src/studio/exports.ts`, `apps/server/src/studio/library.ts`, `apps/server/src/studio/exports.test.ts`, `apps/web/src/features/studio/library/LibraryPage.tsx`.

**Consumes:** Reviewed ArtifactVersion, BrandProfile, permitted media and source/rights manifest.

**Produces:** ExportManifest {artifactRevision, format, hashes, provenance}; MD/HTML/PDF/DOCX/JSON/ZIP outputs and reusable context.

**Acceptance and failure behavior:**

- Render/read back real PDF/DOCX with Unicode, long tables, page breaks, links and readable typography.

- ZIP has portable schema/hash manifest and safely imports; no credentials, local absolute private paths or raw research media.

- Brand voice/color/cover choices are editable and accessible; licensed asset metadata travels with exports.

- Restore/export independence survives unavailable hosted entitlement; pin rendering dependencies and block remote-resource fetch.

- Export a reviewed sample, editable source, readable rendition and rights-safe provenance/limitations manifest without a recipient/contact/campaign or cloud account. Public handoff excludes private inputs, internal notes and nonredistributable evidence bodies.

- Open and edit a representative export outside the app; restore/import the portable project bundle with supported versions, manual edits, hashes and permitted evidence/rights links preserved. External edits enter as a new revision through supported import or explicit reconciliation; no claim of lossless arbitrary-format round trips.

- Complete the real first-result journey from an M1 brief through an original guide/workbook sample, WP16 review, editable/readable export and successful outside-app reopen, with M3 capabilities disabled; record setup, generation, human review, export/reopen and interventions separately.

- Test exported heading navigation, logical reading order, language, meaningful links, image alternatives and table headers/semantics in named external readers. An intended reader completes one guide/workbook exercise using a representative screen reader; visual PDF read-back or app axe alone does not establish output accessibility.

- Verify tagged PDF semantics for supported output or disclose the exact PDF limitation and provide a tested accessible DOCX/HTML alternative. Record format/reader/version evidence, not blanket format compliance.

- The M2 assistive-technology first-result journey includes unavailable-action explanation, quota/failure recovery, exact action review and outside-app reopening with M3 disabled; focus survives failure and partial work remains exportable.

**Evidence phase / producer (all not-run):**

- A1, A6, A7, A8, A9, A10: **component**, producer WP17. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A2, A3, A4, A5: **component**, producer WP17. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A1, A6, A7, A8, A9, A10: **integration**, producer WP17. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP17.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP18: Shared contacts, boards, tasks, filters and suppressions

**Milestone:** M3. **Dependencies:** WP03, WP07, WP09. **Status:** planned.

**Owner:** CRM maintainer. **Independent acceptance:** privacy/authorization reviewer. **External gates:** E2.

**Capabilities:** `cap.contacts.import`, `cap.contacts.pipeline`, `cap.contacts.export`.

**Files:** `packages/studio-contracts/src/relationships.ts`, `apps/server/src/studio/contacts.ts`, `apps/web/src/features/studio/contacts/ContactsPage.tsx`, `apps/server/src/studio/contacts.test.ts`.

**Consumes:** Authorized CSV/manual/provider imports with provenance, workspace/project visibility and consent/suppression scope.

**Produces:** Contact/Organization identity, per-project relationship, board/card/task/filter view and safe CSV export.

**Acceptance and failure behavior:**

- Deduplicate reversible identity links without merging private project notes or losing source/provenance.

- Status/value/assignee/attachments/tasks and saved filters; CSV formula safety and import bounds.

- Suppression/erasure/revocation applies at send-time; external lead databases and quotas require E2.

- Ownership/access fixtures and expected-revision edits precede creator/campaign consumers.

- Recipient fields distinguish observed identity/public business contact, inferred need, source/date and verification status. A discovered address is not deliverability, consent or buying intent; unresolved identity stays unknown for recipient-specific drafts.

- Restore current suppressions/erasure/connection revocation through the WP07 external journal before retrieval or sending; a content-only historical import cannot revive recipient or send authority.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6: **component**, producer WP18. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP18.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP19: Permitted creator research and media transcription

**Milestone:** M3. **Dependencies:** WP10, WP18, WP55, WP57. **Status:** planned.

**Owner:** creator/research maintainer. **Independent acceptance:** rights/privacy reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.creators.discover`, `cap.evidence.transcribe`.

**Files:** `apps/server/src/studio/creators.ts`, `apps/server/src/studio/transcription.ts`, `apps/server/src/studio/transcription.test.ts`, `apps/web/src/features/studio/creators/CreatorResearch.tsx`.

**Consumes:** Authorized source/media, creator profile/contact identity and analysis/quotation/transformation/redistribution permissions.

**Produces:** CreatorFitEvidence and TranscriptAsset {mediaHash, duration, language, segments, toolModelRevision, corrections, provenance}. CreatorAnalysis {sourceRevision, inspectedCounts, observedFields, inferredThemesAudienceVoice, gaps, corrections}.

**Acceptance and failure behavior:**

- Native captions, third-party transcripts, observed frames and ASR are distinct sources; no transcript for silent/future audio.

- Validate accessible decoded non-silent audio, duration/coverage and representative segments; uncertain recognition remains labeled.

- Fit scores are explained hypotheses with counterevidence, never guaranteed conversions.

- Consent withdrawal and source restrictions propagate without deleting necessary minimal audit metadata.

- Creator URL ingestion resolves only accessible licensed profile/content APIs or user imports; unsupported private/social fields block rather than fabricate.

- Posts/reels/transcribed counts equal inspected authorized artifacts; observed/inferred fields and missing engagement evidence remain distinct despite opportunity scores.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6: **component**, producer WP19. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP19.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP20: Creator audits, proposals and partnership responsibilities

**Milestone:** M3. **Dependencies:** WP11, WP18, WP19. **Status:** planned.

**Owner:** partnership/product maintainer. **Independent acceptance:** rights/business reviewer. **External gates:** E3, E6.

**Capabilities:** `cap.creators.audit`, `cap.creators.propose`, `cap.creators.approve`.

**Files:** `modules/creator-audit.json`, `modules/creator-proposal.json`, `packages/studio-contracts/src/partnership.ts`, `apps/server/src/studio/partnerships.test.ts`, `apps/web/src/features/studio/creators/PartnershipPage.tsx`.

**Consumes:** CreatorFitEvidence, offer/product revisions, contact identity and permitted quoted/transformed material.

**Produces:** Original audit/proposal artifacts, duty/deadline/revenue-share hypotheses, rights agreement checklist and relationship tasks. CreatorSplitScenario snapshots proposal assumptions, gross/refund/fee/net/share calculations and unresolved loss/cost allocation.

**External gate applicability:**

- E3: Operational merchant/payment or actual tax/account claims; not the local hypothetical worksheet.

- E6: Affected creator/source rights and specialist claims, including proposal use.

**Acceptance and failure behavior:**

- Loom/video-audit scripts and proposal variants match inspected evidence; no assumed access to proprietary audit prompts.

- Responsibilities/percentages are explicit drafts; percentages do not implement fund custody or automated payouts.

- Permission/approval records and manual human contract handoff; no unapproved outreach.

- Revision/withdrawal updates affect dependent campaigns and rights readiness.

- Outline approval binds exact revision and attributed actor/method/evidence; distinguish user-recorded external approval from identity-verified collaborator action. Rejection/edits stale affected approval. Verified remote approval requires M6C/M8A access, not an invented M3 sharing service.

- Creator split scenarios snapshot currency, price/time window, reachable exposure and its source or assumption, conversion including zero, refunds, fixed/variable fees and their refund treatment, cost responsibility and proposed split basis/percentages. Followers/views are not automatically reachable buyers; unknown exposure cannot produce a forecast.

- Use built-in deterministic minor-unit arithmetic with declared rounding/remainder and validated share/refund bounds. Show gross, refunds, fees, pre-split net, each share and party costs separately; never double-deduct costs. Zero sales retains fixed costs; negative net shows loss with allocation unresolved until agreed; unknown inputs keep affected totals unknown or conditional.

- Edit/export sensitivity cases with assumptions and proposal revision; no earnings, signed agreement, realized revenue or payout claim. This M3 worksheet needs neither M6B generated-code execution nor M7D merchant accounting.

- Compute and export a clearly hypothetical deterministic split with no merchant account. E3 applies only to operational merchant/tax/payment claims or actions; E6 still governs relevant source rights and specialist claims. No money movement or merchant readiness follows from arithmetic.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9: **component**, producer WP20. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP20.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP21: Original workflow library, reusable context and composition

**Milestone:** M3. **Dependencies:** WP11, WP14, WP18, WP52, WP55, WP17. **Status:** planned.

**Owner:** workflow maintainer. **Independent acceptance:** product/security reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.workflows.library`.

**Files:** `modules/workflows/catalog.json`, `packages/studio-contracts/src/workflow.ts`, `apps/server/src/studio/workflows.ts`, `apps/server/src/studio/workflows.test.ts`, `apps/web/src/features/studio/workflows/WorkflowLibrary.tsx`.

**Consumes:** Versioned brand/audience/offer context and permitted tool/capability registry.

**Produces:** Searchable categories/favorites/context profiles, save/copy/history and validated workflow composition. JobCard projects existing definition/run-plan contracts; ServiceJob records client, permitted inputs, deliverable, revision allowance and attributed handoff state.

**Acceptance and failure behavior:**

- Original functional catalog covers strategy, email/editing, pages, hooks/CTAs, objections/FAQs, social/story and video/ad briefs.

- Each card declares input/output and tools; generated text cannot grant new capabilities.

- Compose bounded acyclic workflows with inherited model/grant/budget policy and stale-input handling.

- Acceptance measures usefulness and coverage, not an unverifiable matching agent count.

- Landing/page workflows accept explicit block choices, optional instructions and context revisions; source-link import is a capability-checked evidence operation. Actual generate/edit/save/reopen/export is tested without relying on montage progress states.

- Reusable job cards show purpose, required inputs/reused context revisions, example output, exact provider/account/model/options/host, effective identity or unverified status, required versus granted tools, budgets/cost unknowns, approval stops, completion checks and handoff. Save/copy never carries credentials or action approvals.

- Rerun changed inputs while preserving manual edits and rechecking stale evidence, rights, exact model, grants and budgets. M1/M2 job views use the harness contract without depending on this M3 searchable/composable library.

- ServiceJob distinguishes one client/contact from a reusable product pack: permitted input revisions/uses, deliverable/format, factual and brand constraints, exclusions, revision allowance, completion criteria and handoff method. Terms stay proposed until attributed agreement; scope changes version the job.

- Complete an original supplied-service-sheet/logo to editable ad brief/copy sample with one revision round and local export. Public assets alone do not grant reuse rights. Export-ready, manually handed off and client-accepted require different evidence; portals/e-sign/invoices stay M8A and generated image/video stays M4A.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9: **component**, producer WP21. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP21.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP22: Launch planning, campaigns and sequence drafts

**Milestone:** M3. **Dependencies:** WP17, WP18, WP21. **Status:** planned.

**Owner:** campaign maintainer. **Independent acceptance:** editorial/privacy reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.campaigns.compose`, `cap.feedback.manual`, `cap.campaigns.upsell`.

**Files:** `packages/studio-contracts/src/campaign.ts`, `apps/server/src/studio/campaigns.ts`, `apps/server/src/studio/campaigns.test.ts`, `apps/web/src/features/studio/campaigns/CampaignPage.tsx`.

**Consumes:** Offer/product/brand versions, authorized audience/contact segment and workflow library.

**Produces:** CampaignVersion with funnel/page/email/social/script variants, follow-up plan, calendar, experiment hypothesis and manual feedback. ProofBundle binds sample artifact/hash, recipient/contact revision, channel, unsent message and disclosure review.

**Conditional input dependencies (not universal prerequisites):**

- WP20: A creator-backed campaign consumes partnership rights, responsibilities or attributed approval. Refuse missing or stale creator permission/approval; direct-product drafts accept approved offer/context without creator records.

**Acceptance and failure behavior:**

- Campaign references exact offer/context/contact versions; previews and variants are editable with revision conflicts.

- Schedule drafts show timezone/windows and proposed cost; no actual send capability at M3.

- Manual objections/results link to product/campaign versions; unknown data is not zero.

- Privacy-aware exports and recipient/suppression readiness feed M4B, not an implied send receipt.

- Upsell assets reference a real configured additional offer and eligibility; unconfigured checkout remains a draft.

- Original fourteen-day story-launch and prelaunch validation templates preserve editable schedule, evidence and channel constraints.

- Cold/warm/retargeting variants and coaching/course/template contexts use actual permitted context, never false testimonials.

- ProofBundle binds the exact reviewed sample artifact revision/hash, proposed recipient/contact revision, channel and unsent message version plus observed fit evidence/date, verification status, assumptions and next-step request. Review only intended disclosures; omit private client inputs/internal notes. Changing any bound version invalidates review.

- Copy/export the recipient-safe sample plus pitch as a complete M3 outcome with zero sends or remote-draft uploads; no provider receipt is fabricated. M4B rechecks sender/reply/suppression state and exact payload approval; M4C owns publishing. The originating M2 sample/export remains usable without M3.

- Service-job campaign drafts retain client/input/deliverable/revision/handoff references and proposed/agreed status; an unsent pitch proves neither a client order nor accepted work.

- A direct-product launch draft consumes approved offer/product/context ports without creator records. Creator-backed campaigns require the conditional WP20 rights/approval contract; imported valid inputs do not require completing unrelated screens. No mail connection is needed to prepare drafts.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11: **component**, producer WP22. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP22.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP23: Bounded image-generation connector

**Milestone:** M4A. **Dependencies:** WP06, WP09, WP17. **Status:** planned.

**Owner:** media maintainer. **Independent acceptance:** rights/cost/security reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.media.image`.

**Files:** `apps/server/src/studio/connectors/image.ts`, `apps/server/src/studio/connectors/image.contract.test.ts`, `apps/web/src/features/studio/media/GenerationQuote.tsx`.

**Consumes:** Licensed inputs, BrandProfile, exact provider/model/dimensions, expiring quote and approval/budget.

**Produces:** ImageJob state, effective identity, asset/provenance/rights metadata and reconciled cost receipt.

**Acceptance and failure behavior:**

- Quote/reserve/dispatch/reconcile distinguish rejected, failed-charged, pending and successful jobs.

- No duplicate retry on unknown outcome; cancellation limitations and failed-job fees are visible.

- Readable composition, brand/rights/accessibility QA; explicit likeness permission where relevant.

- Sandbox/live compatibility proves selected provider capability before enabling it.

- Client samples use permitted supplied inputs and preserve factual property/product details; misleading edits fail review. Quote the actual automated tool route/account allowance separately from website plans, rerolls and recurring access; incomplete charges stay unknown.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP23. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A6, A7: **component**, producer WP23. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A6, A7: **integration**, producer WP23. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP23.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP24: Bounded video-generation connector

**Milestone:** M4A. **Dependencies:** WP06, WP09, WP17. **Status:** planned.

**Owner:** media maintainer. **Independent acceptance:** rights/cost/security reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.media.video`.

**Files:** `apps/server/src/studio/connectors/video.ts`, `apps/server/src/studio/connectors/video.contract.test.ts`, `apps/web/src/features/studio/media/VideoJobs.tsx`.

**Consumes:** Reviewed script/assets, voice/likeness permissions, exact model/duration/resolution, expiring quote and budget.

**Produces:** VideoJob with async polling/webhook policy, asset QA, provider retention and charge receipt.

**Acceptance and failure behavior:**

- Independent video entitlement/scopes and duration pricing; image support never certifies video support.

- Async completion, timeout/revoke/unknown/cancel/failed-charge and duplicate-event fixtures.

- Audio/caption/readability/brand review plus licensed asset and synthetic provenance records.

- Provider download/retention/egress bounds and explicit always-on receiver if required.

- Only a downloaded, inspectable final video passing asset QA may be labeled completed video; a script/storyboard, prepared preview, provider terminal text or unknown job outcome cannot satisfy that result. Include actual route/entitlement, failed/retried charges and unknown costs.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP24. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A6, A7: **component**, producer WP24. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A6, A7: **integration**, producer WP24. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP24.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP25: Sender readiness and durable inbox lifecycle

**Milestone:** M4B. **Dependencies:** WP06, WP09, WP18, WP22. **Status:** planned.

**Owner:** messaging maintainer. **Independent acceptance:** independent messaging/security reviewer. **External gates:** E2.

**Capabilities:** `cap.campaigns.inbox`, `cap.campaigns.sender`.

**Files:** `apps/server/src/studio/connectors/mailbox.ts`, `apps/server/src/studio/inbox.ts`, `apps/server/src/studio/inbox.test.ts`, `apps/web/src/features/studio/campaigns/SenderReadiness.tsx`.

**Consumes:** Supported mailbox API/history, scoped credentials, sender/domain ownership and contact/suppression graph.

**Produces:** SenderReadiness; inbox cursor/history-gap state; message/thread/reply/bounce/complaint/unsubscribe projections.

**Acceptance and failure behavior:**

- Initial sync/cursor/backfill/dedup/reorder fixtures; exact account/provider IDs and thread correlation.

- Revocation, unknown inbox health, reply, bounce or complaint makes affected follow-ups ineligible.

- Provider-reported SPF/DKIM/DMARC, daily limits and authorized sender domain readiness shown honestly.

- Choose provider-managed durable polling/events or authorized always-on ingress; sleeping desktop is not a webhook receiver.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP25. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A5, A6: **component**, producer WP25. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A5, A6: **integration**, producer WP25. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP25.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP26: Approved email dispatch and safe follow-ups

**Milestone:** M4B. **Dependencies:** WP25. **Status:** planned.

**Owner:** messaging maintainer. **Independent acceptance:** independent security/privacy reviewer. **External gates:** E2.

**Capabilities:** `cap.campaigns.send`.

**Files:** `apps/server/src/studio/connectors/email.ts`, `apps/server/src/studio/dispatch.ts`, `apps/server/src/studio/dispatch.test.ts`, `apps/web/src/features/studio/campaigns/SendReview.tsx`.

**Consumes:** CampaignVersion, exact recipient payloads, fresh InboxState, SenderReadiness and bound approval.

**Produces:** PreparedAction; sent/accepted/delivered/failed/Unknown receipts; resumable bounded sequence state.

**Acceptance and failure behavior:**

- Recheck suppression/reply/credentials/readiness immediately before each dispatch; test concurrent changes.

- Timezone/DST/daily/provider rate limits, unsubscribe and emergency-stop fixtures.

- Provider idempotency and history reconciliation prevent blind replay; a late reply cannot recall sent mail.

- Unattended schedules require provider-enforced reply stops or awake fresh-sync host; no guaranteed deliverability.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP26. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP26.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP27: Select and verify destination capability contract

**Milestone:** M4C. **Dependencies:** WP16, WP17. **Status:** planned.

**Owner:** distribution maintainer. **Independent acceptance:** business/security reviewer. **External gates:** E2, E3.

**Capabilities:** `cap.publishing.destination`.

**Files:** `docs/DESTINATION-COMPATIBILITY.md`, `packages/studio-contracts/src/distribution.ts`, `apps/server/src/studio/connectors/destination.contract.test.ts`.

**Consumes:** E2/E3 selected official vendor/API/sandbox, approved publication/customer-access responsibilities and artifacts.

**Produces:** DestinationCapabilityMatrix plus MerchantConnection readiness for account/entity/mode, listing, checkout, events, downloads, courses, memberships, refunds and reconciliation.

**Conditional input dependencies (not universal prerequisites):**

- WP22: Publication consumes a Studio campaign/listing draft. Require accepted campaign/version contract for that input; a reviewed direct offer may be supplied independently.

- WP20: A creator partnership supplies the publication rights or approvals. Missing or withdrawn creator permission blocks the creator-backed publication, not a separately owned direct product.

**Acceptance and failure behavior:**

- Choose actual supported vendor before adapter implementation; API access is not inferred from website UI.

- Record scopes/fees/country/entity/account requirements, event signatures, idempotency and sandbox limitations.

- Capability-specific fixtures and bounded trusted live/sandbox evidence; unsupported features remain disabled.

- Separate manual export/handoff from successful API publication, merchant sale or fulfillment.

- Apply PAYMENTS.md: choose creator legal entity, provider account/store and test/live mode independently of Studio BillingOrganization and active project; verify ownership and country/product/payout eligibility before checkout.

- Proposed first original-download route is a creator-owned approved Lemon Squeezy store with manual product/file setup and API read-back where writes are unavailable; no Studio master-store resale. Courses/memberships require a separate qualified provider, with Whop only a candidate.

- Record processor versus MoR responsibilities per agreement, tax mode/jurisdiction, approved AI/digital goods/services, refund/dispute loss, bank/currency and always-on delivery/event requirements. Generic AI support or a supported buyer country is not merchant approval.

- Connect/platform/split flows stay disabled until a specific direct/destination/separate-charge model, fee payer, loss liability, country/region, onboarding and reversal contract passes independent E3 review; no custody or payout engine inferred.

- Run a direct-product destination test with reviewed artifacts and an approved offer/context, with creator and email capabilities disabled. A creator-backed launch still refuses missing rights/approval; merchant, publication and buyer-access gates remain intact.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

**Evidence phase / producer (all not-run):**

- A1, A2, A4, A5, A6, A7, A8, A9: **component**, producer WP27. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A3, A10, A11: **component**, producer WP27. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A3: **integration**, producer WP27. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

- A10, A11: **integration**, producer WP27. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP27.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP28: Versioned listing and artifact publication

**Milestone:** M4C. **Dependencies:** WP27. **Status:** planned.

**Owner:** distribution maintainer. **Independent acceptance:** security/editorial reviewer. **External gates:** E2, E3, E6.

**Capabilities:** `cap.publishing.publish`.

**Files:** `apps/server/src/studio/connectors/publication.ts`, `apps/server/src/studio/publications.ts`, `apps/server/src/studio/publications.test.ts`, `apps/web/src/features/studio/publishing/PublishReview.tsx`.

**Consumes:** Reviewed exact ArtifactVersion, destination capability, listing/page draft and bound action approval.

**Produces:** PublicationVersion; prepare/dispatch/reconcile receipt with remote IDs and artifact hashes.

**Acceptance and failure behavior:**

- Dry-run exact listing/payload/assets, changed revision invalidates approval.

- Unknown outcome and remote history reconciliation; no duplicate listing/upload on blind retry.

- Visibility/update/withdrawal scopes tested and no desktop engine exposed to buyers.

- Generated media dependencies apply only when selected; listing success does not mean payment or delivery.

- Preview merchant identity, provider account/mode, offer/artifact version, allowlisted price/currency/tax behavior, buyer license/refund/support/delivery terms and checkout destination; account/project/price changes invalidate approval.

- Test/live credentials, IDs, products and receipts cannot cross modes; unsupported product/file writes use a labeled manual export/setup/read-back receipt, never fabricated API publication.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6: **component**, producer WP28. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP28.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP29: Verified merchant events and order/refund projection

**Milestone:** M4C. **Dependencies:** WP27. **Status:** planned.

**Owner:** commerce integration maintainer. **Independent acceptance:** independent commerce/security reviewer. **External gates:** E2, E3.

**Capabilities:** `cap.commerce.orders`.

**Files:** `apps/server/src/studio/connectors/merchant.ts`, `apps/server/src/studio/orders.ts`, `apps/server/src/studio/orders.test.ts`, `packages/studio-contracts/src/commerce.ts`.

**Consumes:** External merchant authority, signed events/durable history and product-to-offer mapping.

**Produces:** OrderProjection with bound merchant/account/environment, exact offer, currency/gross/tax/discount/fees/refund/dispute/payment/fulfillment status, provider IDs and reconciliation completeness.

**Acceptance and failure behavior:**

- Signature/raw body, timestamp/replay, duplicate/out-of-order/payment/refund/chargeback fixtures.

- Webhook ingress is destination-managed or isolated always-on service; no unauthenticated local RPC.

- Creator sales stay separate from studio credit ledger and partner compensation.

- Tax/refund/customer financial authority stays with E3 merchant; import never claims custody or payout execution.

- Server checks account/environment/merchant/order ownership, expected offer/amount/currency and authoritative paid status; a redirect/client success flag or invoice creation never authorizes access or a charge.

- Durable inbox plus semantic payment/order effect keys handles separate event IDs for one sale, delayed methods, refund-before-paid, dispute-after-paid and stale valid redelivery; fetch current provider state/history rather than trust arrival order.

- Use provider-specific signatures and signed timestamp checks where supplied; for body-HMAC providers without signed delivery timestamps/unique event IDs, use persisted digests/object versions and authenticated reconciliation, never invented envelope fields.

- M4C provides scoped provider dashboard handoff for payout/refund support and separates sale/payment/fulfillment status; full merchant administration/reconciliation remains WP47 and metrics WP31.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8: **component**, producer WP29. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP29.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP30: Provider-native buyer delivery and access revocation

**Milestone:** M4C. **Dependencies:** WP28, WP29. **Status:** planned.

**Owner:** delivery integration maintainer. **Independent acceptance:** independent access/security reviewer. **External gates:** E2, E3.

**Capabilities:** `cap.publishing.deliver`, `cap.delivery.course`, `cap.delivery.membership`.

**Files:** `apps/server/src/studio/connectors/fulfillment.ts`, `apps/server/src/studio/buyer-access.ts`, `apps/server/src/studio/buyer-access.test.ts`, `apps/web/src/features/studio/publishing/DeliveryStatus.tsx`.

**Consumes:** PublicationVersion, verified OrderProjection and destination-native buyer access contract.

**Produces:** BuyerAccessProjection and delivery receipt bound to exact artifact/course/membership version.

**Acceptance and failure behavior:**

- Independent downloadable-file, course-enrollment and membership-expiry fixtures per supported capability.

- Verified refund/revoke/duplicate/reorder/reconcile and cross-buyer authorization checks.

- Delivery survives closed desktop at provider; downloaded files cannot be recalled and this limitation is disclosed.

- Provider learner accounts/progress/support responsibilities explicit; no implied platform-owned LMS or open marketplace.

- A creator Studio subscription/seat or service-credit change cannot revoke a paid buyer entitlement; buyer identity, offer access and seller merchant scope remain separate.

- Delayed-payment confirmation, failed renewal, cancellation/paid-through expiry, refund-before-grant, revoke/grant races and duplicate fulfillment never resurrect access; signed/scoped asset links and stale projection states are tested.

- Test fulfillment grants only test access. Processor-only checkout needs a separately accepted always-on delivery service; a sleeping creator desktop cannot be the buyer dependency.

- Accept a synthetic payment with desktop closed, interrupt ingress, backfill and resolve paid-but-not-delivered through the named provider/manual support route without a second charge or guessed success. First M4C activation needs WP27 operational readiness, not all of later WP37.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8: **component**, producer WP30. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP30.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP31: Authorized outcome imports and metric semantics

**Milestone:** M4D. **Dependencies:** WP14. **Status:** planned.

**Owner:** analytics maintainer. **Independent acceptance:** data/product reviewer. **External gates:** E2, E3.

**Capabilities:** `cap.feedback.import`.

**Files:** `packages/studio-contracts/src/insights.ts`, `apps/server/src/studio/metrics.ts`, `apps/server/src/studio/metrics.test.ts`, `apps/web/src/features/studio/feedback/MetricsPage.tsx`.

**Consumes:** Authorized campaign/order/refund/customer feedback observations and source completeness windows.

**Produces:** MetricObservation {definition, currency, timezone, window, attribution, completeness, sourceRevision}.

**Conditional input dependencies (not universal prerequisites):**

- WP26: Ingesting Studio-executed campaign results. Verify sender/account, reply/suppression and source-completeness fixtures before enabling this input.

- WP29: Using the merchant order/refund event adapter. Require the accepted account-bound order/event projection; manual observations stay source-labeled.

- WP30: Analyzing provider buyer fulfillment/access outcomes. Require separately accepted delivery/access evidence; an order is not fulfillment.

**External gate applicability:**

- E2: Each selected external observation adapter, not authorized manual notes.

- E3: Merchant financial data and claims, not generic manual feedback.

**Acceptance and failure behavior:**

- Missing/inaccessible data is unknown, not zero; gross/net/refund/fee/payout estimates separate.

- Deduplicate/replay/reorder observations and preserve provider/observed times.

- No causal/income claim from attribution; sample size and uncertainty visible.

- Privacy/retention and revoked connection behavior; manual observations remain useful without connected sales data.

- Export charge/order, invoice/receipt, credit note/refund, provider transfer and bank-payout references separately. Report source-observed pending/held/available/in-transit/failed/returned/paid states and FX/settlement currency without asserting bank receipt or guaranteed earnings.

- No cross-currency sums or incomplete totals disguised as net profit; tax, fee, reserve, refund/dispute and data freshness definitions remain inspectable.

- Manual authorized observations and independently accepted order or campaign adapters can each satisfy the input contract. With M4B disabled, import permitted feedback and produce source-complete observations without mailbox connection or send; E2/E3 apply only to affected external/financial inputs.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7: **component**, producer WP31. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP31.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP32: Experiments and reviewed product revision loop

**Milestone:** M4D. **Dependencies:** WP11, WP14, WP31. **Status:** planned.

**Owner:** product/analytics maintainer. **Independent acceptance:** independent evidence reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.feedback.experiment`.

**Files:** `apps/server/src/studio/experiments.ts`, `apps/server/src/studio/experiments.test.ts`, `apps/web/src/features/studio/feedback/ExperimentPage.tsx`.

**Consumes:** MetricObservation, manual feedback, artifact/campaign revisions and recommendation policy.

**Produces:** ExperimentPlan, observation summary and proposed versioned changes with acceptance decisions.

**Acceptance and failure behavior:**

- Hypothesis/window/metric/limitations frozen before evaluation; no invented statistical certainty.

- Changes target exact artifact/context revisions and preserve manual edits/history.

- New publication/send always needs fresh eligible approval; experiments cannot auto-publish.

- Insufficient data supports abstention or smaller next test; stale/offline observations labeled.

- With M4B and creator workflows disabled, use WP31 manual feedback for a reviewed revision proposal against an exact product version. No mail execution, paid plan or merchant login is needed; later publication still requires its own current approval.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP32. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP32.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP33: Optional cloud identity and tenant-owned workspace

**Milestone:** M5A. **Dependencies:** WP03, WP07, WP17. **Status:** planned.

**Owner:** cloud/auth maintainer. **Independent acceptance:** independent authorization reviewer. **External gates:** E2.

**Capabilities:** `cap.connections.account`.

**Files:** `apps/cloud/convex/schema.ts`, `apps/cloud/convex/workspaces.ts`, `apps/cloud/convex/auth.ts`, `apps/cloud/convex/workspaces.test.ts`, `apps/web/src/features/studio/account/AccountPage.tsx`.

**Consumes:** Reviewed Clerk/Convex official integration for optional hosted identity, stable issuer/subject mapping and local/export identity semantics; vendor-neutral domain ports.

**Produces:** CloudWorkspace, member/role/session policy, BillingOrganization membership and owned asset/control-plane records.

**Acceptance and failure behavior:**

- Read Convex expert skill before writing convex code; identity/tenant/parent/object checks in every exposed function.

- Cross-tenant IDs, role changes, same-email linking, expiry/revoke and account deletion/export fixtures.

- Local launch and files remain independent of cloud login; no reuse of upstream account records.

- Subprocessors/retention/secrets documented and auth recovery reviewed.

- Model BillingOrganization/payer membership and billing-admin/seat-assignment roles independently of project navigation, creator MerchantConnection and buyer identity. Same email or active project cannot select the payment principal.

- Authenticated export/delete and membership removal inventory renewals, pending jobs/refunds/disputes, provider-held records and data-retention tombstones; retained finance evidence cannot resurrect deleted content or grant new spend.

- Hosted identity prefers Clerk through the official Convex integration; domain authorization stays vendor-neutral. Stable issuer/subject maps to an internal user and explicit workspace membership. Sign-in/connector tokens cannot confer billing-admin or merchant authority.

- Convex validates issuer/audience and authenticated session before tenant/parent/object/asset checks; a signed-in renderer, same email or Clerk organization claim alone cannot grant Studio membership or payer rights. WorkOS is an alternative only after an explicit migration decision, never a parallel identity authority.

- Prefer hosted/system-browser sign-in with a separately qualified desktop bridge: packaged custom origins/IPC/CSP, state/nonce, one-use callback allowlist, supported methods, secure main-process storage and expiry/revoke recovery. Do not indiscriminately embed remote auth UI in the trusted renderer or widen its CSP/IPC. Clerk Electron SDK beta is a pinned, separately qualified alternative, never a mandatory shell scaffold or local open/edit/export dependency.

- Use existing Convex private storage/indexes and coordination through ports; do not add a second database or scheduler. Clerk Billing is not enabled: the direct billing adapter and Studio service-unit ledger remain the sole WP35 service-billing authorities.

**Evidence phase / producer (all not-run):**

- A1, A3, A5, A6, A7, A10: **component**, producer WP33. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A2, A4, A8, A9: **component**, producer WP33. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A2, A4, A8, A9: **integration**, producer WP33. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP33.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP34: Explicit fenced project transfer and backup

**Milestone:** M5A. **Dependencies:** WP33. **Status:** planned.

**Owner:** data/cloud maintainer. **Independent acceptance:** independent distributed-data reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.connections.transfer`.

**Files:** `apps/server/src/studio/transfers.ts`, `apps/server/src/studio/transfers.test.ts`, `apps/cloud/convex/transfers.ts`, `apps/web/src/features/studio/account/TransferReview.tsx`.

**Consumes:** SnapshotManifest, compatible schemas, cloud/local ownership locks and authenticated scope.

**Produces:** TransferManifest and ownership epoch with freeze/prepare/commit/fence/recover protocol.

**Acceptance and failure behavior:**

- Reject old-writer commands after ownership commit; failed transfer remains resumable/read-only.

- Copy receives new project ID; do not sync live DB files or migrate credentials, approvals or balances.

- Hash/schema/cross-version/conflict/tombstone and restore tests; inspect exact destination/data disclosure.

- Cloud project deletion does not erase independent local exports; privacy/retention consistent.

- Project switch/copy/transfer retains only explicit non-secret payment references; destination must reauthorize BillingOrganization and merchant bindings. Never copy service balances, provider customer ownership or live checkout/portal sessions as project authority.

- Before ownership commit, fence new dispatch and inventory queued/native runs, provider-held schedules, sessions, leases, Unknown operations and connection/account generations. For every operation cancel with evidence, retain one named custodian, or reconcile/adopt under exact account authority; unresolved custody blocks the conflicting destination action lane while content inspection/export remains available.

- Carry logical operation/attempt IDs, late-result routing and unresolved resource fences across the ownership epoch, never credentials or reusable approvals. Late receipts reach current authority without reviving the old host or replaying effects; a different reconnect account cannot adopt original-account work.

- Transfer a pending provider schedule and an Unknown send/publication; restart old host, deliver late webhook and move Dot local/cloud. Assert one logical acceptance, no conflicting redispatch and no dual event processing after commit.

- Provide verified local snapshots before/after transfer and authenticated non-paywalled export/handback of current retained cloud revisions/assets, with no funded AI job required. Proposed 30-day read/export window and disclosed capacity/retention/deadline must be finalized before hosted activation/checkout; preserve payment-specific finance obligations.

- Test compute exhaustion, service/storage/team lapse, revoked membership, expired login and outage separately. Legitimate owners reauthenticate for export; revoked users gain no grace authority. Cloud-to-local handback commits a new fenced epoch only after manifest/assets/custody checks; never silently unfreeze a stale local writer.

- Create cloud-only revision/assets, lapse entitlement and recover them locally without a new purchase. During outage show last verified cache time and missing bytes; an explicit offline content fork has a new ID and no inherited approvals, money or external operations. Reconnection cannot auto-merge authority; test missing asset and retention deadline recovery independently.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11: **component**, producer WP34. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A1, A2, A3, A4, A5, A6, A7, A9, A10, A11: **integration**, producer WP34. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

- A8: **integration**, producer WP34, WP26, WP28, WP60, WP62. Run with each enabled external-action adapter; Dot scenario applies only when WP60/channel capabilities activate. Earlier transfer uses synthetic operation fixtures and qualified currently enabled adapters, not a dependency on all later channels.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP34.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP35: Studio subscriptions, prepaid service units and payment lifecycle

**Milestone:** M5B. **Dependencies:** WP06, WP33. **Status:** planned.

**Owner:** billing maintainer. **Independent acceptance:** independent finance/security reviewer. **External gates:** E4.

**Capabilities:** `cap.connections.credits`.

**Files:** `apps/cloud/convex/billing.ts`, `apps/cloud/convex/ledger.ts`, `apps/cloud/convex/billing.test.ts`, `packages/studio-contracts/src/service-billing.ts`, `apps/cloud/convex/subscriptions.ts`, `apps/cloud/convex/service-entitlements.ts`, `apps/cloud/convex/subscriptions.test.ts`, `apps/web/src/features/studio/account/BillingPage.tsx`, `docs/PAYMENTS.md`.

**Consumes:** E4 pre-build provider/rights/terms decision and bounded synthetic or authorized trusted-pilot budget; authenticated BillingOrganization and immutable service price/terms version. Measured WP37 economics are public-paid activation evidence, not a prerequisite to building component fixtures.

**Produces:** Payer-bound CheckoutIntent, SubscriptionProjection, ServiceEntitlement/SeatAssignment and append-only service-unit ledger with atomic reserve/settle/refund/dispute reconciliation; no cash wallet.

**External gate applicability:**

- E4: Pre-build rights/provider/terms/budget decision; independent public-paid activation requires measured WP37 evidence.

**Acceptance and failure behavior:**

- Two concurrent spends, duplicate/reordered events, webhook signatures, refund/chargeback and unknown usage fixtures.

- Only trusted commands change balances; refunds/corrections are entries, no mutable client balance authority.

- Service-unit expiry/refund/currency/rate rules and processor/operational dispute reserves reviewed; USD 19.95 remains a measured service-pack experiment, never unlimited or self-issued money.

- Separate personal provider usage, creator merchant sales and partner compensation; no subscription CLI resale.

- Implement PAYMENTS.md Studio customer flow: payer organization/legal entity/readiness, separate subscription and service-pack selection, explicit test mode, hosted checkout, pending/paid/failed status, invoice/receipt, portal cancellation and refund/support.

- Reference provider is Stripe Checkout/Billing/customer portal conditional on E4. Paddle requires a separate full-offering approval/MoR decision; ordinary Stripe processing is not MoR. Pin provider/API versions and allowlisted price IDs; no silent processor failover.

- Bind actor, BillingOrganization, provider account/customer, environment, currency/quantity, price/terms/tax version and quote ceiling at preparation and dispatch. Reject client-selected price/customer IDs, cross-org sessions and stale checkout after project switching.

- Separate SubscriptionProjection/paid-through service entitlement and seat capacity from CreditLot/UsageReservation and creator commerce. Buying seats cannot invite members, grant roles or activate WP42 collaboration before its gate; revoked membership blocks dispatch.

- First proposal: one-time nontransferable prepaid service units with public exact rate scale, no third-party tender/cash-out, no auto-recharge/overage, no bundled recurring inference allowance/trial. Purchased unused units do not expire initially; promo expiry/refund is separate and E4 terms/mandatory rights govern.

- Subscription upgrade/seat price preview and exact approval; default cancellation/downgrade at paid-through renewal boundary, no unpaid spending grace, and no deletion of packs/local files. Reordered renewal/cancel/past-due events cannot restore expired grants.

- Durable raw-body signature inbox with provider-specific timestamp/dedupe plus semantic unique purchase/invoice-line grants, account/mode validation and current-state reconciliation. Test return-URL forgery, delayed success, duplicate events with distinct IDs and refund-before-paid.

- Atomic refund freeze races two spends/settlement safely; original-method refund tracks requested/pending/succeeded/failed and tax/credit-note adjustments without duplicate refund or unit release. Cancellation does not prove provider termination or refund.

- Chargeback after consumption freezes affected units/new dispatch per risk policy; financial deficit/loss is separate from nonnegative spendable units. Dispute win/refund reversal produces a single correction, never an unapproved card charge or seizure of creator earnings.

- Authenticated payer-scoped portal/invoice downloads, finance-role access, no card/secret/log leakage, org deletion/export grace and finance retention/tombstones; restored state reconciles before regrant/spend.

- Accept component ledger/checkout fixtures before WP36/WP37 integration; E4 public-paid activation remains closed until measured WP37 economics, operations and required commercial approval. Evidence-order tests must never mark those later producers passed to unblock development.

**Evidence phase / producer (all not-run):**

- A1, A2, A4, A5, A7, A8, A10, A11, A12, A13: **component**, producer WP35. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A3, A6, A9, A14, A15: **component**, producer WP35. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A3, A6, A9, A14: **integration**, producer WP35. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

- A3: **public-release**, producer WP37. Measured economics and approved terms under E4.

- A6: **public-release**, producer WP37. Commercial approval and operations before live paid activation.

- A15: **public-release**, producer WP37. Later E4 evidence stays pending during component acceptance.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP35.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP36: Isolated hosted API job workers

**Milestone:** M5B. **Dependencies:** WP34, WP35, WP09. **Status:** planned.

**Owner:** worker/platform maintainer. **Independent acceptance:** independent isolation/security reviewer. **External gates:** E2, E4.

**Capabilities:** `cap.connections.cloud`.

**Files:** `apps/worker/src/studio/jobs.ts`, `apps/worker/src/studio/isolation.ts`, `apps/worker/src/studio/jobs.test.ts`, `apps/cloud/convex/jobs.ts`.

**Consumes:** Fenced cloud project authority, reserved service budget, exact model policy and scoped job grants.

**Produces:** Hosted BusinessRun mapped to isolated worker/API execution with metered receipts and artifact finalization.

**External gate applicability:**

- E2: Actual worker/provider account/scopes and permitted data use.

- E4: Pre-build decision and explicitly bounded trusted pilot; public paid activation after WP37.

**Acceptance and failure behavior:**

- Tenant isolation, no ambient secrets/mounts, scoped network and runtime/byte/concurrency limits.

- Crash/retry/cancel/unknown/provider-reroute and orphan-reservation recovery fixtures.

- Commercial official API credentials only; do not impersonate local personal CLI subscription.

- Minimize disclosed content and record provider destinations/retention; exact selections validated on worker.

- Recheck payer-organization membership, job-bound billing binding, paid service entitlement where required, scoped grant, lot reservation and project ownership epoch immediately before dispatch; project switching and revoked seats cannot charge another organization.

- Cancellation/crash after provider billing leaves bounded unknown usage reserved until reconciled; stable attempt/usage receipt keys settle once across child/parent callbacks. No invented actual charge, unapproved overage or lease-timeout blind refund.

- Commercial permission covers every enabled model/media API and service resale/use case, not just technical API compatibility; no pooled consumer OAuth or studio CLI-subscription resale.

- Component workers use fixtures and pre-build E4 decisions; only separately authorized capped non-public pilots may use real accounts/budgets. Public paid dispatch remains disabled until WP37/E4 activation evidence; a successful synthetic worker is not an available service.

**Evidence phase / producer (all not-run):**

- A1, A2, A4, A5, A6: **component**, producer WP36. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A3, A7, A8: **component**, producer WP36. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A3, A7: **integration**, producer WP36. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

- A8: **public-release**, producer WP37. Public paid dispatch requires accepted operational/economic evidence.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP36.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP37: Hosted operations, incidents and economic release gate

**Milestone:** M5B. **Dependencies:** WP35, WP36. **Status:** planned.

**Owner:** operations maintainer. **Independent acceptance:** independent operations/finance reviewer. **External gates:** E4.

**Capabilities:** `cap.connections.operations`.

**Files:** `docs/OPERATIONS.md`, `docs/UNIT-ECONOMICS.md`, `apps/cloud/convex/operations.ts`, `apps/worker/src/studio/restore.test.ts`.

**Consumes:** Metered worker, ledger/provider/processor reconciliation and infrastructure account responsibilities.

**Produces:** Runbooks, retention/backup/restore policy, abuse controls, observability and bounded support/economic model.

**Acceptance and failure behavior:**

- Restore/incident/revocation and provider outage exercises; unknown jobs and accounts reconciled before resume.

- Measure retries/media/rendering/storage/egress/support/disputes; capped pilot before public pricing.

- Redacted logs, alert thresholds, queue health, emergency stop and verified reporting route.

- No public hosted availability claim before named on-call owner, capacity/abuse tests and E4 approval.

- Before live checkout name seller/MoR, entity/country/product approval and finance/support owner; publish rates/tax/invoice/refund/expiry/cancellation/retention terms and service dependencies. Account approval cannot be inferred from locale.

- Reconcile processor cash/charges/invoices/refunds/disputes, ledger purchase lots/reservations and worker receipts independently with cursor/gap/dead-letter/age alerts; restore stays fenced until reconciliation prevents duplicate grant or stale access.

- USD 19.95 grant/rates remain unpriced until measured success/failure/retry/media/support/FX/Billing/tax/MoR/abuse costs and unconsumed service obligations pass a capped pilot; publish no unlimited or profit guarantee.

- Finance cash-loss reserves, processor holds and job-unit reservations are distinct; test consumed-credit chargeback, pending refund and outage recovery. No card recovery charge or creator-balance offset without specific authority.

- Cancellation/deletion inventories provider-held renewals/jobs/refunds, stops future dispatch and preserves authenticated export/read grace (proposed 30 days) plus disclosed jurisdiction-specific finance/dispute/backup retention. No export ransom or immediate-erasure claim.

- Measure low-use, normal-use, high-retry and abusive-ingress cohorts and a zero-new-top-up cohort with retained assets/pending events. Name the payer and bounded fixed/idle floor for ingress, storage/backups/export grace, workers/browser uptime and each mailbox/number/domain renewal; optional connector costs remain separate from AI units.

- Reconcile measured cash, redeemed units, actual provider/tool charges and outstanding purchased/reserved obligations without counting face credit as expense or nested child charges twice. A rate/free-tier change blocks or requotes affected work, never switches provider or silently charges more.

- After WP36 selects a host, publish one reproducible minimal operator recipe for deploy/backup/restore/export/shutdown and measured limits. Cloudflare is optional DNS/TLS/static edge; Node/API/native workers stay isolated on a qualified host. Reuse Convex storage/outbox/coordination; private R2 only after an explicit measured size/egress/retention gate and migration/access/restore evidence. Record representative asset-size distribution, retained bytes, egress and restore latency/cost against operator-approved thresholds; accept R2 only if the existing storage port cannot meet those measured limits or materially improves the approved cost budget, with one manifest authority.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12: **component**, producer WP37. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12: **integration**, producer WP37. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

- A2, A4, A5, A7, A9, A10, A11, A12: **public-release**, producer WP37. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP37.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP38: Scoped responsive paired-device control

**Milestone:** M5C. **Dependencies:** WP05, WP06, WP07, WP08, WP09. **Status:** planned.

**Owner:** platform/protocol maintainer. **Independent acceptance:** independent pairing/security reviewer. **External gates:** E7.

**Capabilities:** `cap.connections.pair`.

**Files:** `apps/server/src/studio/device-policy.ts`, `apps/server/src/studio/device-policy.test.ts`, `packages/contracts/src/rpc.ts`, `apps/web/src/features/studio/devices/PairingPage.tsx`.

**Consumes:** Existing upstream environment transport/pairing primitives plus project/action-scoped grants.

**Produces:** One-use pairing challenge, revocable device grant and responsive dashboard control of chosen execution host.

**Acceptance and failure behavior:**

- Replay/expiry/revoke/lost-device/compromised-relay and cross-project grant tests; independent protocol review.

- Sleeping host/unavailable version/offline activity handled honestly; remote control does not require cloud wallet.

- No raw CLI credentials or self-expanded grants on phone; external actions retain exact approval requirements.

- 320px/touch/keyboard/motion checks; native mobile app is a separate E7 decision.

- Paired-device auth is distinct from Clerk hosted identity and local engine auth. A cloud sign-in callback cannot create a device grant; a device grant cannot assign payer/merchant authority. Test switching project/host while callbacks arrive and preserve account-free paired local control.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP38. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP38.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP39: Reviewed declarative extension distribution

**Milestone:** M6A. **Dependencies:** WP09, WP17, WP21, WP52, WP53. **Status:** planned.

**Owner:** extension maintainer. **Independent acceptance:** independent supply-chain/security reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.connections.extensions`.

**Files:** `packages/studio-contracts/src/extension.ts`, `apps/server/src/studio/extensions.ts`, `apps/server/src/studio/extensions.test.ts`, `apps/web/src/features/studio/connections/ExtensionsPage.tsx`.

**Consumes:** Bundled manifest/contract model, publisher/version/hash/scopes/license/revocation metadata.

**Produces:** Verified declarative extension install/update/remove workflow with explicit authority review.

**Acceptance and failure behavior:**

- Downloaded instructions are untrusted data; cannot self-grant shell/network/secrets.

- Pin source/version/hash and inspect dependencies; no floating automatic execution.

- Upgrade scope changes require new decision; revoke/remove blocks future dispatch without corrupting artifacts.

- Registry supply-chain, tamper, rollback and compatibility fixtures; popularity never passes security gate.

- Apply WP53 trust expiry/revocation policy at install/update/dispatch, including cached signed extensions offline. Recover compromised signing keys through the independently authenticated update path, never a permanent signature bypass; existing artifacts remain readable/exportable.

**Evidence phase / producer (all not-run):**

- A1, A2, A3: **component**, producer WP39. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A4, A5: **component**, producer WP39. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A4, A5: **integration**, producer WP39. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP39.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP40: OS-isolated executable plugin lane

**Milestone:** M6A. **Dependencies:** WP39. **Status:** planned.

**Owner:** sandbox/platform maintainer. **Independent acceptance:** independent sandbox/security reviewer. **External gates:** E7.

**Capabilities:** `cap.connections.plugins`.

**Files:** `apps/server/src/studio/sandbox.ts`, `apps/server/src/studio/sandbox.test.ts`, `packages/studio-contracts/src/sandbox.ts`, `docs/SANDBOX-COMPATIBILITY.md`.

**Consumes:** Reviewed executable extension and specific supported OS confinement implementation.

**Produces:** SandboxGrant with bounded CPU/memory/time/disk/network and no ambient host/credential authority.

**Acceptance and failure behavior:**

- Adversarial process escape/file/network/IPC/dependency fixtures on each advertised OS.

- No host secrets, broad mounts or ambient network; controlled artifact handoff and termination evidence.

- Fail closed on unsupported confinement; provider permission mode and confirmation are insufficient.

- Versioned sandbox upgrades, revocation and cleanup tested independently of plugin UI.

- Qualification receipts bind executable digest/driver/CLI/runtime version, model/route, permission configuration, OS/sandbox and tool-schema digest. Recheck observable identity at startup/dispatch; any changed field invalidates affected authority, preserves the saved selection and requires trusted fixture requalification with no silent fallback.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP40. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP40.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP41: Sandboxed interactive digital products

**Milestone:** M6B. **Dependencies:** WP16, WP17, WP40. **Status:** planned.

**Owner:** interactive-product maintainer. **Independent acceptance:** independent domain/security reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.interactive.build`.

**Files:** `modules/interactive-tool.json`, `packages/studio-contracts/src/interactive.ts`, `apps/server/src/studio/interactive.ts`, `apps/server/src/studio/interactive.test.ts`.

**Consumes:** Reviewed product intent, licensed inputs, isolated build lane and typed artifact/export contracts.

**Produces:** Small calculator/assessment/interactive-tool artifacts with inspectable source, bounded build and safe static package.

**Acceptance and failure behavior:**

- No unrestricted generated app deployment; dependency/network policy and static export reviewed.

- Original example calculator and assessment pass domain/logic/accessibility/usability checks.

- Sandbox/preview cannot reach studio engine; no secrets baked into client assets.

- Publication still uses exact reviewed M4C destination capability; interactive external hosting needs E2.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP41. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP41.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP42: Collaborative content editing and shared project roles

**Milestone:** M6C. **Dependencies:** WP34, WP38, WP14. **Status:** planned.

**Owner:** collaboration/data maintainer. **Independent acceptance:** independent distributed-data/auth reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.connections.collaborate`.

**Files:** `packages/studio-contracts/src/collaboration.ts`, `apps/server/src/studio/collaboration.ts`, `apps/server/src/studio/collaboration.test.ts`, `apps/cloud/convex/collaboration.ts`.

**Consumes:** Cloud tenant roles, fenced project authority, paired clients and immutable content/section revision model.

**Produces:** Negotiated editable-content merge protocol, presence/conflict UX and revocable collaboration grants.

**Acceptance and failure behavior:**

- Choose CRDT/merge semantics with concurrent-edit, offline/reconnect and convergence fixtures.

- Reject unauthorized/stale schema writes; role/tenant/deletion/revocation propagation.

- Serialize money, permissions, approvals and external writes outside document merge.

- Fork/copy/restore and unresolved conflict UX preserve manual work and history.

- SOP/document approvals bind exact versions, expose reviewer disagreement and require renewed publication approval after edits.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP42. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP42.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP43: Licensed lead search, verification and enrichment jobs

**Milestone:** M7A. **Dependencies:** WP09, WP18, WP19. **Status:** planned.

**Owner:** data-connector maintainer. **Independent acceptance:** privacy/provider-entitlement reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.contacts.search`, `cap.contacts.enrich`.

**Files:** `packages/studio-contracts/src/lead-data.ts`, `apps/server/src/studio/connectors/lead-data.ts`, `apps/server/src/studio/connectors/lead-data.contract.test.ts`, `apps/web/src/features/studio/contacts/LeadResearch.tsx`.

**Consumes:** Account-specific data-provider entitlement, query/filter schema, declared field coverage, provenance and bounded credit quote.

**Produces:** LeadSearchPlan, FilterSet, EnrichmentOrder {fields, source, price, verificationTime, status, coverage}; safe import/export receipts.

**Acceptance and failure behavior:**

- Company/person geography, industry/keywords/title/seniority/department/headcount/revenue/technology/funding/hiring/intent fields are enabled only when supported.

- AI natural-language search compiles to inspectable provider filters; missing filters/data are not invented.

- Verification timing, email/mobile/company-only enrichment, field mapping, progress/re-download/retention and charged failures have contract fixtures.

- Partner seat cannot inherit full-Bundle API/credits; suppressions and licensed data rights remain enforced; no guaranteed starter leads.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP43. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP43.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP44: Advanced inbox, threaded replies and recipient control

**Milestone:** M7B. **Dependencies:** WP25, WP26. **Status:** planned.

**Owner:** messaging maintainer. **Independent acceptance:** independent privacy/messaging reviewer. **External gates:** E2.

**Capabilities:** `cap.campaigns.inboxadvanced`.

**Files:** `apps/server/src/studio/inbox-actions.ts`, `apps/server/src/studio/inbox-actions.test.ts`, `apps/web/src/features/studio/campaigns/UnifiedInbox.tsx`.

**Consumes:** Fresh InboxState, message/thread IDs, campaign recipient state and bound exact reply approval.

**Produces:** Unified inbox filters/folders, correctable AI categories, notifications and approved CC/BCC/attachment reply actions.

**Acceptance and failure behavior:**

- Threaded reply preserves provider references; recipient/CC/BCC/attachments/link changes invalidate approval; file types/bytes/malware surface bounded.

- Categories are suggestions with human correction; positive-reply alerts respect privacy and notification settings.

- OOO schedules require reviewed continuation policy; pause/resume/lead reuse/company-wide stops never bypass suppressions or stale sync.

- Spintax/personalization previews are inspectable, deterministic per approved payload and have no false personalization claims.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP44. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP44.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP45: Optional sender provisioning and capacity administration

**Milestone:** M7B. **Dependencies:** WP25, WP26. **Status:** planned.

**Owner:** messaging-infrastructure maintainer. **Independent acceptance:** cost/ownership/security reviewer. **External gates:** E2, E3.

**Capabilities:** `cap.campaigns.provision`.

**Files:** `apps/server/src/studio/connectors/sender-admin.ts`, `apps/server/src/studio/connectors/sender-admin.contract.test.ts`, `apps/web/src/features/studio/campaigns/SenderAdmin.tsx`.

**Consumes:** Provider-supported domain/mailbox admin API, account ownership/transfer rules and concrete purchase price approval.

**Produces:** ProvisioningRequest and readiness/ramp/capacity projections; BYO mailbox, personas, signatures and sender assignments.

**Acceptance and failure behavior:**

- Availability checks never purchase; exact domain/quantity/ownership/renewal/price gets separate approval.

- Sending-only managed domains cannot host a site; no DNS/transfer ownership assumption and unsupported changes remain manual.

- Provider-reported setup/warmup/ramp and shared campaign capacity; no fake warmup engagement or deliverability promise.

- Credential revoke/remove/sender-change restrictions, failed orders and asynchronous charge reconciliation fixtures.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP45. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A5, A6: **component**, producer WP45. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A5, A6: **integration**, producer WP45. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP45.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP46: Advanced storefront and provider-native learning capabilities

**Milestone:** M7C. **Dependencies:** WP27, WP28, WP30. **Status:** planned.

**Owner:** distribution/learning maintainer. **Independent acceptance:** instructional/access/security reviewer. **External gates:** E2, E3, E6.

**Capabilities:** `cap.delivery.advanced`, `cap.publishing.storefront`.

**Files:** `apps/server/src/studio/connectors/learning.ts`, `apps/server/src/studio/connectors/learning.contract.test.ts`, `apps/web/src/features/studio/publishing/StorefrontPage.tsx`.

**Consumes:** Selected destination capability matrix, exact content versions and authorized learner/store administration scope.

**Produces:** Capability-checked store catalog/metadata/CTA/redirects; multimedia/reading/quiz/drip/progress/resource policies and learner analytics projections.

**Acceptance and failure behavior:**

- Each lesson/quiz/attachment/drip/progress API has separate fixture; unsupported controls are visibly unavailable.

- Cross-buyer access, preview/download policy, expiry/revoke and course completion tests; provider owns learner identity/progress authority.

- Marketplace application/listing status is distinct from private draft/live checkout; traffic is never guaranteed.

- No platform-owned LMS implied; provider-executed changes require reviewed payload/rights and reconciliation.

- Storefront checkout seller/account/mode/price and provider buyer identity stay distinct from Studio payer/seat state. A billing-plan lapse cannot silently revoke buyer delivery; learning/drip access requires its own provider evidence.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP46. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP46.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP47: Merchant administration, tax fields and partner reconciliation

**Milestone:** M7D. **Dependencies:** WP29, WP30, WP31. **Status:** planned.

**Owner:** commerce maintainer. **Independent acceptance:** independent finance/security reviewer. **External gates:** E2, E3.

**Capabilities:** `cap.commerce.admin`, `cap.commerce.reconcile`.

**Files:** `apps/server/src/studio/connectors/merchant-admin.ts`, `apps/server/src/studio/commerce-reconciliation.ts`, `apps/server/src/studio/commerce-reconciliation.test.ts`, `apps/web/src/features/studio/publishing/MerchantAdmin.tsx`.

**Consumes:** Merchant-authoritative event history, E3 country/entity/tax/refund duties and tested administrative API scopes.

**Produces:** Prepared refund/plan/discount/trial actions; invoice/tax/fee/affiliate/share/payout projections and accounting export.

**Acceptance and failure behavior:**

- One-time/recurring/free/trial/installment/promo/waitlist/questions/legal acceptance fields enabled only where API supports them.

- Full/partial refund, renewal/dispute/chargeback and fee/share reconciliation run once under duplicate/reordered events.

- Direct checkout does not inherit marketplace tax handling; currency/jurisdiction/collection/remittance mode and missing amounts explicit.

- Refund initiation/external money action needs exact approval; partner percentages are not payouts; no native custody, tax advice or automated payout engine.

- ROI scenarios/variant cost-per-positive-reply use declared denominators and assumptions; projections differ from actual sales.

- Merchant admin verifies actor/account/store/environment and original payment/offer plus refundable ceiling immediately before action; project/merchant switches invalidate previews. Provider dashboard handoff is useful before these APIs activate.

- Record legal seller/MoR scope and actual tax collect/remit/self-managed mode per jurisdiction; Stripe Tax, ordinary Checkout and marketplace branding cannot transfer tax duties implicitly.

- Conditional Stripe Connect path requires account-specific onboarding/capabilities, direct/destination/separate-charge decision, fee payer, negative-balance liability, supported cross-border route and signed review. Initial application fees and automatic partner splits stay off.

- Refund/subscription cancellation/credit note/transfer reversal and bank payout are separate state machines; provider transfer is not paid-to-bank. Test partial refund/dispute/reversal races, failed/returned payout, held funds and once-only accounting adjustments.

- Earnings/partner scenarios are estimates with sourced fees/taxes/FX/uncertainty; no cash-out from Studio units, pooled seller funds, native custody or guaranteed settlement. Payout bank/KYC changes happen in the provider-hosted flow.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7, A8, A9, A10: **component**, producer WP47. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP47.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP48: Scoped client portal, proposal, e-sign and invoice handoff

**Milestone:** M8A. **Dependencies:** WP20, WP33, WP34, WP47. **Status:** planned.

**Owner:** client-operations maintainer. **Independent acceptance:** independent access/business reviewer. **External gates:** E2, E3, E6.

**Capabilities:** `cap.clients.portal`, `cap.clients.contracts`, `cap.clients.invoices`.

**Files:** `packages/studio-contracts/src/client-operations.ts`, `apps/cloud/convex/clientPortal.ts`, `apps/server/src/studio/connectors/client-documents.ts`, `apps/server/src/studio/client-operations.test.ts`.

**Consumes:** Cloud tenant/client relationship roles, permitted resource refs and selected signature/invoice providers.

**Produces:** ClientPortalGrant, onboarding checklist, proposal/presentation resources, e-sign/invoice status and downloadable reporting.

**Acceptance and failure behavior:**

- Client cannot access another client/project/private notes; resource/attachment access rechecks parent and membership.

- Signature audit and legal sufficiency belong to selected service/human review; no fake signed state from a checkbox.

- Branded invoice draft/status/reminder/payment-link/subscription/international fields reflect actual provider scopes.

- Send/sign/payment actions require concrete approval; reminders use safe messaging policy; accounting exports preserve currency/tax/source IDs.

- Creator/client invoice issuer, merchant account, legal entity, project/client and test/live environment bind independently of Studio service invoices/BillingOrganization. Switching project cannot retarget an invoice/payment link.

- Invoice draft/sent/overdue/provider-confirmed paid and refund/credit-note status are distinct; an invoice/export is not payment, client acceptance, earnings or a payout. Select a provider approved for the actual professional service; a digital-goods MoR may prohibit that service.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6: **component**, producer WP48. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP48.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP49: Task, workload and booking operations

**Milestone:** M8B. **Dependencies:** WP18, WP33, WP38. **Status:** planned.

**Owner:** client-operations maintainer. **Independent acceptance:** privacy/calendar reliability reviewer. **External gates:** E2.

**Capabilities:** `cap.clients.tasks`, `cap.clients.booking`.

**Files:** `apps/server/src/studio/task-schedules.ts`, `apps/server/src/studio/connectors/calendar.ts`, `apps/server/src/studio/task-schedules.test.ts`, `apps/web/src/features/studio/clients/OperationsPage.tsx`.

**Consumes:** Scoped project/client roles, task ownership, supported calendar connector and timezone/privacy preferences.

**Produces:** List/board/calendar task views, recurring tasks, reminders, workload summaries and approved booking handoff.

**Acceptance and failure behavior:**

- DST/recurrence/duplicate job/revoke fixtures; missed runs reconcile without duplicate reminders.

- Booking availability and event attendee/time/payload reviewed; external create/cancel never follows a model suggestion alone.

- Busy/private details and workload visible only by authorized scope; no cross-client leaks.

- Desktop sleep uses provider scheduling or explicit always-on service; no false continuous operation.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP49. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A5, A6: **component**, producer WP49. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A5, A6: **integration**, producer WP49. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP49.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP50: Connected client/team communications and community

**Milestone:** M8C. **Dependencies:** WP33, WP38, WP48. **Status:** planned.

**Owner:** communications/community maintainer. **Independent acceptance:** independent privacy/security reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.clients.communications`, `cap.clients.community`.

**Files:** `apps/server/src/studio/connectors/communications.ts`, `apps/server/src/studio/connectors/communications.contract.test.ts`, `apps/web/src/features/studio/clients/CommunicationsPage.tsx`, `docs/COMMUNITY-OPERATIONS.md`.

**Consumes:** Scoped provider-native messaging/call/community capability, participant permissions and human moderation/support owner.

**Produces:** Connected chat/resource/annotation/fast-reply/tag views, call/event links and provider-specific audio/video/screenshare capabilities.

**Acceptance and failure behavior:**

- No availability claim from coming-soon marketing; chat/calls/screenshare each need working API/participant acceptance.

- Outbound messages/calls/recording/screenshare have concrete recipient/scope/permission decisions; access/revoke/retention tests.

- Do not claim end-to-end encryption unless actual protocol/provider mode verified; no native real-time media infrastructure implied.

- Community moderation, abuse reporting, support hours and human coaching remain staffed responsibilities; no invented mentors or certificates.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP50. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A5, A6: **component**, producer WP50. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A5, A6: **integration**, producer WP50. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP50.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP51: Versioned integration API, MCP and bounded business automation

**Milestone:** M8D. **Dependencies:** WP09, WP21, WP39, WP40, WP53, WP56. **Status:** planned.

**Owner:** integration/platform maintainer. **Independent acceptance:** independent API/security reviewer. **External gates:** E2.

**Capabilities:** `cap.integrations.api`, `cap.integrations.automation`.

**Files:** `packages/studio-contracts/src/integration-api.ts`, `apps/server/src/studio/integration-api.ts`, `apps/server/src/studio/automation.ts`, `apps/server/src/studio/automation.test.ts`, `docs/INTEGRATION-COMPATIBILITY.md`.

**Consumes:** Typed capability broker, scoped API/device/tenant identity, reviewed connector/extension contracts and durable execution.

**Produces:** Versioned external API/MCP surface, signed-event intake and bounded declarative trigger/action workflows with observable receipts.

**Acceptance and failure behavior:**

- Discover contract/schema/scope before use; API token/MCP client cannot exceed project/grant authority.

- Trigger deduplication, loops/depth/budget caps, event signatures/cursors, timeouts and unknown outcomes tested.

- No-code automation cannot authorize send/publish/spend or bypass inbox/buyer/money state machines.

- Connector claims require real supported APIs and compatibility evidence; legacy CRM migrations use dry-run field mapping and rollback.

- Prefer narrow direct adapters for first essential integrations. Composio is an optional bounded connector substrate only after need/cost/privacy review, never the domain authority or a required local dependency.

- Filter broad default toolkit/tool discovery and execution; derive workspace/user principal on the server and explicitly pin the verified connected account/environment/resources. Broker every execute, meta, proxy, auth-management and optional sandbox route, including direct calls to hidden tools. Disable unneeded sandbox/memory/log retention and qualify any permitted route.

- Discovery cannot auto-connect, publish or expand scopes. Test forged user/workspace/account IDs, stale reconnects, direct meta/proxy bypass, cross-project output and provider-success-without-effect; preserve durable Unknown/reconcile behavior and documented connector exit/revoke paths.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7: **component**, producer WP51. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP51.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP52: Versioned agent definitions and bounded plan compiler

**Milestone:** M0C. **Dependencies:** WP03, WP04, WP05. **Status:** planned.

**Owner:** harness/domain maintainer. **Independent acceptance:** independent contracts reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.harness.definitions`, `cap.harness.compile`.

**Files:** `packages/studio-contracts/src/agent.ts`, `packages/studio-contracts/src/run-plan.ts`, `apps/server/src/studio/harness/agent-registry.ts`, `apps/server/src/studio/harness/plan-compiler.test.ts`.

**Consumes:** Capability registry, immutable original instruction/schema artifacts, exact model descriptors and owner intent.

**Produces:** AgentDefinition/ReplyContract/RunPlan refs; AgentRegistry.resolve and PlanCompiler.compile with frozen versions and digests.

**Acceptance and failure behavior:**

- Definitions declare purpose, inputs, reply schema, tools, memory scope, role/delegation ceilings, checkpoints and evals; names/prompts alone confer no authority.

- Compiler validates acyclic dependencies, limits and compatible execution route before provider dispatch; unknown versions/digests fail closed.

- Role output is separated from trusted actor/usage/validation/approval metadata; preserve upstream branded identity mappings.

- No separate orchestrator/provider engine; ordinary business edits remain independent of execution threads.

- Job-card presentation projects the same versioned definition/run plan and exact model/tool/budget/completion contract; it creates no new persona authority, persistent identity or duplicate workflow engine.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP52. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP52.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP53: Scoped tool catalog and every-route enforcement

**Milestone:** M0C. **Dependencies:** WP52, WP06, WP09. **Status:** planned.

**Owner:** harness/security maintainer. **Independent acceptance:** independent authorization reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.harness.scopedtools`.

**Files:** `apps/server/src/studio/harness/policy.ts`, `apps/server/src/studio/harness/tool-catalog.ts`, `apps/server/src/studio/harness/tool-scope.contract.test.ts`, `apps/server/src/mcp/McpToolAccess.ts`.

**Consumes:** Authenticated invocation context, native MCP tool registry, definition ceiling, project/epoch/grant and provider enforcement capabilities.

**Produces:** ToolEnvelope and HarnessPolicy.authorize; discover/configure/grant/usable states remain separate.

**Acceptance and failure behavior:**

- Hidden/deferred tools are denied at execution when outside scope; exposure/annotations are not authorization.

- MCP/RPC, native shell/file/delegation, remote, plugin and scheduled ingress share policy or are disabled in the constrained lane.

- Test forged project/artifact/actor/grant IDs, revoked epochs and delayed-approval races; children intersect parent ceilings.

- Provider-native routes without observable pre-execution restriction cannot be advertised as research-only, document-only or fully pinned.

- Qualification receipts bind executable digest/driver/CLI/runtime version, model/route, permission configuration, OS/sandbox and tool-schema digest. Recheck observable identity at startup/dispatch; any changed field invalidates affected authority, preserves the saved selection and requires trusted fixture requalification with no silent fallback.

- Distribution/extension trust records have signed expiry, revocation generation and rollback protection. Classify each lane as intentionally offline or dependent on current remote revocation. The proposed 24-hour maximum offline freshness applies only to grants/extensions whose accepted policy requires current remote revocation; missing/expired/rolled-back metadata blocks that scoped execution until authenticated refresh. Do not add a Studio sign-in or central heartbeat to core local execution or already-qualified user-owned CLI/API/local-model adapters; provider requirements and verified compromise responses still apply. Test stale-trust denial for the scoped extension alongside continued offline local-model work, editing and installed export.

- Change CLI binary/native descriptor while model ID stays the same and replay queued work: old constrained-lane qualification cannot apply. Test revoked publisher key/version, stale offline trust and authenticated trust-root recovery without disabling signatures; unobservable enforcement changes cannot support a constrained-lane claim.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP53. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A6, A7: **component**, producer WP53. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A6, A7: **integration**, producer WP53. Qualify currently enabled native routes at M0C; executable extension/key scenarios remain synthetic until the affected WP39/40 lane activates, then repeat on its real distribution boundary.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP53.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP54: Bounded execution graph, native mappings and result delivery

**Milestone:** M0C. **Dependencies:** WP53, WP07. **Status:** planned.

**Owner:** runtime maintainer. **Independent acceptance:** independent orchestration/recovery reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.harness.runs`, `cap.harness.delegate`.

**Files:** `apps/server/src/studio/harness/runtime.ts`, `apps/server/src/studio/harness/execution-bindings.ts`, `apps/server/src/studio/harness/runtime.integration.test.ts`.

**Consumes:** WP04 durable operation bridge and upstream thread/task/provider/session/run/attempt/transfer lifecycle.

**Produces:** RuntimeBinding; transactional node/fanout/depth/concurrency admission, exact descendant model policy, resource fences and stop/recovery.

**Acceptance and failure behavior:**

- Cross-provider/native/remote children carry explicit selection/options, host/account identity, bounded context and shared root budget; unsupported route stops rather than falls back.

- One persistent business operation maps to native commands across MCP credential rotation; reconcile lost launch replies instead of duplicate top-level creation.

- At-least-once completion transport has one durable logical acceptance/application; delivery acknowledgement is not model understanding or business approval.

- Stop revokes new work/wakes first, cancels owned task trees, fences late writes and reconciles unknown effects; shared-process kill has explicit collateral warning.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP54. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP54.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP55: Validated replies, scoped artifact handoffs and accepted outcomes

**Milestone:** M0C. **Dependencies:** WP54. **Status:** planned.

**Owner:** harness/data maintainer. **Independent acceptance:** independent semantic/recovery reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.harness.replies`, `cap.harness.artifacts`, `cap.harness.outcomes`.

**Files:** `packages/studio-contracts/src/reply.ts`, `packages/studio-contracts/src/artifact-ref.ts`, `apps/server/src/studio/harness/reply-validator.ts`, `apps/server/src/studio/harness/outcomes.test.ts`.

**Consumes:** ReplyPayload, frozen ReplyContract and access-checked immutable ArtifactRef/context manifest plus native result.

**Produces:** Schema/ownership/hash/rights/semantic validation receipt; Outcome acceptance and atomic application through WP04.

**Acceptance and failure behavior:**

- Structured output support is discovered; constrained parser paths are independently qualified, bounded and fail visibly.

- Default one repair, maximum two budgeted attempts; repair cannot repeat external side effects or invent source IDs; refusal/partial/abstain remain valid outcomes.

- Opaque artifact refs are not credentials, filesystem paths or grants; peer/cross-project access denied and handoff context minimized.

- Native terminal, descendants-settled, delivery, validation and acceptance are separately visible; stale/cancelled late output cannot change accepted revisions.

- Validate completion against the declared deliverable and trusted artifact/action evidence: a storyboard is not a finished video, an export is not client acceptance, and a draft is not sent. Preserve useful partial work without promoting it to accepted output.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP55. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP55.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP56: Memory, event and wake-policy foundation contracts

**Milestone:** M0C. **Dependencies:** WP55, WP06. **Status:** planned.

**Owner:** harness/privacy maintainer. **Independent acceptance:** independent privacy/security reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.harness.memorypolicy`, `cap.harness.triggerpolicy`.

**Files:** `packages/studio-contracts/src/memory.ts`, `packages/studio-contracts/src/personal-agent.ts`, `apps/server/src/studio/harness/trigger-policy.ts`, `apps/server/src/studio/harness/memory-policy.test.ts`.

**Consumes:** Existing scheduler/events, owner/project authority and retention/ownership epochs.

**Produces:** MemoryRecord, PersonalAgentIdentity, EventEnvelope, WakePolicy and browser/channel binding contracts; synthetic-only early Dot fixtures.

**Acceptance and failure behavior:**

- Separate confirmed personal facts, project facts, untrusted evidence and permission policies; inferred memory cannot become an owner command.

- Timezone/quiet hours/coalescing/expiry/cooldown/causation/loop/day-month budgets and reauthorization at every wake.

- Forget/correction revokes derived summaries/indexes/queued context with tombstones preventing backfill/restore resurrection.

- Define one active Dot owner/host epoch now without enabling Dot accounts/channels/browser autonomy.

- Memory forget/restore follows WP07 current deletion/revocation journal, including summaries, indexes and queued model context. Historical content-only recovery without newer state requires review and cannot restore wakes or permission policy.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP56. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP56.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP57: Agent catalog, run inspector and role-behavior evaluations

**Milestone:** M0C. **Dependencies:** WP52, WP53, WP54, WP55, WP56, WP08. **Status:** planned.

**Owner:** harness/frontend maintainer. **Independent acceptance:** independent UX/security reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.harness.inspect`, `cap.harness.evals`.

**Files:** `apps/web/src/features/studio/agents/AgentCatalog.tsx`, `apps/web/src/features/studio/agents/RunInspector.tsx`, `apps/web/src/features/studio/agents/harness-journey.spec.ts`, `evals/studio/harness-v1/roles.json`.

**Consumes:** Definitions, compatibility matrix, run graph, budgets, typed requests and validated outcomes.

**Produces:** Accessible role/model/tool selector, run controls, receipt view and fixed behavior/authority regression suite.

**Acceptance and failure behavior:**

- Novice sees what/why/waiting/next decision; advanced view shows role/version/host/model/tool scope/graph and accepted artifacts.

- Question, native approval, secret and external action review remain different request types.

- Pause/cancel/recover/revoke and context/contract failures have readable states; keyboard/320px/reduced-motion tests.

- Research/planner/maker/reviewer/council/Dot fixtures score evidence, schema, denial and honest completion; no hidden chain-of-thought collection.

- Show reusable job purpose, inputs/context revisions, example output, exact requested settings/host, effective identity or unverified state, required/granted tools, limits, approval stops and completion/handoff criteria. M0C fixtures certify presentation only; later job actions remain milestone-gated.

- Run results expose estimated/reserved/actual/unknown costs and recurring access separately, with quote/receipt timestamps and currency/period/route. Model-authored cost or completion prose is not a trusted receipt; include failed/retried usage and measured human review time where available.

- Recovery card shows saved artifact versions, uncertain external effects, known/reserved/unknown costs and one safe next action with project/host/provider/operation references. It follows the failed job across navigation without leaking private context; screen-reader focus and notification deep links remain scoped.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5, A6, A7: **component**, producer WP57. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP57.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP58: Bounded independent council protocol

**Milestone:** M3C. **Dependencies:** WP57, WP10, WP14, WP21. **Status:** planned.

**Owner:** council/workflow maintainer. **Independent acceptance:** independent evidence/protocol reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.council.protocol`.

**Files:** `packages/studio-contracts/src/council.ts`, `apps/server/src/studio/harness/council.ts`, `apps/server/src/studio/harness/council.test.ts`.

**Consumes:** Frozen CouncilSpec question/evidence/criteria/roster, exact member selections, shared budget and reply contracts.

**Produces:** Independent positions, reveal/challenge barrier, validated quorum, synthesis reserve, dissent and council outcome.

**Acceptance and failure behavior:**

- Initial members cannot read peer positions/threads/shared files before barrier; side effects disabled during deliberation.

- Default three positions, one challenge round, one synthesis; substantive quorum/reviewer/diversity/deadline declared before dispatch.

- Missing/invalid/abstaining members, false-diversity identities, quota/timeouts and late results produce honest degraded/incomplete state; no silent replacement.

- Council opinions cannot approve their own publication/spend/privilege; majority is not a correctness or professional-certification guarantee.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP58. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP58.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP59: Council workspace, decision clinic and safe draft experiments

**Milestone:** M3C. **Dependencies:** WP58, WP08, WP17. **Status:** planned.

**Owner:** council/product maintainer. **Independent acceptance:** independent UX/evidence reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.council.workspace`, `cap.council.experiments`.

**Files:** `apps/web/src/features/studio/council/CouncilPage.tsx`, `apps/server/src/studio/harness/draft-experiments.ts`, `apps/web/src/features/studio/council/council.spec.ts`.

**Consumes:** CouncilOutcome, immutable artifact/context versions and user-selected question/criteria.

**Produces:** Position/evidence/dissent matrix, decision clinic, model comparison and what-if/shadow-mode draft branches.

**Acceptance and failure behavior:**

- Show actual member model/effort/host, uncertainty, missing reviewers and pooled usage; user can challenge or stop.

- Draft branch/capsule references approved inputs and preserves original artifacts; no replay of sends/payments/publications.

- Shadow mode outputs exact proposed actions and blockers without dispatch; model comparison holds inputs/criteria fixed.

- Council result acceptance creates a normal versioned user decision and fresh downstream action eligibility.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP59. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP59.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP60: One persistent Dot identity, memory and host ownership

**Milestone:** M9A. **Dependencies:** WP56, WP57, WP07, WP17. **Status:** planned.

**Owner:** personal-agent maintainer. **Independent acceptance:** independent privacy/data reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.dot.identity`, `cap.dot.memory`.

**Files:** `apps/server/src/studio/dot/identity.ts`, `apps/server/src/studio/dot/memory.ts`, `apps/server/src/studio/dot/identity.test.ts`, `apps/web/src/features/studio/dot/DotPage.tsx`.

**Consumes:** PersonalAgentIdentity/MemoryRecord contracts, local owner scope, compatible store and host fencing.

**Produces:** Single configured Dot per owner workspace; editable/exportable/forgettable memory and explicit active-host epoch.

**Acceptance and failure behavior:**

- One user-facing identity can use multiple conversations/channels/helpers; no multi-Dot fleet management.

- Local uniqueness is workspace-scoped; unlinked offline installations cannot promise global uniqueness. Cloud linkage enforces owner uniqueness; project copies keep Dot inactive until deliberate binding.

- Confirmed/inferred/source memory, private/project visibility and derived deletion/non-resurrection fixtures.

- Persistent identity does not require a perpetual provider session; pause/forget/revoke leaves inspectable receipts.

- Host moves use the WP34 external-operation custody barrier when cloud transfer is enabled; existing local host moves use the same inventory/fence invariant without requiring cloud. Restored memory follows WP07 and does not reactivate Dot from a copied archive.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A5: **component**, producer WP60. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP60.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP61: Private proactive responsibilities and bounded wakes

**Milestone:** M9A. **Dependencies:** WP60, WP10, WP11. **Status:** planned.

**Owner:** personal-agent/runtime maintainer. **Independent acceptance:** independent proactivity/recovery reviewer. **External gates:** none beyond global policy.

**Capabilities:** `cap.dot.proactive`.

**Files:** `apps/server/src/studio/dot/responsibilities.ts`, `apps/server/src/studio/dot/wakes.ts`, `apps/server/src/studio/dot/wakes.test.ts`, `apps/web/src/features/studio/dot/Responsibilities.tsx`.

**Consumes:** Owner-enabled responsibilities, authenticated synthetic/read-only events, scoped memory/evidence and standing read budgets.

**Produces:** Normalized event -> trust/dedupe -> wake policy -> bounded harness run -> private artifact/digest -> user notification.

**Acceptance and failure behavior:**

- Daily digest, topic-watch/follow-up draft and appointment-prep fixtures with no external action authority.

- Quiet hours/IANA timezone/DST, coalescing/TTL/backlog/loop and one-concurrent-run defaults; hard day/month usage and trusted urgency policy.

- Local host sleep means unavailable; catch-up is dated and stale action proposals expire; hosted mode optional through accepted M5 gates.

- Kill/pause/disable-trigger/cancel-current are distinct; no ghost wakes after Stop and untrusted messages cannot edit responsibilities/grants.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP61. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP61.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP62: AgentMail personal correspondence channel

**Milestone:** M9B. **Dependencies:** WP61, WP25, WP53. **Status:** planned.

**Owner:** personal-mail connector maintainer. **Independent acceptance:** independent privacy/messaging reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.dot.mail`.

**Files:** `apps/server/src/studio/dot/connectors/agentmail.ts`, `apps/server/src/studio/dot/connectors/agentmail.contract.test.ts`, `apps/web/src/features/studio/dot/MailConnection.tsx`, `docs/DOT-COMPATIBILITY.md`.

**Consumes:** Explicit privacy/account/region acceptance, scoped AgentMail inbox/key, exact message/attachment/signature versions and owner grant.

**Produces:** PersonalMailboxPort with verified Svix ingress or supported polling subscription, backfill, local drafts and approved outbound receipts.

**Acceptance and failure behavior:**

- No cold outreach/prospect sequences; connector scope is expected/consenting correspondence and applicable transactional work.

- Provider event_id dedupe plus inbox/message identity; raw signature verification, ordering/gaps and durable acceptance before acknowledgement.

- Hosted drafts/schedules/sends are external writes. Freeze effective recipients/body/signature/attachments; reconcile provider idempotency windows and unknown sends.

- Privacy notice permits content training absent written exception; no sensitive connection before acceptable policy/agreement. Revocation enumerates pending remote drafts/subscriptions; quotas/prices are account-verified.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

- Exercise a webhook storm, stale/revoked account and pending remote send with browser/phone disabled; inbound costs and remote schedules remain bounded and visible. Connection/event routing uses WP09 bindings, not message-supplied project IDs.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4, A7: **component**, producer WP62. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A5, A6: **component**, producer WP62. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A5, A6: **integration**, producer WP62. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP62.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP63: Dedicated Dot browser workspace and human handoff

**Milestone:** M9B. **Dependencies:** WP61, WP53, WP09. **Status:** planned.

**Owner:** browser/personal-agent maintainer. **Independent acceptance:** independent browser/security reviewer. **External gates:** E2, E7.

**Capabilities:** `cap.dot.browser`.

**Files:** `apps/server/src/studio/dot/browser.ts`, `apps/server/src/studio/dot/browser.test.ts`, `apps/web/src/features/studio/dot/BrowserWorkspace.tsx`, `docs/DOT-COMPATIBILITY.md`.

**Consumes:** Reviewed upstream profile/context provision path, explicit Dot profile/account binding and browser control generation.

**Produces:** Owned browser lease, isolated anonymous/authenticated contexts, private login/takeover and checkpoint/reconciliation receipts.

**Acceptance and failure behavior:**

- Never default to personal profile or import cookies/private browser state; profile provisioning/persistence/isolation tested on the pinned build.

- Read-only lane blocks evaluate mutations/uploads/forms; external browser writes have the same broker approval as APIs.

- Human takeover drains/fences automation; stop screenshot/recording during secrets; stale locators invalid after navigation/handoff.

- Lost tab/restart/lease/account changes require fresh snapshot and external-history reconciliation; do not repeat possibly submitted forms or claim always-on local availability.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

- Untrusted research links open anonymously in an isolated context by default. Never automatically follow tokenized authentication/consent/unsubscribe/cancellation/purchase links with credentials; GET/navigation/screenshots are not proof of read-only behavior.

- Qualify authenticated read by supported site/operation with navigation, redirect and subrequest/network policy enforced outside the model. If passive scripts or credentialed navigation cannot be reliably constrained, require a separately authorized browser task or human handoff; do not label it read-only.

- Controlled state-changing navigation, redirect and automatic script-request fixtures cannot mutate the authenticated test account in a read-only task. Emailed action links cannot grant approval; blocked navigation returns actionable failure without alternate-profile retry. Approved writes still bind exact account/destination/effect and reconcile interrupted responses.

**Evidence phase / producer (all not-run):**

- A1, A5, A6, A7, A8, A9: **component**, producer WP63. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A2, A3, A4: **component**, producer WP63. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A1, A6, A7, A8, A9: **integration**, producer WP63. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

- A5: **integration**, producer WP63. Before this connector activates: actual operator/support readiness, bounded authorized provider shutdown/recovery evidence and ongoing-charge inventory; not deferred to WP37/WP66.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP63.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP64: Sandboxed read-only Agent Reach connection

**Milestone:** M9B. **Dependencies:** WP61, WP53, WP40. **Status:** planned.

**Owner:** retrieval connector maintainer. **Independent acceptance:** independent privacy/supply-chain reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.dot.reach`.

**Files:** `apps/server/src/studio/dot/connectors/agent-reach.ts`, `apps/server/src/studio/dot/connectors/agent-reach.contract.test.ts`, `docs/DOT-COMPATIBILITY.md`.

**Consumes:** Pinned reviewed Agent Reach/dependencies, anonymous public read/search channel allowlist and sandbox/no-personal-state policy.

**Produces:** ReachReadPort returning bounded provenance-labeled evidence; no posting/messaging/login authority.

**Acceptance and failure behavior:**

- Installed skill is not proof executable/channels work; test only enabled channels and actual content versus metadata/snippets.

- Technically deny personal Chrome/OpenCLI state access and automatic cookie import; authenticated channels off until isolated supported setup verified.

- Stop on rate limit/CAPTCHA/login/busy restrictions; never rotate backends/accounts to evade them.

- Quarantine fetched content, cap bytes/pages/ASR/runtime, preserve rights/source date/partial coverage and no arbitrary skill self-grants.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP64. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP64.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP65: Verified phone voice/SMS channel for the same Dot

**Milestone:** M9C. **Dependencies:** WP61, WP53, WP06. **Status:** planned.

**Owner:** phone connector maintainer. **Independent acceptance:** independent telecom/privacy/security reviewer. **External gates:** E2, E3, E6.

**Capabilities:** `cap.dot.phone`.

**Files:** `apps/server/src/studio/dot/connectors/phone.ts`, `apps/server/src/studio/dot/connectors/phone.contract.test.ts`, `apps/web/src/features/studio/dot/PhoneConnection.tsx`, `docs/DOT-COMPATIBILITY.md`.

**Consumes:** Owner-selected agentphone.ai API, verified account and number/country capabilities, consent/disclosure/recording policy and bounded charges.

**Produces:** PersonalPhonePort with per-operation voice/SMS readiness, signed event/identity mapping and confirmed/unknown call/message receipts.

**Acceptance and failure behavior:**

- agentphone.ai is the selected provider; bind its canonical API origin, account and per-number voice/SMS capabilities. Account-specific contract/API evidence precedes adapter activation.

- No phone provisioning, retries, transfer/DTMF, recording, fallback SMS or recharge without explicit scoped authorization.

- Use owner-selected model only on qualified webhook execution; hosted vendor model is disclosed and cannot masquerade as exact selected CLI.

- No voice/caller-ID based owner approval, emergency service or unsolicited outreach. Recording off/consent-before-capture, number expiry/reassignment and opt-out tested.

- Realtime bounded voice handler separate from scheduled wake loop; disconnect/late events/end-call/revoke/cost reconciliation; local sleep cannot answer.

- Before first activation, record a ConnectorOperations profile: named operator/backup or explicit provider-owned support route, ingress/backlog/age/rate/cost caps, alert channel, retention, reconciliation and credential-compromise response. Keep a credential-free outage runbook and redacted receipt-ID support path accessible without the app; no automatic private-content diagnostic upload.

- Prove provider-side pause/cancel and inventory remote schedules, sessions and renewals plus their payer and idle costs. Local Stop only denies new dispatch until provider cancellation is confirmed; a disabled sibling channel is never required for recovery.

- Before independent M9C activation, exercise webhook/inbound-cost storm, compromised credential, disconnected host, number renewal/reassignment and actual remote hangup/revoke with mail/browser disabled. Document continuing number rent and owner/provider shutdown/support route; do not defer these controls to WP66.

**Evidence phase / producer (all not-run):**

- A1, A4, A5, A6, A7, A8: **component**, producer WP65. Synthetic contract/policy/denial fixtures only; actual integration, measured or release outcome is supplied by the separate phase below.

- A2, A3: **component**, producer WP65. Package-owned fixture/contract evidence; live activation needs applicable later gates.

- A1, A4, A5, A6, A7, A8: **integration**, producer WP65. Affected implementation/account/build evidence; synthetic component fixtures alone do not activate it.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP65.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

## WP66: Narrow standing action policies and Dot incident operations

**Milestone:** M9D. **Dependencies:** WP62, WP63, WP56. **Status:** planned.

**Owner:** personal-agent operations maintainer. **Independent acceptance:** independent action-policy/security reviewer. **External gates:** E2, E6.

**Capabilities:** `cap.dot.standingpolicies`, `cap.dot.operations`.

**Files:** `apps/server/src/studio/dot/action-policies.ts`, `apps/server/src/studio/dot/incident-controls.ts`, `apps/server/src/studio/dot/action-policies.test.ts`, `docs/DOT-OPERATIONS.md`.

**Consumes:** Previously accepted channels, owner-authenticated standing policy schema, provider-held work inventory and tested recovery.

**Produces:** Optional recurring correspondence/browser policies with explicit recipients/action/data/cost/time/expiry plus global kill/recovery controls.

**Acceptance and failure behavior:**

- Initially only concrete owner-reviewed actions; unattended writes activate only a separately accepted narrow policy, never a broad do-anything grant.

- Mail/browser policies recheck source trust, suppressions, latest replies, account/grant epochs and state; phone remains per-call reviewed in this package.

- Pause/kill enumerates remote scheduled drafts, active sessions and provider renewals; app shutdown is not universal remote cancellation.

- Webhook storm/inbound-cost/credential compromise/data-disclosure exercises, redacted receipts and trusted owner notifications; no automatic recharge or channel resale.

**Evidence phase / producer (all not-run):**

- A1, A2, A3, A4: **component**, producer WP66. Package-owned fixture/contract evidence; live activation needs applicable later gates.

**Execution steps:**

- [ ] Add meaningful failing fixtures for the acceptance cases in the named test surface; run and record the expected failure.

- [ ] Implement the interfaces and smallest coherent UI/service changes using the declared dependencies.

- [ ] Run targeted tests plus affected upstream type/lint/security/build checks; independently inspect rendered or external receipts where relevant.

- [ ] Save exact revision, commands, exit codes, fixture/live scope and evidence under `docs/acceptance/WP66.md`; resolve reviewer findings and commit.

- [ ] Activate capability only in a build carrying all applicable component, integration and public-release evidence; update register status and release notes honestly.

