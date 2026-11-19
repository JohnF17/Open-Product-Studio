# Downstream T3 Code architecture

Revision 3, 2026-11-12. Supersedes the separate Vite/HTTP-SSE engine design. [Product](PRODUCT.md), [fork evidence](research/fork-strategy.md), [upstream integration](UPSTREAM.md) and the [canonical roadmap](ROADMAP.md) travel with this document. The earlier twenty-task plan is a historical decomposition. Baseline intake and package acceptance are recorded separately for each implementation revision.

## Decision and baseline

Fork `pingdotgg/t3code` at `7d71f852a8edd298ffde67c295760c286a71a27c`. Preserve its Electron desktop application, React/Vite client, TanStack routing, Tailwind/existing UI primitives, Node/Effect server, authenticated RPC/WebSocket transport, provider packages, durable orchestration and SQLite. Do not extract a handful of components then rebuild their execution dependencies. The source research establishes feasibility; a clean packaged build is the first implementation test.

No second provider adapter hierarchy, SSE server, credential vault or task scheduler should be introduced beside upstream equivalents. Add business-domain services at explicit seams. Keep upstream dependency pins initially; upgrade only after the baseline works and compatibility tests justify it. RHF/Zod may support new forms; they must not cause a broad rewrite of upstream contracts or existing UI.

M0C adds the [agent harness](AGENT-HARNESS.md) around these services before AI-dependent modules activate. Proposed versioned AgentDefinition, RunPlan, ToolEnvelope, ReplyContract, ArtifactRef and Outcome bind roles, exact models, scoped tools, delegation and accepted results. Native runtime state, delivery, reply validation and business acceptance remain distinct. Hiding MCP tools is not authorization; provider-native shell/file/child paths must be qualified or disabled for constrained lanes. M3C councils consume the same harness without extra authority. [One later Dot](PROACTIVE-DOT.md) adds identity/memory/responsibilities and channel connections at M9A-D, not a second agent engine.

## Project categories and guided workflows

Register a category with a stable ID, display label, entry view and source-input policy. Guide and style definitions can evolve independently of the shell. Add a new category when it has a distinct starting decision and primary output. A variation such as portrait versus landscape belongs in the selected recipe. Catalog contributions describe capabilities and routes; only reviewed application code can supply a new execution adapter.

Every category uses one BusinessProject identity, asset store, run ledger and project picker. Persist the selected category ID and catalog version with the project. A workflow instance records its project ID, workflow/style version, current step, input revisions and editable decisions. Blank can start a guide later under its existing ID. Existing projects retain their data, routes and in-flight work when opened by a category-aware client. Resolve a missing legacy category conservatively; offer the user a guide without inferring the category from a filename. An unknown future category retains its original ID on import and round-trip export and can open in the generic workspace. Unsupported steps stay unavailable.

A style declares its output and capability requirements. Bind each satisfied requirement to an exact tool version, execution host and applicable grant when preparing the project. Persist the proposed plan and a separate readiness record. Installation or connection credentials stay on their owning host or account. Reopening a project reconciles readiness with the current host, installed versions and grants. A project export carries reproducible settings and the dependency list, with secrets and active approvals excluded. The catalog covers six categories. Replica binds an original behavioral specification to permitted observations and reserves executable prototypes for WP41. Day Trader binds its local practice journal to versioned decisions and, once qualified, a reproducible offline replay. Simulated activity has no broker or payment authority. [Category execution boundaries](REPLICA-AND-DAY-TRADER.md) A Clipper variant references an immutable source revision, a presentation-time interval and its own crop and captions. The media renderer consumes that edit through the existing job and review contracts. [Category catalog](roadmap/project-categories.json) · [Clipper editing contract](CLIPPER.md)

Source reuse is explicit. Creating a Video project from a selected workbook page captures the permitted source revision, attribution and relationship to the originating project. Later changes in either project never silently rewrite the other. Reuse the existing artifact and edit contracts for scripts, scenes, voice tracks, captions, renders and export receipts. Record content and settings digests for each derived scene. Changing one sentence invalidates the affected narration, timing, caption and composite dependencies; chargeable regeneration needs an eligible route and budget. Revalidate every publication preview whose payload changed.

Resolve or provision tools outside the renderer through the capability broker. Selecting a style immediately saves the choice, builds a dependency plan and checks already-authorized local capabilities. Show a separate action for a download, a new credential, access expansion or paid call. Resume at the first unsatisfied requirement after interruption. If two projects use one installed tool, removing it from a project releases its binding without uninstalling a shared executable. An approved renderer receives the scene and allowlisted assets in an isolated workspace, without the desktop profile or unrelated project files.

## Retained and changed surfaces

Retain `apps/desktop/src/{boot,main,preload}.ts`, platform services and updater structure; `apps/web/src/components/AppSidebarLayout.tsx`, `Sidebar.tsx`, `sidebar/SidebarChrome.tsx`, `components/ui/` and `index.css`; the existing picker in `components/chat/ProviderModelPicker.tsx`, `ModelPickerContent.tsx` and related logic; `packages/contracts/`, `packages/client-runtime/`, `packages/provider-core/`, provider packages and `apps/server/src/orchestration-v2/`.

The actual chat mounting seam is `apps/web/src/routes/_chat.tsx`, which owns `ThreadRouteView` and preserved-view/overlay behavior. Its thread leaf route alone is not the replacement point. Add a project dashboard route and retain optional thread views, settings overlays, background-run state, focus and navigation. Do not delete upstream chat execution merely because a business dashboard becomes the default view.

Proposed additions: `packages/studio-contracts/src/`, `packages/studio-domain/src/`, `apps/server/src/studio/`, `apps/web/src/features/studio/`, and bundled `modules/`. These are additive paths, not existing upstream modules. Domain packages depend on validated contracts and injected ports, never renderer/process/Convex SDKs directly.

## Desktop ownership

Electron owns the local server lifecycle. The server owns CLI processes, local SQLite, files, authorization and durable execution. The renderer consumes an authenticated, validated command surface and cannot read provider secrets or spawn arbitrary processes. A later web/mobile client connects to this execution host; it does not inherit raw credentials or become an independent local engine.

Use a new app ID, protocol handler, app-data directory, keychain namespace, publisher identity, update feed and telemetry configuration. Do not reuse T3's production services, credential stores, account records or update endpoints. No automatic migration of private T3 conversations. Local launch must succeed without our cloud or inherited Clerk/relay configuration.

Package Windows x64 first through the existing Electron Builder pathway. Test NSIS install/update/uninstall, native modules, packaged server ASAR, paths containing spaces/Unicode and protocol handler registration. macOS and Linux require their own packaged smoke tests before support claims. Signing/notarization are release prerequisites, not permissions implied by successful local packaging. See [UPSTREAM.md](UPSTREAM.md).

## Provider selection: preserve the actual contract

```ts
type ModelSelection = {
  instanceId: string;
  model: string;
  options?: Array<{ id: string; value: string | boolean }>;
};
```

Use upstream validated contracts, not this illustrative restatement as a replacement. Provider-native option descriptors drive controls; Codex discovery uses `model/list`, while other drivers may rely on manifests or session-negotiated options. The account/instance and execution environment matter. Catalog presence is not entitlement.

Retain provider navigation, search, favorites, custom/legacy/update-required states and model-specific effort/service-tier controls. Preserve each user's selection even when unavailable. Store requested selection, adapter/catalog versions and provider-reported effective model/reroutes with every business step. If a strict pin is rerouted, expose the mismatch, stop following steps and cancel where supported. Already-used quota may remain billable. An upstream that omits effective identity cannot support a verified-identity claim.

For delegated work use the native `target.providerInstanceId`, `model`, `options` and supported environment/project selection. Requested examples are Sol xhigh and Astra high when the chosen account actually advertises them. No universal effort dropdown or hardcoded entitlement. Free auto-routing is a separately labeled explicit policy and never masquerades as an exact pin.

Keep provider runtime modes and interaction/planning controls. Default novice startup to Supervised; advanced users retain supported modes. "Recommend and do safe work" is a separate business policy limiting tools, budgets and side effects. It cannot override native approvals or provide a missing OS sandbox.

## Business domain and storage

`BusinessProject` is not a T3 thread or a Git repo. It references audience/problem/offer revisions, source/claim records, decisions, people/organizations, creator profiles, relationships, permissions/suppressions, artifact versions, campaigns, publications, feedback, experiments, tasks, runs, approvals and usage reservations. One project can own many T3 execution runs and optional code workspaces.

Add namespaced SQLite tables and migrations through the existing persistence boundary. Use stable domain IDs, foreign keys, transactions and immutable version references. Keep large assets on disk with hashes. Preserve upstream thread/session/run identity rather than overloading a chat message as a business decision.

Domain events and stream replay have different retention. Retain approvals, decision provenance, product versions and publication receipts according to explicit business policies; upstream short-lived event pruning cannot become accidental loss of product history. Back up both database and asset graph consistently. A completed export and a regeneratable draft are not the same record.

The [first-result/service flow](plans/2026-11-13-first-result-and-service-flows.md) composes these existing boundaries. A JobCard projects definition/run-plan metadata; an M3 ServiceJob references client, permitted inputs, deliverable, revision allowance and handoff in existing workflow/context records. A ProofBundle binds an already-exportable M2 artifact to an M3 recipient/message and disclosure review. CreatorSplitScenario is deterministic proposal data under WP20, not generated executable code, a merchant ledger or an action grant. Product/export contracts never acquire a dependency on the M3 relationship or campaign modules. No new execution engine, persistence authority or personal-agent identity is introduced.

## Modules and milestones

The registry describes every module from M0, even before executable actions ship. Keep independent dimensions for software capability availability, per-project progress, entitlement, provider connection, permission and operational health. Start eligibility is evaluated server-side as their conjunction, not a single boolean "locked" field. See [MILESTONES.md](MILESTONES.md).

Bundled manifests define inputs/outputs, decisions, tools, budgets, acceptance checks and dependency revisions. Modules are initially declarative; arbitrary downloaded plugin JavaScript is not implied. Mutating source context invalidates affected recommendations/artifact review status without deleting historical completions.

## Research, recommendation and orchestration services

A daemon-owned service plans bounded searches, fetches permitted pages, extracts evidence, canonicalizes/deduplicates sources, evaluates contradictions/freshness and proposes decisions. Every module invokes the same service and stores its result against exact input/evidence revisions. See [RECOMMENDATIONS.md](RECOMMENDATIONS.md).

Use upstream durable commands, projections, outbox and cancellation semantics for actual side effects. Upstream's event sink and effect worker accept typed execution events; they are not an existing generic business API. Add an explicitly reviewed, versioned `studio.execute` effect referencing a durable operation ID. `studio/commit.ts` checks actor, expected revision, eligibility and reservations, commits owned domain state plus `studio_events` and operation intent through the same SQLite transaction/outbox instance, and publishes only after commit. `studio/runtime-bridge.ts` maps effectful operations to native runs; ordinary business edits do not create execution threads or require Git. Prove duplicate-command and crash behavior in WP04 before enabling automated work.

A recommendation is not itself a permission grant. A UI acknowledgement means committed intent, not completed work. Reconnect uses cursors/snapshots; crash recovery reconciles uncertain provider/external outcomes rather than blind replay. Research/drafting children inherit permission ceilings and receive bounded tasks, exact model settings, scoped evidence and reserved budgets. Preserve the distinction between provider completion and artifact/checkpoint finalization.

Trusted typed tools handle document changes and exports. Generated code, package installation, macros and active previews remain a distinct isolated lane. A Git worktree is a change-isolation tool, not an OS security boundary.

## Execution connections

Local CLI connections run supported official transports under each user's account/terms. Local official API connections keep keys in secure local custody. Local inference keeps cloud fallback off unless explicitly selected and acknowledges hardware/model-license constraints. These modes need driver-specific verification before advertised compatibility.

Cloud jobs use separate isolated workers and commercially authorized API credentials. They never execute against a personal desktop CLI by pretending the cloud owns that subscription. Clerk with the official Convex integration is the preferred optional hosted identity path; Convex remains the business control plane, not a replacement for local SQLite or environment authentication. Adapt/remove inherited cloud dependencies deliberately.

M5A project transfer uses immutable manifests and a fenced single writer: freeze source, prepare destination, commit an ownership epoch, then reject old-host writes. A deliberate copy receives a new project ID. Never synchronize live SQLite files, credentials, action approvals or wallet balances. Full collaborative editing has a separate M6C convergence gate for editable content; money, permissions and external actions remain serialized commands. M5C remote pairing requires scoped grants, revocation, replay resistance and independent review. Upstream network reachability does not prove project-scoped authorization or end-to-end confidentiality against a relay.

Offline mode supports local editing, local evidence inspection and exports already installed. Provider-dependent work queues with explicit stale/offline state. A sleeping desktop supplies neither always-on email ingestion nor buyer delivery: those use a tested external provider or an explicitly enabled always-on service. See [platform boundaries](PLATFORM-BOUNDARIES.md).

## Payment authorities and contracts

The [payment design](PAYMENTS.md) extends existing WP27-31/WP33-37/WP46-48. Authenticated actor, BillingOrganization/payer, active BusinessProject, creator MerchantConnection/legal entity/store and buyer identity are separate references. Navigation never supplies payment authority. Project-bound hosted requests explicitly name their authorized payer; merchant actions bind the exact seller account/mode/offer. Recheck membership, entitlement, grant, ownership epoch, immutable price/currency and reservation at dispatch. Provider-specific auth selection is separate; payment domain contracts do not require a particular sign-in vendor; SERVICES.md chooses Clerk for the hosted adapter without Clerk Billing.

WP35 owns payer-bound CheckoutIntent, SubscriptionProjection, ServiceEntitlement/SeatAssignment and CreditLot/UsageReservation/RefundCase contracts through the trusted cloud transaction boundary. Service subscriptions/seats and prepaid consumption are independent; WP42 still gates collaboration. The conditional Stripe Checkout/Billing/portal reference uses our operator as ordinary merchant. External merchant adapters own only verified creator order/access/payout projections; no master-store resale, pooled seller ledger or native payout service. A creator-owned external checkout and local CLI workflow need no Studio subscription.

A durable verified payment inbox, semantic purchase/invoice-line/effect keys, append-only corrections and provider-history reconciliation feed serialized projections/outbox operations. Provider account/environment namespaces prevent mixing test/live or Studio/creator events. Refund freeze/spend/settle transactions and consumed-unit dispute-loss records cannot be implemented as renderer balance edits or CRDT merges. Provider capabilities determine timestamp/event identity/replay handling; never impose an imaginary universal envelope.

## Security and billing

Enforce renderer isolation, validated IPC senders, safe navigation/external links, restrictive CSP, sandboxed active previews and least-privilege provider capabilities. Sources and model output cannot grant permissions. Retain upstream protections and add domain authorization at every new RPC. Read [SECURITY-MODEL.md](SECURITY-MODEL.md) for detailed boundaries.

Cash uses currency-specific exact minor units and exponent; prepaid service consumption has a separately defined exact integer scale/rate version. These service units are not deposits, third-party tender or cash-out balances. Reserve bounded cost before dispatch, settle attributable usage once and release unused reservations after evidence. Snapshot prices, cap tokens/tools/media/time, and handle duplicate semantic events, reordering, refunds/chargebacks, revoked access and unknown outcomes explicitly. Client checkout success never grants access or charges. CLI costs may be unknown; display provider-funded usage rather than zero. The proposed USD 19.95 service pack is a pricing test after measured economics and unconsumed obligations, not an unlimited plan. Cancellation/expiry preserves local ownership/export; deletion and finance retention follow disclosed separate policies.

## Upstream maintenance

Record the base SHA and downstream patch series; preserve required MIT and dependency notices. Keep an untouched upstream tracking branch. Integrate reviewed batches into staging, prioritize security fixes, retain upstream test suites and add business acceptance tests. Never globally rename internal packages just for branding. Own the update infrastructure and freeze/record packaging dependency graphs that upstream may resolve without a lockfile.

## Evidence

Primary source links and verified file paths are in [the focused fork report](research/fork-strategy.md) and [the deeper T3 investigation](research/t3-code.md). These establish source behavior, not a locally reproduced build, exact screenshots of this fork, or account-specific model access.

## Service and experience integration

The [service contracts](SERVICES.md) and [multi-project experience](PROJECT-EXPERIENCE.md) keep one coherent product. Preserve the T3 shell/provider/execution/SQLite platform; adapt business routes and replace inherited identity/feed/cloud configuration deliberately. Convex owns optional hosted business state, private storage and coordination through ports. Use existing indexed search and durable outbox first; Cloudflare edge is optional, Node workers remain isolated, and neither R2 nor a connector aggregator is an unconditional dependency.

Workspace/actor, BusinessProject/revision, BillingOrganization, AI account/model, execution host, sender and merchant/buyer contexts have separate typed identities. Project create/rename/archive/duplicate/template/import/export/delete operate on business records, not mandatory Git repositories. Switching views preserves drafts/focus and cannot retarget runs, callbacks, checkout or pending approval. Backend routing derives authority from immutable operation and exact connection bindings, not a global current-project variable.

Prefer hosted/system-browser sign-in and a separately qualified desktop bridge with one-use state/nonce and allowlisted callback. Clerk Electron beta is a gated alternative, not a mandatory shell scaffold. Do not load arbitrary remote auth UI into the trusted renderer or broaden its CSP/IPC. Validate cloud issuer/audience/session plus internal membership/tenant/parent/object ownership; local engine and paired-device authentication stay separate. WorkOS requires an explicit identity replacement decision, not dual authorities.

WP34 extends transfer with an external-operation inventory/custody barrier: queued runs, remote schedules, leases, Unknown results and account generations must have one custodian, confirmed cancellation or reconciliation before conflicting destination dispatch. Preserve IDs/fences for late receipts; reauthorize credentials separately. Cloud exit offers authenticated retained-current-data export/handback without a renewal purchase or funded AI job; an outage exposes cache age and missing bytes, and an explicit offline fork receives a new ID. Never resurrect the old local writer on lapse.

WP07 managed restore consults current deletion/revocation state outside the old snapshot before rebuilding retrieval or dispatch. An unmanaged archive without that journal is historical content-only recovery with review and inactive authority. This scopes earlier tombstone requirements; integrity alone cannot reveal later deletions.

See the [execution and release decisions](plans/2026-11-18-execution-and-release-decisions.md) for operation-specific replay after interrupted provider calls, shared command/manifest digest vectors, the hosted journal and single-writer project mutations. Each retained worker handler consults the durable logical operation before contacting its provider on retry.
