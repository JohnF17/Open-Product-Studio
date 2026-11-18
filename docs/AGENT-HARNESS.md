# Agent harness: behavior, authority and collaboration

Design extension, 12 November 2026. User requirement: agent operation is a core product capability. Keep the T3-derived platform and give business agents explicit behavior, tools, lifecycle, delegation and council contracts. A later single persistent agent, working name Dot, uses this same harness. No runtime capability described here is implemented in this repository.

This design extends [architecture](ARCHITECTURE.md), [recommendations](RECOMMENDATIONS.md), [security](SECURITY-MODEL.md) and the [roadmap](ROADMAP.md). Versioned contracts and work-package gates govern activation; a natural-language persona cannot create tool authority.

## What the harness owns

The harness mediates a run from user/project intent through model execution, tool calls, artifacts, questions, approvals, delegated work and completion. Retain upstream provider/session/run lifecycles, authenticated RPC, durable intent/outbox and recovery. Add business policies and validated contracts at those seams; use the same broker for a one-off specialist, a council member and Dot.

Current runtime tool metadata was inspected, independently of the pinned source. Available T3 families include provider discovery, top-level threads, delegated tasks, thread reads/context transfer, queues/steering, cancellation, scheduling/webhooks, preview/browser ownership, rendered artifacts, secure secret handoff and project/workspace management. Availability in this research session is not proof that every driver/platform/build exposes the same capability. The imported revision needs a compatibility matrix.

| Surface | Product contract and authority |
| --- | --- |
| Capabilities/model discovery | Return validated driver/account/environment descriptors and permission ceilings; cache with version/expiry. Tool discovery never grants permission. |
| Threads | Separate user-owned workspaces/conversations from child execution threads. Top-level creation requires a user action or a concrete configured workspace policy; delegation is a different operation. |
| Delegation | Bounded task, explicit agent/model/options, scoped inputs/artifacts, parent grant/budget and task ownership. Context inheritance is declared; it never silently copies every secret or conversation. |
| Read/message/steer | Scope thread access to actor/project/relationship; distinguish queued message, steering and a new turn. A sent message is not a completed task. |
| Await/completion | Durable subscriptions/cursors and completion events; persist result availability and delivery acknowledgements. A parent resumes when the required result actually exists. No perpetual model polling loop. |
| Cancel/stop | Cancel task trees through the delegated-task lifecycle; interruption of an ordinary thread is separate. Reconcile external actions and unknown outcomes; stop intent is not confirmed termination. |
| Context/artifacts | Immutable revisioned references plus a bounded handoff summary. Validate source rights/schema/hashes and mark instructions from imported material as untrusted. |
| Tools/browser | Typed capability broker, owned browser session/tab leases, scoped files/network and exact operation receipts. Browsing or a shell permission does not authorize purchases or publication. |
| Questions/approvals/secrets | Different request types and presentation. Ordinary questions cannot approve permissions; secure one-use secret handoff never writes credentials into chat/context/artifacts. |
| Scheduling/events | Opt-in triggers, verified identity/origin, deduplication, TTL/coalescing, budget and host availability. Persist jobs without promising an awake local machine. |
| Administration | App/environment preferences, project deletion, updates and broad permissions are privileged human/admin tools, absent from ordinary specialist defaults. |

## Agent definitions and reply contracts

Proposed `AgentDefinition` records immutable ID/version, purpose, compatible provider requirements, exact model-selection policy, input schema, allowed tools, output contract, permitted memory scopes, delegation policy, operational budget, stop conditions and evaluation dataset. A display name/prompt is only one field. Bundled definitions are declarative and code-reviewed; downloaded definitions follow extension gates.

An `AgentRunPlan` binds definition/version to authenticated actor, project/input revision, execution host, requested model/options, artifact/source refs, grant, reservations, parent/task/council IDs and expiry. The broker checks it at dispatch and every authority-bearing tool boundary. Child ceilings are intersections with the parent; no role name or council vote can raise them. One actor/project operation lease prevents conflicting side effects from parallel specialists.

`ReplyContract` separates readable progress from machine-consumed results. An agent may emit typed `progress`, `artifact`, `question`, `handoff`, `final`, `abstain` or `failure` envelopes, with run/causation/schema IDs and referenced inputs/evidence. Approval/secret requests are broker-originated authority records, not model-authored permission grants. Store concise rationales and evidence, not claims to expose hidden model reasoning.

Native structured-output support is discovered per driver/model. Otherwise use only a proven constrained extraction path with bounded validation/repair; malformed or unsupported output pauses/fails visibly. Never convert broken output into a success or switch models silently. Partial streaming text cannot commit a final artifact. Revalidate schema, references, rights, revision, semantic invariants and completeness before domain changes.

Examples:

- **Opportunity researcher:** returns alternatives, evidence/counterevidence, assumptions and gaps. Ranking is a declared heuristic. Has bounded research tools and no send/publish authority.
- **Creator analyst:** reports actually inspected counts separately from inferred themes/audience/voice; correctable analysis and rights travel with artifact versions.
- **Product writer/editor:** writes typed section revisions, preserves manual edits and returns outstanding review items. It cannot claim completed exports from prose alone.
- **Campaign composer:** creates exact recipient/content drafts and handoff refs. Sending is a separately eligible approved connector operation.
- **Council synthesizer:** summarizes supported recommendations, disagreement and missing members. It has no extra action permissions.

## Lifecycle and supervision

The [job-card contract](plans/2026-11-13-first-result-and-service-flows.md) is a readable projection of the same definition and run plan: purpose, input/context revisions, example output, exact requested provider/account/model/options/host, effective identity or unverified state, required/granted tools, budget/cost unknowns, approval stops and completion/handoff criteria. M0C validates this presentation with fixtures; M1/M2 use it without waiting for WP21/M3 library composition. Copying a card cannot copy credentials or action approvals. Reruns recheck current rights, evidence, model and grant/budget state while preserving manual edits.

Acceptance must match the artifact type and trusted receipt: a storyboard is not completed video, a draft is not sent, and export is not client acceptance. Display actual/estimated/reserved/unknown costs and recurring access separately; model-authored completion or billing prose cannot certify them. No additional named persona or persistent Dot is required.

Maintain separate identities for business project, user conversation/thread, agent run, provider session/turn, delegated task, workflow step and external operation. A stopped child or finished provider turn does not automatically finalize every parent artifact. Record `queued`, `running`, `waiting-for-result`, `waiting-for-user`, `waiting-for-approval`, `unknown`, `succeeded`, `failed` and `cancelled` as appropriate to each lifecycle; preserve native terminal semantics.

Bound graph depth, fan-out, concurrent runs, context bytes, tool/time/token/cost usage and repair attempts across the entire task tree. A workflow DAG declares dependencies, input revisions, completion conditions and side-effect serialization. Independent workers can proceed in parallel; changing evidence marks dependent results stale. Resuming requires fresh model/grant/rights/budget checks. Forking a draft is not replaying its external actions.

Expose a plain-language activity view: what is happening, which agent/model/host, what it used, what it created, what it awaits and what it cost or could cost. Advanced users can inspect the task graph, contracts and receipts. Novices see the next useful decision. Pause, cancel, resume, inspect and revoke are visible controls, with honest pending/unknown states.

## Councils and special workflows

Council design is a bounded deliberation protocol: selected roles receive the same frozen question/evidence with isolated initial responses, then a controlled evidence/challenge round and a separate synthesis. Preserve member identity, actual model/effort, input versions, votes/recommendations, concise reasons, dissent, abstentions and missing results. Diversity claims must reflect actual model/provider/evidence independence; several roles on the same backend are not independent expertise.

Choose purpose-specific templates such as opportunity review, product-quality review and launch-readiness review. Define quorum, maximum rounds, member budgets, deadline, replacement policy and whether a degraded council can produce advice. Never silently replace an unavailable member/model. Majority agreement is not truth, legal review or authorization. No council can approve its own spend, publication or privilege expansion.

Useful original features share these contracts: a decision clinic, evidence challenge, plan/task-graph preview, versioned handoff capsules, side-by-side model outputs, what-if draft branches and a shadow mode that proposes exact actions without dispatching them. Each needs a named capability, limits and evaluation; no generic label implies unrestricted agency.

## Later single Dot

Dot is one persistent user-facing identity with its own settings, scoped memory, event inbox, browser workspace and channel connections. Ephemeral specialists/council members remain execution helpers, not additional Dots. Its later release must use this harness and the same budgets, revision rules, permissions and receipts.

Plan foundation contracts early; activate Dot only at a later named milestone. Default external inputs are untrusted observations: email, phone transcripts and pages cannot impersonate the owner or grant tools. Proactivity means a bounded reason to wake, private research/drafts and a useful user notification under explicit policy. It does not mean continuous inference or automatic authority over every incoming request.

The [Dot/channel design](PROACTIVE-DOT.md) and [work packages](WORK-PACKAGES.md) incorporate the source reviews. M0C (WP52-57) ships the harness before harness-dependent M1 actions; M3C (WP58-59) ships councils; M9A-D (WP60-66) ships one Dot in later gates. No current research authorization connects accounts, creates phone numbers, sends messages or enables schedules.

## Source-backed integration decisions

Pinned source distinguishes discovery/exposure from executable permission; direct calls are not secured by hiding tools. `delegate_task.role` is a prompt/enum, not an output schema or capability restriction. Native provider shell/file/delegation tools are separate ingress paths. Qualify those controls per driver/model/route or disable the constrained lane; a filter around only studio MCP tools cannot promise complete confinement.

Retain upstream `McpToolAccess`, `McpInvocationContext`, `McpHttpServer`, `ProviderSessionManager`, `ThreadManagementService`, `Orchestrator`, `ScheduledTaskService`, preview `SessionControl`/`ServerBrowserContexts`, and secret services. Add reviewed studio tool handlers through the existing checked registration route. A generated MCP credential namespace is not necessarily the native provider-session primary key; maintain typed mappings. Pin version-specific behavior: current runtime tool metadata can differ from source U, including launch retry support.

The product guarantees at-least-once event transport with one durable logical acceptance/application keyed by ownership epoch, plan, step, attempt, outcome revision and consumer. Persist outcome/application/next-effect intent in the shared transaction. An upstream delivery acknowledgement is not proof of receipt by a model, semantic validation, human approval or exactly-once external execution. Preserve an unresolved-action fence across lease expiry until external reconciliation.

For councils, isolation includes peer threads, artifact reads and shared files before the initial-position barrier. Reserve synthesis/review budget before member launch. Example quorum to evaluate: two substantive validated positions from a three-member roster plus an independent completed review; participation and recommendation quorum differ. Enforce any requested distinct-model condition using verified receipts. Timeout/abstention does not invent a vote, reviewer pass or replacement model.

Sources inspected at `7d71f852a8edd298ffde67c295760c286a71a27c`: [MCP access](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/mcp/McpToolAccess.ts), [HTTP registration/exposure](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/mcp/McpHttpServer.ts), [delegation](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/ThreadManagementService.ts), [completion fixtures](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts), [browser control](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/preview/SessionControl.ts). Inspection of test source is not execution evidence. Required runtime/denial/recovery tests belong to WP52-59.

## Qualification, connection and custody lifecycle

WP53 qualification receipts bind driver/executable/runtime, model/route, permission configuration, OS/sandbox and relevant tool-schema identity. Recheck observable identity at dispatch; changed or unqualified routes cannot inherit constrained-lane claims. Preserve exact selections and local artifacts while affected authority is blocked. Signed trust freshness/revocation and authenticated recovery are defined in [SERVICES.md](SERVICES.md), not inferred from a once-passed test.

All connector execution, including optional Composio meta/proxy/auth paths, uses server-derived exact workspace/account/resource bindings. Navigation never supplies actor/project authority. WP34 custody transfer inventories queued/native/provider-held/Unknown operations and leases, preserves logical IDs/fences and routes late receipts to the current owner; writer fencing alone cannot cancel a remote schedule. WP07/56 require a current external deletion/revocation journal before restored memory/context or wakes can resume.
