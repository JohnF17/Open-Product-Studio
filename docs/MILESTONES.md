# Complete module catalog and milestone rules

This is one integrated product, implemented through explicit releases. All modules have routes, explanations, dependencies and milestone metadata in the first desktop dashboard. Planned screens are not fake working tools, paid upsells or arbitrary customer gates.

## Three independent kinds of progress

**Software availability:** `planned | available | disabled`. Track development separately as `not-started | in-progress | blocked | complete`. Development completion does not activate a feature in an installed version. `availableSince`, supported platform and feature version establish whether this installation has the capability.

**Project progress:** `planned | available | in-progress | blocked | completed`. A shipped module becomes project-available when its inputs exist. Starting records an input revision. Blocking records a typed reason and prior state. Resolving restores that state. Completion requires acceptance checks and relevant approvals. Changed inputs reopen a new revision; preserve the historical result.

**Optional service entitlement:** `not-required | granted | missing | expired`. Entitlement cannot unlock unimplemented code. Expiry cannot erase completed products, hide local source files or disable local export of already-created artifacts. The [payment design](PAYMENTS.md) separates payer-organization subscriptions/paid-through seats, prepaid service units, creator merchant authority and buyer access. A seat does not confer membership or role; buying it cannot activate WP42 collaboration early. Project switching cannot retarget a financial action. Test mode never grants live access.

Provider health, permission, operational disablement, budget and unmet project prerequisites are explicit eligibility reasons. Do not display all of these as “upgrade required.” Example: Publishing may be shipped but blocked by missing destination credentials; Product may be completed on revision 3 but need review after the audience changes.

## Milestones and acceptance gates

The [canonical roadmap](ROADMAP.md) owns gate details and the [work-package register](roadmap/work-packages.json) owns exact capability IDs. These submilestones replace the earlier broad M0/M4/M5 groups.

| Milestone | Capabilities activated | Acceptance required |
| --- | --- | --- |
| M0A | Separate Electron fork and local package | Baseline, namespaces, packaged launch and notices |
| M0B | Dashboard/all routes, strict selection, durable commands, grants/budgets, restore and guidance | Atomicity/crash/direct-RPC/model-policy/restore and accessible-shell fixtures |
| M0C | Versioned harness roles/plans/tools/replies/artifacts, delegation, memory/wake contracts and inspector | Native-tool denial, bounded graphs, duplicate results, role evals and stop/recovery |
| M1 | Brief, evidence, strategy and recommendations; separately gated API/free/local adapters | Short diagnostic, route plus backup, optional 30-day recommendation plan/manual check-ins, cited support, contradiction/abstention, bounded operation and adapter compatibility |
| M2 | Five complete document families, editing/QA, brand/library and exports | Complete examples per family; M3-disabled reviewed sample/export; manual-edit preservation, semantic accessibility in external readers and outside-app edit/read-back/restore |
| M3 | Contacts before creator/partnership workflows, split scenarios, reusable job cards, bounded service jobs and launch/proof-bundle drafts | Rights/provenance, deduplication, zero/unknown scenario cases, revision/handoff distinctions, exact sample/recipient/unsent message and zero sends |
| M3C | Councils, decision clinic and safe draft experiments | Independent initial barrier, reviewer/quorum, dissent/model identity and pooled budgets |
| M4A | Image/video generation | Independent provider/cost/rights/reconciliation gates |
| M4B | Inbox/sender lifecycle then approved sends | Fresh reply/suppression checks, safe schedules and unknown-outcome recovery |
| M4C | Selected destination, listing, merchant projection and buyer fulfillment | Separate publication, order/refund, download/course/membership access fixtures |
| M4D | Manual feedback or independently accepted metrics adapters, experiments and proposed revisions | Missing-data semantics, M4B-disabled revision loop and input-specific adapter evidence |
| M5A | Optional Clerk/Convex workspace and fenced project transfer/exit | Tenant isolation, compatible manifests, operation custody, authenticated retained-content handback and no dual writer on lapse |
| M5B | Optional Studio subscriptions/seats, prepaid service units, API workers and operations | Payer-bound checkout/portal/paid-through lifecycle; concurrent refund/spend; semantic payment dedupe/disputes; worker isolation, fenced restore and measured economics |
| M5C | Responsive paired-device control | Scope, replay, revoke, offline/host-state tests |
| M6A | Reviewed declarative extensions and isolated executable plugins | Supply-chain, confinement and revocation gates |
| M6B | Small interactive products | Safe build/export and independent domain/accessibility review |
| M6C | Collaborative editable content | Merge/convergence and authorization; serialized financial/action authority |
| M7A | Licensed lead search/enrichment | Account/field/credit verification and privacy-safe jobs |
| M7B | Advanced inbox/sender administration | Reply/attachment/category/OOO controls and approved provisioning |
| M7C | Advanced provider learning/storefront | Course/resource/progress and storefront capability tests |
| M7D | Merchant administration/reconciliation | Refund/plan/tax/share/accounting semantics and exact approvals |
| M8A | Client portal/e-sign/invoice handoff | Cross-client access and real provider evidence |
| M8B | Tasks/workload/booking | Role/privacy, recurrence/DST and provider scheduling |
| M8C | Connected communications/community | Participant/privacy tests and human operations |
| M8D | API/MCP/business automation | Scoped contracts, signed events and bounded triggers |
| M9A | One persistent private proactive Dot | Identity/host fencing, memory correction/forget, quiet hours, budgets and kill/restart |
| M9B | AgentMail, owned browser and read-only Agent Reach | Separate privacy/account/operations/isolation/reconciliation; navigation/redirect/script safety for authenticated read lanes |
| M9C | Verified phone voice/SMS | Provider/number/country/model/consent/recording/cost, inbound-storm/renewal operations and remote stop; independent of WP66 |
| M9D | Narrow standing mail/browser policies and incident controls | Explicit bounded owner policy, current-state recheck and remote-work inventory |

These milestones define engineering delivery, not a forced linear customer journey. Creator workflows can start from permitted creator material; an existing product can enter at campaign planning; imported feedback can inform research. Dependencies refer to actual data, not a requirement to click every previous tab.

The [first-result/service flow](plans/2026-11-13-first-result-and-service-flows.md) preserves a complete M1 → M2 sample/edit/export path without CRM, creator or campaign records. M0C job-card presentation supports each eligible job; the searchable/composable library is M3. WP21 consumes the M2 exporter in WP17 for service-job handoff, never the reverse. M3's split calculator is a proposal worksheet, not M6B generated software or M7D merchant accounting. Image/video generation still needs M4A; an unsent proof bundle needs M4B before sending and M4C before publishing. Portal/e-sign/invoice actions remain M8A. No card or scenario activates a later gate.

## Module contracts

Every manifest declares `id`, `version`, `capabilities[]`, `releaseMilestone`, `inputSchemas`, `outputSchemas`, `dependsOn[]`, `decisions[]`, `tools[]`, `permissionScopes[]`, `budgetPolicy`, `acceptanceChecks[]` and `tutorialId`. Capabilities can activate at different milestones inside the same module; do not label all of Media usable merely because its asset library exists.

| Module | Inputs | Outputs | First active capabilities |
| --- | --- | --- | --- |
| Brief | Goals, interests/knowledge/material, constraints | Versioned project intent and rights/budget record | M1 |
| Evidence | Questions, permitted sources, prior claims | Source pack, support/contradiction links and research gaps | M1 |
| Strategy | Brief/evidence | Ranked opportunity/format/positioning hypotheses, transformation map, decisions | M1 |
| Product | Approved strategy, evidence, own/authorized content | Editable product versions, exercises/templates and QA record | M2 |
| Creators/partnerships | Audience/offer, permitted profiles | Explained partner shortlist, proposals, duties and relationship tasks | M3 |
| Contacts | User imports, authorized discovery, correspondence | Deduplicated contact graph, stages, tasks and suppression state | M3 |
| Launch/campaigns | Offer/product/brand/contact versions | Funnel plan, copy variants, sequence calendar and experiments | M3; execution M4B |
| Media | Brand/product, own/licensed assets | Briefs and rights M2; generated variants/QA M4A | M2/M4A |
| Publishing/delivery | Reviewed artifacts, connector, grant | Dry run, approved publication, merchant/access mappings and receipt | M4C |
| Feedback | Manual notes or authorized channel imports | Linked findings, experiments and proposed revisions | M3/M4D |
| Library/export | Artifacts, profiles, sources | Portable bundles, versions, backups and reusable inputs | Restore M0B; exports M2 |
| Guidance | Current module state and original docs | Resumable tutorial, examples and contextual explanations | M0B; project-aware recommendations M1 |
| Connections/activity | Provider and device capabilities, budgets, runs | Exact settings, grants, events, receipts and failure recovery | CLI M0B; API/free/local M1; cloud M5A/B; remote M5C; extensions/collaboration M6A/C |
| Prospect data | Licensed provider/query/field/cost policy | Search/enrichment results and verified export jobs | M7A |
| Client operations | Authorized client/project roles and service connections | Portal/resources/documents/invoice handoff, tasks/booking, communications | M8A/M8B/M8C |
| Integrations/automation | Reviewed schemas/scopes, triggers and grants | External API/MCP and bounded workflow receipts | M8D |
| Agents/harness | Reviewed definitions, owner intent, exact model/grant/input refs | Bounded plans, delegated work, typed outcomes and inspector | M0C |
| Councils | Frozen question/evidence/roster/criteria/budget | Independent positions, challenge, recommendation/dissent and draft experiments | M3C |
| Personal Dot | One owner, memory/responsibilities, approved channels | Private research/digests/drafts, later reviewed or narrowly permitted actions | M9A-D |

## Toolkit coverage

The catalog needs original workflows for opportunity discovery, buyer/audience profiles, outcome mapping, product charter/outline, exercises, editorial QA, creator fit, outreach proposals, funnel strategy, landing/sales pages, email drafting/editing, titles/hooks/CTAs, objections and FAQs, social/story calendars, video/ad briefs, brand voice, campaign variants, publishing, feedback and updates. These are functional categories, not a claim to know another product's private prompts or every internal agent.

Beginner mode chooses relevant workflows for the project. Advanced mode exposes the library, searchable categories, favorites, reusable context and workflow composition. An agent-card count is not an acceptance criterion. Every tool must declare what information it uses, what it creates and which capabilities it can invoke.

Reusable job cards show exact requested/effective model identity, host, tools, budget/cost unknowns, approval stops and completion criteria. Client service jobs add permitted inputs, one deliverable, revision allowance and attributed handoff; product packs remain reusable. Storyboards, exports and unsent drafts retain those labels until the corresponding artifact/client/action evidence exists.

## Enforcing transitions

Implement eligibility on the server as `evaluateEligibility(moduleId, projectId, capabilityId): Eligibility`. Return structured blockers with actionable explanations, not only a boolean. Transition commands use expected revision, actor, idempotency key and requested action. Persist events and state changes in one transaction.

Relevant tests: shipped vs development complete; platform mismatch; missing prerequisites vs paid entitlement; expired service retaining files; stale evidence; revoked connector; budget exhausted; completed input revision superseded; reconnect/replay; unshipped action cannot dispatch through direct RPC; tutorial cannot bypass eligibility.

Every disabled/planned screen links the relevant implementation gate. Keep it understandable: "Publishing arrives in M4C. Your draft and export work now." Do not promise a date before delivery evidence exists.

## Evidence phases and independent journeys

Component fixtures do not activate a public capability. The canonical `acceptanceEvidence` metadata names component/integration/public-release producers, all unrun; direct RPC must reject missing activation evidence. WP02 development packaging proceeds before WP07 populated-data restore, which remains required for the affected public build. E4 pre-build decisions permit bounded development; WP37 measured operations/economics still blocks public paid WP35/36 activation.

WP22 creator dependencies and WP27 campaign/creator inputs are conditional. A reviewed direct product does not need creator records; a creator-backed one still needs rights/approval. WP31 manual feedback works without WP26 email execution or WP29/30 commerce adapters, while every connected input retains its own tests. Local WP20 hypothetical calculations need no merchant account. Software gates, optional adapter prerequisites and customer navigation are separate.

The [project experience](PROJECT-EXPERIENCE.md) adds complete business-project lifecycle, persistent context, late-callback isolation and guided/advanced states to WP03/08. The [service index](SERVICES.md) assigns need, authority, costs and exit per service. Expired login, revoked membership, compute exhaustion, service lapse and outage have different remediation; export grace does not bypass auth and never silently reactivates the old local writer.

A cross-milestone dependency must follow the explicit partial order in the register. Transfer tests always exercise the ownership protocol. Additional evidence producers apply independently when their capability is active on the transferring host. A basic transfer can pass with mail disabled. Enabling mail requires mailbox custody and late-receipt evidence for that host/action binding.
