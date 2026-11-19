# AI recommendations and safe automation at every step

This is core product functionality. It supersedes a brief-only assistant or a workflow that expects the user to invent all choices manually.

Recommendations run through versioned [harness roles and reply contracts](AGENT-HARNESS.md), with required evidence and validated accepted outcomes. M0C establishes those controls before M1. A broken reply gets bounded repair or an honest partial/abstention, not silently accepted prose. M3C councils optionally add independent positions, a challenge and synthesis with dissent; their advice cannot authorize tools/actions. Later Dot can request recommendations under a responsibility/wake budget without gaining broader authority.

## Recommendation contract

Proposed service boundary:

```ts
recommend(context: DecisionContext, request: RecommendationRequest): Promise<RecommendationSet>
acceptDecision(decisionId: string, optionId: string, expectedRevision: number): Promise<Decision>
executeSafePlan(planId: string, grantId: string, expectedRevision: number): Promise<BusinessRun>
```

Define validated contracts in `packages/studio-contracts/src/recommendation.ts`. `DecisionContext` contains project/module/decision IDs, exact input revision references, goals, rights constraints, usable capabilities and selected model policy. `RecommendationRequest` contains evidence policy, desired alternatives and a reserved operational/cost budget.

Each option has a clear proposed action, why it fits, tradeoffs, assumptions, source/claim IDs, estimated operational costs, unresolved questions, confidence limitations and reversibility. Store requested/effective model, generation time, evidence freshness, prompt/workflow version and input digest. A “recommended” badge means best fit to the stated criteria, not a proven profitable outcome.

## Research pipeline

1. Derive bounded questions from the current decision and project constraints.
2. Search through supported provider tools or a separately configured official search connection. A text model without web tools cannot claim live research. Show the connection needed or use clearly dated cached evidence.
3. Fetch permitted source bodies with redirects/IP/size/time controls; distinguish inspected body, metadata-only and inaccessible source. Do not cite snippets as though full material was inspected.
4. Canonicalize URLs, deduplicate repeated underlying sources and retain provenance. Twenty mirrors of one claim are not twenty independent confirmations.
5. Extract relevant evidence into typed claims with short supporting passages/locators, retrieved time, publication date when known, hash and access/rights state.
6. Evaluate support, disagreement, freshness and missing information. Working links are necessary but do not establish claim truth. Separate model interpretation from direct observation.
7. Generate alternatives against declared criteria and review whether their cited evidence actually supports them.
8. Save the recommendation set against exact input/evidence revisions. Refresh or invalidate it when those inputs change.

Sources may include official documentation, permitted marketplace/product pages, community discussions, customer interviews, user-owned content and authorized creator profiles. Their reliability and rights differ. Do not promise unrestricted scraping of every platform, private content, copyrighted full-text redistribution or guaranteed demand detection.

## Decisions covered

The entry context includes category, style where selected, and the user's preferred level of guidance. In a new Video project with no topic, ask what audience or outcome the creator cares about, or offer a few starter directions and a custom choice. Explain why an idea suits the chosen style, the user's available assets, time and budget. A creator with a complete brief can enter it directly. Continue offering choices for hook, shot list, voice, pacing and caption treatment. A missing render tool may block a final render while the user continues writing or editing the storyboard. Preparing a style, accepting an idea and approving a public post each carry different authority.

| Stage | AI can investigate and suggest | User-facing result |
| --- | --- | --- |
| Starting | Interests, existing material, reachable buyers, constraints | Scoped project directions, including an explicit “insufficient evidence” outcome |
| Opportunity | Repeated problems, alternatives, unmet needs | Ranked problem/audience hypotheses with evidence and counterevidence |
| Product | Format, structure, examples, progression | Outcome map, charter, outline and sample |
| Production | Gaps, references, draft sections, exercises | Editable content and source-linked review queue |
| Brand/media | Tone, title, visual brief, variants | Explained options, rights/cost disclosure and inspectable assets |
| Partnerships | Public/permitted creator evidence, fit and responsibilities | Shortlist, proposal and contact tasks |
| Launch | Positioning, pricing experiments, funnel and channels | Draft assets, calendar and measurable hypotheses |
| Publishing | Destination requirements and readiness | Concrete preview/action proposal; never silent publication |
| Improvement | Authorized results, complaints and experiments | Explained revisions linked to affected artifact versions |

## Beginner and advanced modes

**Guided:** present the next decision and a small shortlist. Explain unfamiliar terms and let the person edit any input.

**Recommend and do safe work:** after a scoped grant, choose suggestions and execute reversible private research/drafting actions within budget, with checkpoints. Let the user pause or override the plan. Show what was selected and why. This grant is specific to permitted operations, not blanket consent to run arbitrary shell commands.

**Advanced:** expose evidence, prompts, per-worker exact provider/model/options, tool grants, workflows, version diffs and native runtime modes. “Provider default” and “free auto-route” are separate choices from an exact pin.

Automatic work stops before external send/publish/purchase, destructive action, privilege expansion, unexpected model reroute, exhausted budget or a material unresolved rights/security issue. A grant can cover bounded batch operations only when destination, payload class, limits and scope are concrete and enforced. New destination/content outside that grant requires a new decision.

## First-result diagnostic

Use the [first-result flow](plans/2026-11-13-first-result-and-service-flows.md) to group existing brief fields, not create a second onboarding record. Capture desired outcome, skills/permitted material, reachable audience, time/budget and prior attempts/constraints with explicit unknowns. Return one recommended route and one backup with rationale, evidence gaps, a small deliverable, budget/work ceiling and next checkpoint. An insufficient-evidence result can recommend a bounded investigation. No route implies proven demand, income or permission to substitute a selected model.

Choose from eligible capabilities: M2 can complete a sample and editable export without M3 CRM/outreach. Later service/creator/media actions show their gates. Reuse answers and version changes; do not force a long interview or automatically enable schedules. Full workflow-library composition remains M3 even though the harness already renders job inputs, exact settings/tools, limits and completion checks.

An optional editable 30-day execution plan groups weekly checkpoints and first-week actions around the selected route, current capability gates, time/budget assumptions and a user-adjustable activity target. At M1 it is revisioned recommendation data with manual progress and user-requested check-ins, not the sellable M2 action-plan product. It requires no CRM, calendar account or Dot. Turning eligible steps into M3 tasks/campaigns is an explicit later choice; advice never starts reminders, external actions or persistent wakes. Activity targets are hypotheses, not promised replies or income.

WP20 adds creator split sensitivity cases to existing proposal recommendations at M3. Exposure must be sourced or explicitly hypothetical; zero sales, refunds, fees, cost allocation, negative net and unknowns remain visible. The deterministic worksheet exports assumptions and never authorizes a payment. See the flow decision for calculation acceptance and later merchant gates.

## Bounded continuous assistance

Refresh on stage entry, explicit request, relevant edits, evidence expiry or an opt-in schedule. Debounce minor edits, reuse supported evidence and cap refresh frequency. “Continuous” does not mean an infinite background loop. A sleeping/offline desktop queues work and shows stale status; cloud execution requires a separate connection and disclosure.

Example conservative defaults to validate: 12 search queries, 24 fetched pages, two concurrent research workers, one synthesis/review cycle and at most two transient-read retries per recommendation job. Make defaults configurable, reserve budgets across children, and show the maximum before dispatch. These are proposed operational defaults, not measured quality guarantees or provider entitlements.

Budget dimensions include money where known, tokens where reported, queries, pages/bytes, media requests, runtime, concurrent jobs, retries and delegation depth. Unknown CLI costs remain unknown; operational caps still apply. Do not rotate accounts to evade quotas or silently move a private local project to a cloud provider.

Present recurring/already-owned access, incremental estimates, reservations and provider-reported actuals separately by currency, period and tool route. Failed/retried work remains visible; a known subtotal with unknown components is not an all-in total. Measured human setup/review time is separate from any assumed monetary valuation. Cost claims from a model are not billing receipts. Parent totals declare child inclusion; unique operation/attempt and receipt attribution prevents double-counting nested work, while unresolved attribution remains unknown.

## Evaluation

Fixtures must include no evidence, duplicated mirrors, contradiction, stale sources, unavailable platform, a malicious page, misleading search snippets, unsupported numeric claims, changing inputs, provider reroutes and exhausted budget. Assertions examine actual support and action boundaries, not similarity to one model's prose. Human domain review evaluates usefulness, accuracy and specificity on representative projects.

The system must be able to say “I found no defensible recommendation yet,” preserve useful partial work and suggest a smaller next investigation. Fabricating a confident answer is not a low-friction experience.

## Project context and independent inputs

Apply [PROJECT-EXPERIENCE.md](PROJECT-EXPERIENCE.md): preserve the immutable owning project/revision/host/provider/payer binding when navigating, and route late results to that owner. Cross-project evidence or council context needs explicit scoped selection. Guided/advanced views and recovery cards present the same eligibility state; a recommendation cannot auto-connect a service or move local content to cloud.

Direct-product launch consumes approved offer/context without creator records; creator-backed use retains rights/approval checks. WP31/32 can use authorized manual feedback with email execution disabled. Hypothetical split arithmetic remains a local worksheet without operational merchant prerequisites. These are choices among coherent journeys, not removal of creator, campaign or commerce scope.
