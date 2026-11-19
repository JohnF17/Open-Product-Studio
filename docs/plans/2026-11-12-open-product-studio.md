# Open Product Studio: Electron Fork Implementation Plan

> Historical revision 2. The [canonical roadmap and dependency-ordered work packages](../ROADMAP.md) supersede this task sequence after independent review. Keep this file as design history; implement the current work-package contracts. In particular, budgets/restore precede recommendations, contacts precede creator operations, and distribution/cloud work is split into separate gates.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt T3 Code into a downloadable, integrated AI business/product dashboard with exact provider controls and research-driven recommendations at every step.

**Architecture:** A pinned downstream T3 Code fork retains Electron, existing UI/chrome, authenticated client runtime, provider packages, Node/Effect execution, durable orchestration and SQLite. Add business contracts/services and replace the default chat surface with a dashboard. All modules register together, while release capabilities and project prerequisites control honest staged activation.

**Tech stack:** Upstream pinned Electron/React/Vite/TanStack/Tailwind/Effect platform and UI primitives; additive RHF/Zod forms where appropriate; optional Convex/Better Auth cloud business accounts after local functionality. Preserve tested dependency pins rather than starting with a wholesale upgrade.

**Spec:** [Product](../PRODUCT.md), [architecture](../ARCHITECTURE.md), [module milestones](../MILESTONES.md), [recommendations](../RECOMMENDATIONS.md), [security](../SECURITY-MODEL.md), [upstream ownership](../UPSTREAM.md), [CI](../CI.md).

**Status:** Revision 2 supersedes the sixteen-task greenfield/browser-first plan. Planning and evidence exist; app code is not imported or implemented. All tasks below remain open. Paths marked "new" are proposed additions; preserved paths are verified upstream surfaces.

## Global constraints

- Downloadable Electron is a first-milestone deliverable, not a later optional wrapper.
- Preserve familiar T3 UI/chrome and exact provider/model/options; dashboard replaces the default main surface, not the execution platform.
- Every module is in the initial registry, with actual release milestones and project progress. Planned actions cannot dispatch.
- AI research/recommendations accompany every active decision type; beginner users should not need to invent prompts.
- Local workflows require no platform account/wallet; provider accounts and terms remain separate.
- No silent model fallback, unbounded research, fabricated citations, false availability, or implied earnings guarantee.
- Use original paid-product replacement workflows/prompts; retain MIT/third-party notices for reused T3 code.
- Keep private workbook/caption/video/screenshot research outside the public repository.
- Native permission modes, business automation grants, filesystem containment and network policy are distinct controls.
- Public publication, sending, purchases, destruction and privilege expansion require concrete authorization.

## Review focus

1. Inherited desktop identity/feed/cloud settings touch T3 services or user state: isolate before launch (Tasks 1-2).
2. A planned module, expired entitlement or direct RPC bypass confuses availability: server-enforced eligibility (Task 4).
3. A recommendation is stale, contradictory, unsupported or silently rerouted: preserve uncertainty and stop dependent work (Tasks 5-7).
4. Laptop crash/reconnect or duplicate execution repeats a publication/charge: durable intent and reconciliation (Tasks 8, 15, 18).
5. Documents, generated previews or paired devices expand authority: typed tools, isolated previews and scoped grants (Tasks 9, 19).

## Interfaces and file ownership

Preserve upstream `packages/contracts/`, `packages/client-runtime/`, `packages/provider-core/`, provider packages, `apps/server/src/orchestration-v2/`, persistence and WebSocket RPC. Extend these through documented seams. New `packages/studio-contracts/src/` owns business schemas, `packages/studio-domain/src/` owns business decisions/invariants, `apps/server/src/studio/` owns orchestration/repositories/tools, `apps/web/src/features/studio/` owns dashboard screens, and `modules/` owns declarative original workflows.

Business IDs reference native thread/run/session IDs without replacing their meanings. Domain services consume injected repository/tool ports, never renderer/process/Convex SDKs. A BusinessProject need not be a Git repository. Register modules once and evaluate capability release, project inputs, entitlement, connection, permission and budget separately.

## Commands and evidence

Verified upstream script names at the pinned revision include `pnpm dev:desktop`, `pnpm typecheck`, `pnpm lint`, `pnpm fmt:check`, `pnpm test`, `pnpm build:desktop`, `pnpm dist:desktop:win:x64`, `pnpm licenses:sync` and `pnpm release:smoke`. Their presence is not proof they pass on this machine. Inspect install/build hooks before execution and establish safe local configuration first.

Add `pnpm studio:test` for targeted `vp test run` business suites and `pnpm studio:e2e` for dedicated Playwright/dashboard suites. Each task names test files and assertions; run those tests failing before implementation, then passing. Preserve upstream relevant suites, broaden testing when changed boundaries require it, and report real results. No paid/live-provider calls from untrusted PR CI.

## M0 - Desktop foundation and entire module map

### Task 1: Import and prove the pinned fork baseline

**Files:** upstream history/remote and root manifests/lockfile; `docs/UPSTREAM.md`; scoped license files; `docs/BASELINE.md` (new).

**Consumes:** source SHA `7d71f852a8edd298ffde67c295760c286a71a27c` and current planning repo. **Produces:** preserved source baseline, provenance/license map and reproducible local baseline evidence.

- [ ] Preserve this planning tree, import upstream with history/provenance into the project deliberately, and retain untouched upstream tracking refs. Do not overwrite the documentation or replace upstream license text with ours.
- [ ] Inspect bootstrap/build hooks and required environment variables. Use declared Node/package-manager versions and the frozen lockfile. Record native/toolchain requirements and any staged unlocked resolution.
- [ ] Run relevant baseline checks and `pnpm build:desktop`; investigate actual failures before editing. Record which are upstream/environment failures rather than business changes.
- [ ] Verify the declared CLI/provider fixture tests without real accounts. Commit a traceable baseline; no public fork, remote push or release is required for this step.

### Task 2: Independent Electron identity and local packaging

**Files:** `apps/desktop/src/{boot,main,preload}.ts`, Electron config/services, `scripts/build-desktop-artifact.ts`, release configuration, icons and product identity tests.

**Consumes:** working baseline. **Produces:** separately named local desktop build with its own data/credential/update namespaces.

- [ ] Add failing configuration tests asserting distinct app ID, protocol, app-data/keychain/feed/telemetry and no required upstream Clerk/relay login in local mode.
- [ ] Set product identity, safe defaults and disabled/unconfigured update destinations; retain sandbox/context isolation and validate IPC sender/navigation. Do not read or migrate private T3 data.
- [ ] Run configuration/security checks, then `pnpm dist:desktop:win:x64` using local development packaging configuration. Install/run with synthetic data, verify independent directories and clean shutdown/restart.
- [ ] Record signing status honestly. Unsigned development artifacts are not a signed public release. Preserve third-party notices and commit.

### Task 3: Dashboard in the existing T3 shell

**Files:** `apps/web/src/routes/_chat.tsx`, relevant dashboard route (new), `components/Sidebar.tsx`, `features/studio/{BusinessDashboard,ProjectOverview,ActivityInspector}.tsx` (new), route/e2e tests.

**Consumes:** upstream client runtime, sidebar primitives, settings/overlay behavior. **Produces:** dashboard-first project navigation with preserved thread/detail view.

- [ ] Tests: dashboard loads by default; all module routes are visible; optional conversation opens; settings overlays/background runs survive navigation; keyboard focus and narrow window behavior remain correct.
- [ ] Observe failures, then implement additive route composition at the actual ThreadRouteView mounting seam. Keep the familiar picker/sidebar/theme and resizable panels.
- [ ] Add labeled fixture project, next decision, recommendations, artifacts, stage status and budget/activity panels. No fake live research or generated result.
- [ ] Run targeted route and Playwright tests plus relevant upstream navigation tests. Review desktop and mobile layouts; commit.

### Task 4: Business graph, module registry and milestone eligibility

**Files:** new `studio-contracts/src/{project,module,eligibility}.ts`, `studio-domain/src/{projects,eligibility}.ts`, `apps/server/src/studio/{repositories,module-service}.ts`, namespaced SQLite migration and tests.

**Consumes:** upstream persistence/events/RPC. **Produces:** `evaluateEligibility(moduleId,projectId,capabilityId)`, revision-checked module transitions and the full shared module catalog.

- [ ] Failing tests: development complete is not installed availability; planned action RPC cannot dispatch; missing input vs missing entitlement has different reason; expiry preserves artifacts; changed input reopens a new revision.
- [ ] Implement all modules listed in MILESTONES.md, shared IDs/entities and separate release/progress/entitlement state. Write transition/event changes transactionally with actor/reason/revision/idempotency key.
- [ ] Connect dashboard status to real server eligibility. Planned screens explain named milestones and current usable alternatives without a paywall fiction.
- [ ] Run migration/reopen/conflict/eligibility tests and upstream persistence checks. Commit M0 only after packaged desktop and truthful full-module navigation work.

## M1 - Research and recommendations everywhere

### Task 5: Exact selection and safe automation policy

**Files:** preserve upstream model picker/contracts/provider adapters; new `studio-contracts/src/automation.ts`, `apps/server/src/studio/automation-policy.ts`; model/reroute/permission tests.

**Consumes:** actual `ModelSelection` `{instanceId,model,options?}` and provider descriptors. **Produces:** explicit per-job/per-worker settings and bounded business grants.

- [ ] Tests retain requested IDs after unavailable model, reject unsupported effort, record reported effective model and block follow-on work on reroute. Test Sol xhigh/Astra high only through fixtures advertising those options.
- [ ] Keep search/favorites/custom/legacy/update-required choices and native runtime modes. Default novice startup to Supervised without removing advanced controls.
- [ ] Implement separate Guided/Recommend-and-do-safe-work policies with scopes, expiry, revision bindings and budget. Test tutorial/model text cannot grant new authority.
- [ ] Run provider fixtures/policy tests and relevant upstream selector tests. A small live compatibility probe is opt-in, account-specific and possibly billable; absence of it remains documented.

### Task 6: Web evidence acquisition and provenance

**Files:** new `studio-contracts/src/{source,claim}.ts`, `apps/server/src/studio/research/{search,fetch,extract,provenance}.ts`, evidence UI and security fixtures.

**Consumes:** supported provider research tools or separately configured search connection. **Produces:** canonical source records, inspected excerpts/locators and supported/contradicted/unresolved claims.

- [ ] Tests: no-web model cannot claim live search; search snippet is not fetched body; duplicate mirrors share origin; private/metadata IPs and redirect escapes are rejected; malformed/huge documents bounded; malicious source cannot invoke tools.
- [ ] Implement authorized query/fetch/extract, hashes/dates/access/rights states and source inspection UI. Distinguish unavailable source, metadata-only and full body.
- [ ] Store evidence separately from generated text; enforce fetch/page/time/byte limits. Do not bundle provider/session credentials or copyrighted research extracts.
- [ ] Run deterministic importer/research/security tests and one authorized synthetic/public-source smoke test. Commit.

### Task 7: Recommendation service and novice decision loop

**Files:** new `studio-contracts/src/recommendation.ts`, `studio-domain/src/decisions.ts`, `apps/server/src/studio/recommendations/`, `features/studio/decisions/`, module decision manifests and tests.

**Consumes:** evidence, project graph, exact model/automation policy. **Produces:** `recommend`, `acceptDecision`, `executeSafePlan` boundaries from RECOMMENDATIONS.md with versioned alternatives/action proposals.

- [ ] Tests: no evidence/contradiction/stale input/unsupported claims yield qualified output; changed inputs invalidate recommendations; budget reserve precedes child dispatch; exact-model mismatch stops work.
- [ ] Implement query planning, synthesis, evidence support review, explained options, acceptance/override and checkpointed safe execution. First entry paths: no idea, existing idea, own material, creator with permission.
- [ ] Bind every module decision type to the same contract from the start, even where execution is still milestone-gated. Show why/cost/reversibility without requiring prompt writing.
- [ ] Run evidence/decision fixtures and novice e2e loop. Evaluate actual source support and usefulness, not one preferred prose string. Commit M1 only with auditable recommendations.

### Task 8: Cross-module durable operations and budgets

**Files:** new `apps/server/src/studio/{run-service,budgets,recovery}.ts` integrated with existing orchestration/outbox; shared business-run contracts and crash tests.

**Consumes:** upstream command/run lifecycle and business plans. **Produces:** bounded plan dispatch, event replay, checkpoint recovery and uncertain-outcome reconciliation.

- [ ] Tests kill/restart after dispatch/before artifact commit; cancellation/completion race; repeated client command; parent stop/child cancellation; exhausted page/token/media budget; no duplicated side effect.
- [ ] Reuse upstream receipts/leases/events/native session IDs. Add domain checkpoints and reserved child budgets; do not create parallel daemon/session orchestration.
- [ ] Set initial research defaults from RECOMMENDATIONS.md and enforce hard ceilings, bounded transient retries and scope. Reconnect never means re-generate everything.
- [ ] Run injected-crash fixtures and affected upstream orchestration tests. Commit before enabling unattended private drafting.

## M2 - Product production and portable artifacts

### Task 9: Typed artifacts, safe previews and versions

**Files:** new `studio-contracts/src/artifact.ts`, `studio-domain/src/artifacts.ts`, `apps/server/src/studio/artifacts/`, artifact UI and preview/path security tests.

**Consumes:** business graph and durable operations. **Produces:** revision-checked document/asset operations, version hashes, safe rendering and restore.

- [ ] Tests reject path/junction/ZIP escapes, stale writes, active HTML/SVG, dangerous links and remote/local resource reads in PDF rendering; preserve drafts after write failure.
- [ ] Implement typed file/document operations instead of model-selected shell commands. Use established preview isolation and add business output containment.
- [ ] Distinguish document generation from generated-code execution. Disable executable formats until their sandbox lane exists; a worktree alone is insufficient.
- [ ] Run security/recovery tests and inspect actual previews with synthetic malicious samples. Commit.

### Task 10: Complete product-builder workflows

**Files:** bundled `modules/product/{manifest,decisions,workflows,prompts}/`, guide/workbook/template/learning-plan output schemas, `features/studio/product/` and evaluation fixtures.

**Consumes:** brief/evidence/strategy/brand decisions, typed artifacts. **Produces:** transformation map, charter, format/outline decisions, generated editable sections, exercises and review queue.

- [ ] Tests preserve manual edits after regeneration, bound section jobs, recover partial work, validate structured outputs and keep unsupported claims visibly unresolved.
- [ ] Implement AI recommendations for format, scope, outcome map, outline, examples and QA; accept suggested defaults or edit. Use original prompts/material, not copied private frameworks.
- [ ] Implement editable outcome-map and charter views, locale selection, and outline/manuscript/branding/readiness stages. Tests exercise section queued/writing/review/complete states, pause/resume, saved manual edits and explicit cover/style selection. Do not infer backend speed or verified demand from a recorded demo.
- [ ] Deliver one complete guide/workbook path and registered schemas/acceptance for the other included formats. Capability-level milestones must say exactly which operations work.
- [ ] Run output fixtures and domain review of representative products. Page count is a recommendation, not a fixed 45-page requirement. Commit.

### Task 11: Library, brand context, export and backup

**Files:** `apps/server/src/studio/exports/`, brand/library contracts/repositories, `features/studio/library/`, export/restore/e2e tests.

**Consumes:** reviewed artifact versions, rights and provenance. **Produces:** Markdown/HTML/PDF/DOCX/JSON/ZIP with manifest/hashes/source appendix and reusable versioned project context.

- [ ] Tests validate Unicode/fonts/page breaks, missing rights notes, secret exclusion, broken references, backup/restore asset consistency and stale brand/offer dependencies.
- [ ] Add DOCX structural/readback tests for headings, lists, tables, source links and editability; render a representative document in a compatible reader. The store-page artifact remains a draft until the separate publishing action has a destination, approval and receipt.
- [ ] Implement persistent reusable brand/audience/product context, export selection and safe format rendering. Media briefs/asset registry exist here before paid media generation activates.
- [ ] Reopen representative exports and inspect page images, links and content; successful download alone is not acceptance.
- [ ] Run library/export/security/restore tests. Commit M2 only with a usable packaged evidence-to-product-to-export workflow.

## M3 - Creator, contact and campaign operations together

### Task 12: Creator discovery and partnership planning

**Files:** `modules/partnerships/`, creator/profile/relationship contracts, permitted import adapters, creator UI and provenance tests.

**Consumes:** project audience/offer and evidence service. **Produces:** evidence-backed partner shortlist, fit hypotheses, proposal and responsibility tasks linked to contacts.

- [ ] Tests: unsupported/private platform access is labeled; permission missing; stale creator evidence; duplicate identity; no invented contact or engagement numbers.
- [ ] Start with permitted user material and supported public/API imports. Recommend fit and personalized proposals with uncertainty, costs and data sources visible.
- [ ] Preserve exact shared contact identity and evidence versions. Agreements are user records/drafts, not automatically asserted legal advice or signed commitments.
- [ ] Add an original partner-audit brief and optional walkthrough/storyboard artifact: explain audience fit, proposed product, assumptions and next steps. Revenue scenarios must expose assumptions and cannot be presented as recorded sales or guaranteed results.
- [ ] Run fixtures and authorized read-only integration checks; no outreach sends yet. Commit.

### Task 13: Contact pipeline and correspondence policy

**Files:** contact/organization/campaign relationships, contact repository/UI, suppression policy, import/export and tests.

**Consumes:** shared people/organizations and partnership output. **Produces:** deduplicated pipeline, activities, tasks, ownership, consent/suppression and correspondence references.

- [ ] Tests cover CSV/form import boundaries, duplicate addresses/handles, deleted/revoked contact data, suppression precedence, cross-project scope and large paginated lists.
- [ ] Implement practical CRM stages/tasks/notes and source provenance. Contact discovery is not consent to send. Keep imported material's rights/retention state.
- [ ] Implement configurable pipeline boards and structured cards with status, assignee, due date, tags, optional estimated value and attachments, using the same shared contact/project IDs. Add saved prospect filters and bounded exports with duplicate handling and per-company limits when supported by the connector. Tests cover unauthorized client-linked boards, import field mappings, CSV formula injection and mismatched export permissions. A search interface does not imply a bundled proprietary lead database.
- [ ] Run contract/UI/access tests and verify export/deletion behavior. Commit.

### Task 14: Original agent library, campaign and funnel builder

**Files:** `modules/launch/`, `features/studio/{agents,campaigns}/`, brand-context bindings, original prompt/evaluation fixtures.

**Consumes:** approved product/offer/audience, contacts and evidence. **Produces:** campaign strategy, sales/landing pages, emails, social/story calendar, hooks/titles/CTAs, objections/FAQ and ad/video briefs.

- [ ] Tests ensure every workflow declares inputs/tools/outputs, source context is revisioned, generated testimonials/scarcity/income claims are not silently invented and recommendation choices stay editable.
- [ ] Build beginner "recommend the launch plan" and advanced searchable categories/favorites/flows. Functional coverage matters more than matching another app's agent count.
- [ ] Link all assets to offer/campaign versions and dependencies. Manual feedback capture creates the initial improvement queue in the same project graph.
- [ ] Add campaign identity, recipient import/selection, editable variants, ordered follow-ups/delays and a review summary. Draft planning links sender readiness, windows/timezone and limits without sending. Missing sender/domain connections are explicit prerequisites, not hidden paywalls.
- [ ] Run campaign fixtures and full M3 e2e through partnership/contact/launch drafts. Assert no network send/publish occurs. Commit.

## M4 - Distribution, media and feedback loop

### Task 15: Publishing, delivery and approved campaign execution

**Files:** publication/connector/receipt contracts, one supported destination adapter, approval/dispatch/reconciliation services and sandbox tests.

**Consumes:** exact reviewed artifact versions, contact suppression, destination grants. **Produces:** dry-run preview, concrete payload authorization, receipt/delivery state.

- [ ] Tests: changed payload/destination invalidates approval, duplicate dispatch is idempotent, unknown remote result requires reconciliation, revoked credentials and suppression prevent sends.
- [ ] Implement one verified integration at a time using official supported interfaces; preserve provider-specific commercial terms and country/account eligibility.
- [ ] Email execution additionally requires relevant consent/law/abuse controls, unsubscribe/suppression and bounded sending policy. Never imply a provider automatically supplies customers.
- [ ] Validate authorized sender identity, recipient snapshot, sequence versions, timezone/DST behavior, daily limits and follow-up cancellation on reply/unsubscribe. The final review identifies exactly when publishing starts delivery. Domain availability checks cannot purchase domains or create paid mailboxes; those require their own concrete authorization and provider receipt.
- [ ] Run sandbox/test-account checks and independent side-effect review. Commit only the integrations actually verified.

### Task 16: Media generation and quality controls

**Files:** media capability contracts, image/video provider adapters, briefs/variants/review UI and media billing/rights fixtures.

**Consumes:** brand/product context, user-owned/licensed references, suitable provider capabilities and budgets. **Produces:** inspectable asset variants, metadata/rights and selected artifact versions.

- [ ] Tests reject unsupported image/video request on text-only CLI, unbounded polling/retries, missing rights, paid fallback and external active metadata.
- [ ] Implement deliberate provider connection and cost/limit display. Recommendations choose briefs/options; the local text CLI is not falsely advertised as a video model.
- [ ] Verify actual dimensions/format, readability and branding with user review; connect selected variants to publication previews.
- [ ] Run adapter fixtures and bounded authorized generation tests when an account is available. Unavailable credentials remain a visible capability blocker. Commit.

### Task 17: Feedback, experiments and product revisions

**Files:** feedback/experiment contracts, authorized channel imports, analysis/recommendation workflows and affected-version tests.

**Consumes:** manual/authorized outcomes, campaigns/publications and project evidence. **Produces:** findings, experiment suggestions, revision tasks and evidence freshness actions.

- [ ] Tests distinguish no results from zero sales, gross/net/refund measurements, missing sample size, duplicate imports and stale experiments. Do not invent causal claims.
- [ ] Implement recommendation of revisions with evidence, uncertainty and exact affected versions; never silently rewrite already-published products.
- [ ] Demonstrate the loop from product through launch/delivery to feedback and a reviewed revision. Independent review verifies external actions and recovery. Commit M4 after the complete integrated local system passes.

## M5 - Optional cloud and remote execution expansion

### Task 18: Business cloud accounts, workers and wallet

**Files:** optional `convex/` business auth/tenancy/jobs/billing, isolated worker app, price/reservation/ledger contracts and adversarial fixtures.

**Consumes:** local export/transfer schema, complete module contracts, commercial provider/merchant eligibility. **Produces:** optional Better Auth/Convex workspaces, explicit transfers and funded cloud execution.

- [ ] Read current Convex/Better Auth integration rules. Tests reject session/user impersonation, cross-tenant target and parent IDs, revoked memberships and private-file association escapes.
- [ ] Tests cover two simultaneous spends, duplicate/reordered payment webhooks, cancel/settle race, refunds/chargebacks, unknown usage and worker recovery. Currency is integer; reserve before dispatch and settle once.
- [ ] Implement separate isolated API workers; never pool/resell personal desktop subscriptions. Optional $19.95 top-up is tested only after measured provider/infrastructure/support costs and checkout terms.
- [ ] Run authz/billing/property/restore suites and independent review. Local use and existing exports remain independent of cloud login/entitlement.

### Task 19: Scoped paired-device operation

**Files:** device/grant contracts, environment authorization extensions, remote UI and replay/revocation tests.

**Consumes:** upstream connection/pairing boundaries and business capabilities. **Produces:** authenticated project-scoped observation, workflow requests and concrete approvals from paired clients.

- [ ] Review protocol and relay trust before code. Tests include used/expired challenges, replay, wrong project, revoked grants/live sockets, changed actions and lost-device recovery.
- [ ] Preserve validated transports but narrow novice grants: no arbitrary shell/filesystem API, provider-token export or self-elevation. Cloud reachability is not local authorization.
- [ ] Test two devices, sleeping/offline host, reconnect and cross-version contracts. State relay confidentiality accurately; no unverified end-to-end-encryption claim.
- [ ] Run independent protocol/security review before exposing remote access.

## Every milestone: release quality, tutorials and sustainable maintenance

### Task 20: CI, guided experience, distribution and maintenance gates

**Files:** additive upstream quality/release workflows, studio e2e/evals/security suites, tutorials, release/operations/privacy docs and verified funding configuration when supplied.

**Consumes:** each milestone's actual capability set. **Produces:** truthful release manifest, guided desktop experience, measured quality and maintainable downstream updates.

- [ ] With each task, add meaningful boundary tests and original guided examples. Tours are skippable/resumable, accessible, and cannot approve external actions. Test keyboard, 320 px, zoom, reduced motion and relevant screen readers.
- [ ] Preserve upstream build/provider/reconnect/approval tests. Add architecture checks, secret/dependency/license/static analysis, business evals and safe advisory AI review from CI.md; no model key or release secret in untrusted PR execution.
- [ ] Measure packaged startup/idle memory and browser performance on declared hardware; set regression budgets from baseline. Run staged pilot users and fix blocking confusion.
- [ ] Test signing/update provenance, interrupted update, active-run deferral, migrations, backup/restore and rollback. Public release waits on owner-provided verified publisher/signing infrastructure, security contact and intended release authorization.
- [ ] Maintain exact upstream/downstream revisions and reviewed patch batches. Activate only tested capabilities, retain planned catalog explanations and report limitations. Add verified donation URLs only after the owner supplies them; no invented accounts.

## Agent execution and review

Use Sol xhigh for scoped implementation/research and Astra high for difficult architecture/security critique when exactly available. Record requested/executed models and never silently substitute. Parent owns integration; use clear file ownership and separate checkouts for independent writers through supported orchestration. Do not parallelize shared database/contracts/route ownership before interfaces settle. A fresh review examines a concrete revision/diff and evidence; author summaries alone are insufficient.

Use the plan to implement milestone by milestone without dropping registered modules from the agreed product. A milestone is complete only when its working capabilities, packaged build and required tests pass. Security-sensitive gates require independent review. No recommendation to recreate private prompts or redistribute demonstration media is part of implementation.

## Plan self-review

- [x] Electron, retained T3 interface and no duplicate execution platform are assigned to M0.
- [x] Entire module graph and separate release/project/entitlement states are assigned to Task 4.
- [x] Every decision type shares evidence/recommendations and budget/permission contracts.
- [x] Creator/CRM/campaign/media/publish/feedback are explicit integrated tasks, not unplanned add-ons.
- [x] Five review-focus cases map to tests and clear owners.
- [x] Provider schemas now match actual T3 contracts; original simplified adapters are superseded.
- [x] Signing, cloud contracts, source permissions and real media/provider access remain explicit prerequisites.
- [x] Evidence/research is distinguished from application implementation, benchmarks and releases.

## Historical decision note, 13 November 2026

This twenty-task plan remains historical and is not the execution sequence. Its Better Auth proposal is superseded for current implementation by [SERVICES.md](../SERVICES.md): prefer Clerk through the official Convex integration, with one hosted identity authority and Convex hosted state/storage/coordination. WorkOS is an alternative only by explicit decision. Historical wording above is retained as dated context; follow ROADMAP and the current canonical work-package register.
