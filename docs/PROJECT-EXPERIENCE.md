# One workspace, many projects

Design only, 13 November 2026. Keep the familiar T3 shell and build a beautiful, calm, responsive business workspace inside it. This document specifies interactions and acceptance targets, not screens or services that already work. [PRODUCT.md](PRODUCT.md) defines the whole catalog, [SERVICES.md](SERVICES.md) defines authority/operating needs, and [PAYMENTS.md](PAYMENTS.md) defines the separate financial flows.

## Persistent context and navigation

The top-level workspace picker identifies local host or hosted workspace, signed-in identity where relevant and current role. Beside it, a project picker provides recent/pinned projects, search, create/import, archive and export. The chosen project remains visible through modules, overlays and action review. Local work opens without an account, even when hosted sign-in is unavailable. Empty state offers a small original editable example labeled as such; it is not a fake completed AI job.

Projects are business workspaces, not forced Git projects. Create blank or from an original template; rename without changing stable identity; archive/unarchive without concealing running work; duplicate an explicitly selected content snapshot into a new ID; import a validated portable bundle with schema/hash/rights review; export reviewed artifacts or a private portable bundle with clear content selection. Templates and duplicates strip personal/client-specific inputs unless deliberately included and never carry credentials, grants, approvals, active schedules or financial authority. Choosing a code workspace is a separate optional action.

Delete review names the project and distinguishes local content, cloud authority, retained backups/finance records, external publications and running/provider-held work. Offer export and show affected jobs/retention before a concrete confirmation. A project delete cannot claim to cancel a provider subscription, retract a buyer download or erase independent archives. Fence new work and reconcile pending operations; a delayed callback must not recreate the deleted project or redirect its private data. Current tombstones apply to managed restore, while historical content-only recovery discloses its limits.

Within a project, Home shows the goal/offer, one useful next decision, a resumable job, recommendations waiting for review and recent artifacts. Modules remain discoverable in the sidebar/palette: Brief, Evidence, Strategy, Product, Creators, Contacts, Campaigns, Media, Publishing/Delivery, Feedback, Library, Guidance and Connections/Activity, plus the explicitly gated later catalog. Collapse secondary groups on narrow views without hiding their existence or pretending planned actions work.

Guided mode explains purpose, required inputs, an example, current availability and one next action. Advanced mode exposes the full searchable workflow library, graph, model settings, versions, provenance, costs, logs and conversation inspector. Switching modes changes presentation, not authority, saved work or milestone state. Search and command palette use the same action registry and backend eligibility as buttons. Neither a keyboard shortcut nor a tutorial can bypass an approval.

Global settings contain device/application preferences and connection management. Workspace settings contain membership/roles and hosted service context. Billing lives under the selected payer organization and requires billing authority. Project settings contain brief, revisions, defaults and explicit bindings. Creator merchant setup belongs to offer/publication context; the buyer's checkout/account is an external surface. Do not place every account behind one ambiguous profile icon.

## Context shown where it matters

| Context | Persistent or action-specific disclosure | Authority rule |
| --- | --- | --- |
| Workspace / actor | Local or hosted, account and role | Backend derives actor; workspace membership does not follow an email match |
| Project / revision | Named project, input/artifact revision and current writer | Navigation never changes the owner of an existing run or receipt |
| Payer organization | Billed organization, available/reserved units, plan/seat status on hosted job/checkout | Project binding and current billing role checked at dispatch; no implicit payer switch |
| AI provider / account / model | Exact selection/options, actual route and effective identity or unverified label | Preserve unavailable selections; no fallback from an alternative project recommendation |
| Execution host | This device, named paired host or hosted worker; awake/offline/stale state | Phone is a control surface; no raw CLI credentials or implied always-on desktop |
| Sender / connected account | Exact mailbox, verified external account/environment and scope on send/connect review | Connecting or logging in does not grant send/publish authority |
| Merchant / buyer | Seller legal entity/store/test-live mode, offer/artifact/price/terms on publication; buyer access separately | Studio service units/seats never pay creator sales or establish buyer identity |
| Cost / data destination | Quote ceiling, rate/currency/period, actual/estimated/reserved/unknown and disclosed recipients | Unknown is not zero; inclusive parent and child charges are counted once |

Defaults are proposals stored per scope. Changing a default does not retarget prepared actions or running work. A connection's friendly name is not a stable account identity. Exact destination/recipient/account and payload remain readable in the review panel at 320 CSS px and with a screen reader; do not hide them behind animation or an overflow tooltip.

## Project switching and late work

Before switching, persist a valid draft or retain an explicitly labeled local unsaved buffer. If a required commit fails, preserve the buffer and show retry/export/discard options; never silently drop it. Maintain focus, scroll, filters, panels and selected revision per project. An open approval remains bound to its original project/action and may be dismissed or revisited; any attempted retargeting requires a new preview and approval.

Jobs keep immutable project/ownership epoch, provider/account, host, input revision, grant, payer/reservation and operation/attempt references. Switching from A to B changes only the visible view. A late completion, OAuth return, webhook or payment callback resolves through its trusted original binding and updates A, not whichever project happens to be open. If access was revoked, hide private result content and show an appropriate status without moving it elsewhere. Notifications name the owning project/run and recheck access before deep-linking.

Cross-project search is a deliberate workspace-wide scope with permission-filtered results, not hidden mixing of client notes. A council or workflow receives only explicitly selected project/context references. Copy/import creates new identities and strips credentials, grants, approvals, wakes and billing authority. Archive is a navigation state, not proof remote work stopped. Archive/delete/cancel review inventories active jobs, pending remote operations, external listings/renewals and retained records separately; handle each with its own authority and receipt.

## Useful journeys without a forced funnel

1. **Local first result:** choose an idea, own material, no-idea recommendation or permitted creator input. A short diagnostic produces a route plus backup and a small deliverable. M1 recommendations need qualified provider access; the example and manual editing do not. M2 completes a reviewed guide/workbook sample, editable source, readable rendition and outside-app reopening without CRM, mail, creator records or cloud. The other document-family acceptance gates remain required.
2. **Direct launch:** use an approved product/offer/context, choose one qualified creator-owned merchant/delivery destination, inspect exact account/version/price/terms, then explicitly publish or perform labeled manual setup. No partnership record or campaign send is required. A creator-backed launch additionally needs current creator rights and attributed approval. Pending payment, payment confirmed and buyer delivery remain separate states.
3. **Service and creator work:** M3 job cards compose existing tools with permitted client input, deliverable, revision allowance and handoff. Proof bundles hold an exact sample plus an unsent recipient-specific pitch; images/video, sending, publishing and invoices keep later gates. Local split worksheets stay hypothetical and work without an operational merchant account. No scenario claims earnings, legal agreement or payout.
4. **Learn and revise:** manual feedback or an independently accepted order/campaign input yields source-stamped observations and a reviewed revision proposal. With M4B disabled, this path still works without mailbox setup. Missing metrics stay unknown. Revised publication or sending always needs a fresh eligible action review.
5. **Hosted continuation and exit:** deliberately preview data destinations and move a compatible project with the transfer/custody barrier. Select an authorized payer and exact hosted model only for work that needs them. Distinguish compute exhausted, service lapse, revoked access, expired login and outage. Authenticated retained work can be exported/handed back without renewal purchase; cache-only offline forks use new IDs. Never unfreeze the stale old local master automatically.
6. **Paired device and later Dot:** select a named awake host and scoped grant; narrow layouts control that host. Dot remains one later identity with private-first responsibilities and separately qualified channels. The project dashboard does not secretly activate background wakes, mail, browser credentials or phone service.

## Zero, error, offline and recovery states

| State | What the person sees and can do | What must not happen |
| --- | --- | --- |
| No project / no provider | Create/import or open a labeled editable example; explain which actions need inference | Mandatory cloud login or fake free model result |
| Planned capability | Purpose, milestone, usable export/manual alternative | Upgrade prompt suggesting payment enables absent code |
| Missing input / permission / connection | Exact blocker and one contextual remediation; preserve work | A single generic locked state or auto-connection |
| Loading / streaming / partial result | Stable layout, cancellable job, known completed stages, saved sections | Imaginary percent complete, token-by-token layout movement or terminal text accepted as output |
| Quota / insufficient units / expired quote | Preserve exact model, show payer/cost/quote and retry after explicit correction | Silent downgrade, top-up, cross-account debit or replay of uncertain work |
| Offline / sleeping host | Last verified timestamp, locally editable/exportable content and queued request state | Claim that remote bytes are present, phone execution or background provider delivery ran locally |
| Stale input / changed account | Explain which review/input/binding changed; regenerate only with a new eligible plan | Apply an old approval to the new project/account/version |
| Denied / revoked / expired session | Denied action with private data withheld; reauthenticate only if still entitled to access | Export grace bypassing membership removal or forcing online auth for unrelated local files |
| Unknown external result | Saved work, operation/account/host reference, reserved/known/unknown costs and reconciliation/support action | A blind retry, success toast, automatic refund or claim that cancellation finished |
| Recovered / restored | Verified revision/assets, missing components, current authority and next safe step | Reinstating stale grants/wakes or normal retrieval of unreviewed historical deleted material |
| Empty metrics / insufficient evidence | Manual notes/import, source completeness and abstention or smaller experiment | Zero sales/conversions inferred from inaccessible data |

A compact recovery card follows the job: what was saved, what remains uncertain, what may still cost, and the next safe action. It links minimal receipt IDs and relevant project/host/account without exposing tokens, full private URLs or message bodies. Support diagnostics require a user-reviewed export. Provider-native support remains available for paid-but-not-delivered or ongoing rent when the desktop is closed.

Cloud exit uses the proposed 30-day authenticated read/export window in SERVICES/PAYMENTS, finalized with capacity and retention terms before activation. Authentication can expire during grace; access must be re-established without charging for export. Revoked members do not inherit that right. Missing remote assets or an outage yield an incomplete-manifest/recovery state, not an empty success. A verified handback fences cloud writes before local authority starts. A historical archive without newer deletion records is content-only recovery with a warning and explicit review.

## Visual, motion and performance contract

Use the retained light/dark tokens, density/typography preferences, spacing rhythm, panels and keyboard conventions. Add a clear visual hierarchy: project identity, one main task/decision, meaningful artifact preview and quiet secondary metadata. Use purposeful transitions for panels, saved revisions, selection and settled status; motion should explain a state change. Busy dashboards, decorative shimmer loops and attention-grabbing agent personas do not substitute for usable hierarchy.

Proposed budgets, to measure rather than advertise: local transitions **120–200 ms**, decorative transitions **at most 250 ms**, no continuous decorative animation, and reduced motion removes movement while keeping state change perceptible. Prefer opacity/transform to layout animation; target a 60 Hz frame budget on declared hardware, record dropped frames and long tasks. Batch streamed content updates, preserve reading position and virtualize long activity/contact/asset lists. Do not animate focus away from an approval, reorder a reading target during streaming or flash status in a way that obscures errors.

Browser targets remain **LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1** on a declared network/device/content profile. At WP02/WP08 record packaged cold/warm startup, idle memory, project-switch latency and long-project scrolling baselines. Proposed regression alert is over **10%** on the same profile; investigate noise and approve an evidence-backed budget before activation. A platform-specific baseline is required before claiming fast startup or low memory. No new animation library is mandatory; use existing primitives unless a measured requirement justifies one.

Keyboard and representative screen-reader journeys cover picker/palette, forms, model selection, exact action review, unavailable actions, quota/error recovery and export/reopen. Target WCAG 2.2 AA, visible focus, logical headings, meaningful names, touch targets of 44 px where feasible, 320 CSS px usability and 200% zoom. Use restrained live announcements for significant status changes rather than every token. Tour overlays must be dismissible, focus-safe and resumable; tutorials cannot approve tools or collect payment.

The exported product is part of the experience. Check heading navigation, reading order, language, link text, image alternatives and table semantics in named external readers. An intended reader must complete an exercise using a representative screen reader. Verify tagged PDF semantics or disclose its specific limitation and provide a tested accessible DOCX/HTML alternative. An app-level accessibility scan does not certify an exported file.

## Acceptance map

WP03 owns typed context and action eligibility; WP08 owns navigation, states, focus and motion; WP05/06/57 own exact job identity, cost and recovery; WP17 owns outside-app accessible first-result acceptance. WP20/22/27/31/32 preserve independent worksheet, direct-launch and manual-feedback paths. WP09/33/35 own server-derived account/payer bindings; WP07/34 own deletion-aware restore, custody transfer and authenticated exit. WP38 owns paired control; WP60-66 apply the same host/account rules to Dot.

Required two-project fixture: same display names, different private notes/accounts/payers, unsaved A draft, running A job and open A approval; switch to B, expire/revoke A authority and deliver late A callbacks. Preserve drafts/focus and receipt ownership, deny retargeting/leaks and show the correct recovery. Repeat keyboard-only, narrow window, reduced motion and representative screen reader. Component presentation fixtures precede later real journeys; all states stay planned until their exact implementation gates pass.
