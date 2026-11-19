# One personal Dot: later proactive agent milestone

Design decision, 12 November 2026. One persistent personal identity over the [shared harness](AGENT-HARNESS.md), with scoped memory, responsibilities, owned browser workspace and explicitly connected channels. No application, account, mailbox, number, browser profile or background schedule is activated by this document.

## Product shape and choices

The user's reference is real: official [ChatGPT dots documentation](https://learn.chatgpt.com/docs/dots) describes an ongoing agent with its own cloud computer/browser and cross-conversation work. We use the behavioral idea of one continuing assistant. This does not establish a public integration API, access to a user's ChatGPT memory or permission to reuse branding. Our working name and visual identity require normal clearance before release.

Keep one user-facing Dot, not a multi-Dot management product. Helpers/council members are ephemeral execution roles. Each inbox, number, conversation and browser context maps to the same stable identity and separate connection permissions. Local-only uniqueness is scoped to the workspace; no global single-instance promise across unlinked offline installations. Cloud-linked owners get a unique binding and one active host/ownership epoch. Copies of a project do not silently activate another Dot or inherit its credentials.

An additive responsibility layer over T3 is the chosen approach. A chat-only persona lacks durable identity/events; a separate agent platform would duplicate execution, approvals and recovery. Define ownership/memory/event contracts in M0C, keep Dot visibly planned in the initial registry, and release it later. Councils remain available independently; Dot does not need a council for every message.

## Delivery gates

| Gate | Packages | Activation evidence |
| --- | --- | --- |
| M0C foundations | WP52-57 | Synthetic role/tool/reply/outcome/memory/wake tests; no personal channels activated |
| M9A private Dot | WP60-61 | One identity/host lease, inspectable memory, owner-enabled research/drafts/digests, pause/forget/kill/quiet-hours/budget fixtures |
| M9B connected correspondence/research | WP62-64 | Each AgentMail, owned browser and anonymous Agent Reach capability separately passes scope/privacy/isolation/reconciliation tests |
| M9C phone | WP65 | Intended provider confirmed; account/country/number/model/consent/recording/cost/stop tests pass per channel |
| M9D narrow unattended actions | WP66 | Explicit expiring recipient/action/data/cost policy, post-approval race/revocation tests and incident operations; phone remains per-call reviewed |

The architecture report suggested placing persistent browser activation in M9C; the connector report paired it with mail in M9B. This plan selects M9B with **separate browser acceptance**, because mail-link research and private login handoff form one useful workflow. Phone stays M9C; standing external-action policies get M9D. Merely reaching M9B cannot enable an untested browser, mail or Reach adapter. Local Dot does not require the hosted wallet, client portal, every M8 service or a paired phone; those add only their relevant capabilities.

## Event, wake and action protocol

`ingress → verify/normalize/quarantine → durable dedupe → wake policy → bounded harness plan → private result/proposal → authorized action → receipt/notification`.

`EventEnvelope` records connection/account/provider IDs, occurred/received time, schema, payload digest/ref, authenticated transport, trust class, owner/project scope, TTL and causation. A signature authenticates transport, not the email author as owner. Ordinary email, speech, caller ID, known domains and browser text cannot modify instructions, budgets, recipients or permissions. Owner commands/approvals use the authenticated application/paired channel; voice similarity or a phone number is insufficient.

`Responsibility` names a useful outcome, input/source scopes, wake conditions, timezone, quiet hours, priority rules, expiry and limits. `WakePolicy` adds cooldown, coalescing, maximum event age, root-causation/depth, one-concurrent-run starting policy and per-period budgets. Untrusted urgency text does not bypass quiet hours. Block self-notification/auto-reply/DSN loops. Reserve inference/tool capacity before work; default private mode has no external send/call/spend authority.

Use existing scheduler/jobs, not an infinite model loop or a new scheduler. Fresh sessions reload current memory/grants. Mail/calendar background research returns private drafts/notes and an owner notification. Browser computer actions are a separately authorized task lane. Explicitly scheduled tasks and standing policies do not inherit broader rights from the word proactive.

Exact selected CLI/API/model/options/host apply to every helper. If a hosted phone vendor supplies its own conversational model, disclose that route and its limitations; never label it the selected CLI. Native approvals remain in force. Schema-validated model text cannot construct its own trusted receipts or action grants.

## Memory and user controls

Keep owner-confirmed preferences, tentative inferences, project decisions and external source evidence distinct. Store origin/author class, source revision, visibility, confidence, observed/expiry time, correction history and retention. Permissions live in a separate authenticated policy store. Retrieval cannot leak personal context into another client/project or outgoing correspondence.

Inspect/edit/export/forget must affect summaries, retrieval indexes/embeddings, caches and queued context as appropriate; tombstones prevent replay/backfill/restore resurrection. Keep minimal audit metadata under a separate policy. Credentials/OTPs and private login state never enter semantic memory. Provider/recipient/backups have their own deletion limits.

Expose pause responsibilities, stop current plan, disable trigger, revoke connection, browser takeover and global kill as different controls. Kill fences new dispatch first, cancels owned work and inventories provider-held sends/calls/sessions; it cannot unsend content or prove immediate remote cancellation. Restart reconciles before action. A missed reminder becomes a dated catch-up, not yesterday's call or a blind send after a reply.

## AgentMail integration

Use a scoped dedicated inbox/key and provider resource mapping. [Verified Svix webhook ingress](https://docs.agentmail.to/webhook-verification) or [supported polling webhooks](https://docs.agentmail.to/webhook-polling) feed durable normalized events. Polling can serve an intermittent local host without a public engine endpoint; confirm region, retention/backlog and account support. Deduplicate provider `event_id`, preserve inbox/message identity and reconcile history; a dropped connection is not guaranteed replay. [Delivery semantics](https://docs.agentmail.to/webhooks-overview).

Local drafts are private work. Provider-hosted drafts, schedules, replies and sends are external writes. Approvals bind effective recipients/body/signature/attachments/source revision and price, including fields that a provider might merge at send time. Recheck current replies/suppressions and revoke pending remote work on Stop. Verify idempotency windows before retries; unknown send outcomes need lookup.

AgentMail [does not support cold outreach](https://docs.agentmail.to/knowledge-base/cold-outreach). Keep Dot's expected/consenting correspondence separate from the studio's prospect campaign adapters. Its [October 2026 privacy notice](https://www.agentmail.to/legal/privacy) permits email-content use for developing/training models unless a written agreement changes that. Connection requires acceptable privacy terms; no default no-training claim or automatic sensitive mailbox upload. Pricing/limits differed across retrieved pages, so actual account quotes and scopes govern activation. These are service requirements, not included app entitlements.

## AgentPhone identity and phone constraints

**Owner-selected provider: [agentphone.ai](https://agentphone.ai/docs)** for numbers, SMS and live voice. Keep `PersonalPhonePort` as the internal abstraction and implement its AgentPhone.ai adapter in WP65/M9C. Bind the canonical API origin, selected account and actual number capabilities before activation. The provider choice is resolved; account/country eligibility, consent, recording behavior and pricing still require verification. Verify account and destination eligibility from the selected provider at activation.

Test inbound/outbound voice/SMS, readiness/registration, webhook signature/identity/replay, call history, latency, number expiry/reassignment, consent/disclosure, recording-off and hangup/revoke per supported operation. Voice uses a responsive bounded handler; a scheduled research worker is not a live audio service. Never execute arbitrary transfer/SMS/DTMF fields from model output. Number rent, inbound costs, retries, recording add-ons and auto-recharge are separate spending authorities.

Calls and new recipients need concrete review at first. No emergency service, unsolicited outreach or implicit recording. If capture cannot remain off until required consent is established, disable that capability. Release or revoke does not erase earlier recordings/transcripts or recipient copies. Provider-held work and recurring charges must appear in incident controls.

## Owned browser and Agent Reach

Reuse T3 preview services, but add a supported explicit Dot-profile provision/lease path. Manual preview capability does not prove persistent isolated profile creation. Never default to the personal profile or copy personal cookies/password stores. Separate anonymous hostile research and authenticated accounts; use OS/container boundaries where required. The user completes login/MFA privately; agent screenshots/recordings pause during secrets. Takeover drains and fences automation; resumption takes fresh status/snapshot and invalidates old locators.

Read-only browser mode cannot invoke arbitrary evaluate mutations/uploads/forms. Approved browser writes obey the same scope/payload/disclosure/cost policy as APIs. Browser and API writes share resource fences to prevent duplicate submissions. After a crash/lost tab, recheck account/profile/lease and external history; a click/success banner is weaker evidence than a provider receipt.

Agent Reach remains read/search-only. The installed skill describes automatic site-cookie import from connected Chrome in some setups; that is incompatible with our isolated Dot default. WP64 must deny access to personal Chrome/OpenCLI state and verify anonymous-only channels. Authenticated Reach stays off until supported isolated setup exists. No supported bridge between Reach's own browser and T3's profile was established; do not assume shared sessions. Stop on login/CAPTCHA/rate/busy restrictions. A tool or skill cannot grant itself broader capabilities.

## Availability and useful first scenarios

Local Dot works while its selected host is awake; email provider receipt is not local processing availability. A separately accepted cloud execution host can provide always-on ingress/work/browser under its own account, isolation, costs and operations. Pairing controls that host; it does not transfer CLI credentials. Fence host ownership so local/cloud do not both act on the same event.

- **Daily digest:** owner selects project notes and an 08:00 weekday check; Dot groups changes, deadlines and decisions into one source-linked private summary. Offline catch-up is dated.
- **Research/follow-up draft:** an existing collaborator's new requirements trigger bounded topic research and an unsent reply. Incoming content supplies evidence, not new authority. Sending uses a separate reviewed action.
- **Appointment preparation:** authorized calendar/supplied details yield an agenda and unanswered questions. M9C may add one eligible explicitly approved call; uncertainty is never reported as a confirmed booking.

No services were configured or live integration-tested during research. Source/API/account/rights/privacy/consent evidence and independent runtime acceptance remain activation gates. [Official dots security guidance](https://learn.chatgpt.com/docs/enterprise/dots-security) is a useful reference for separating read-only proactive research from separately authorized actions; our implementation must demonstrate its own controls.

## Channel activation, browser reads and recovery

Every channel has its own first-activation operational profile under [SERVICES.md](SERVICES.md): operator/provider support route, ingress/backlog/cost caps, alerts, reconciliation, credential-compromise response and a credential-free outage runbook. Mail and phone independently test webhook storms, revocation, remote cancellation and continuing mailbox/number charges before WP62/65 activate; WP66 adds standing-policy operations later. No sibling channel is required for a failure exercise.

Host moves use the external-operation custody barrier: fence dispatch, inventory provider-held schedules/sessions/Unknown work and retain one custodian or reconcile cancellation/adoption under the exact original account. Late receipts cannot reactivate the old host or cause a duplicate event action. Copies/offline forks keep new identity and inactive Dot authority. Restored memory must reconcile newer deletion/revocation state outside the old backup; without it, historical content stays under content-only review and no wake/grant revives.

Untrusted links default to an anonymous isolated browser. A credentialed GET, redirect or automatic page script can change external state before a form tool is called. Authenticated read lanes therefore need supported site/operation navigation and subrequest policy enforced outside the model; otherwise use a separately authorized browser task or human handoff. Never automatically follow tokenized consent/unsubscribe/cancel/purchase links with credentials. Synthetic navigation/redirect/script fixtures must prove the read lane cannot mutate the test account; blocked research cannot retry through another profile.

WP62 consumes the WP09 mailbox ingress contract directly. Personal inbox backfill, local drafting and provider-side stop each have a fixture with contacts, campaigns, browser and phone disabled. WP25 separately applies prospect campaign sender policy.
