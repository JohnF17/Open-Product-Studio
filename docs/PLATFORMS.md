# Platform choices and operating modes

13 November 2026. Decisions for implementation, not installed/deployed integrations. Read the [roadmap](ROADMAP.md), [feature coverage](FEATURE-COVERAGE.md) and [platform boundaries](PLATFORM-BOUNDARIES.md) with this summary.

| Layer | Choice | Purpose and acceptance boundary |
| --- | --- | --- |
| Desktop/execution foundation | Pinned MIT T3 Code downstream fork | Keep Electron, familiar UI/model picker and durable execution. Separate our app identity/data/update services before launch. |
| Client | Existing React/TypeScript, Vite, TanStack Router, Tailwind and UI primitives | Dashboard in the retained shell; responsive task guidance, optional conversation detail, bespoke accessible components. Retain baseline pins, then upgrade through compatibility gates. |
| Forms and motion | Compatible RHF/Zod; existing primitives plus a reviewed motion library only where useful | Validated accessible business forms, subtle feedback, reduced-motion behavior. No broad component-system rewrite to chase a version number. |
| Local services | Upstream Node/Effect and authenticated WebSocket/RPC | Validated commands, scoped tools, native provider/session/run semantics and business transaction bridge. No second task engine or auth stack. |
| Local persistence | SQLite plus hashed immutable asset files | Own projects, decisions, contacts and artifact versions offline; transactional intent, migrations, consistent backup/restore. Convex is not embedded as a mandatory local database. |
| AI execution | User-selected supported CLI; separately tested official API/free/local adapters | Exact instance/model/options, requested/effective receipts and no silent fallback. No guaranteed account entitlement or free premium capacity. |
| Research | Agent Reach, existing shared browser and primary-source retrieval; optional local ASR | Evidence, contradictions, freshness, rights and transcript provenance. Tool selection/installation does not bypass source availability or platform limits. |
| Optional cloud identity/data | Clerk preferred with official Convex integration | Convex remains the hosted business authority, private storage and coordination service. One identity authority, backend tenant/parent checks; system-browser sign-in with a separately qualified desktop bridge. No local login dependency. |
| Hosted jobs | Isolated server-side Node/API workers | Long-running/streaming generation, bounded network/resources and metered jobs. Convex coordinates durable state; it is not treated as an unrestricted process host. Deployment vendor chosen with operational/country/cost evidence at WP36. |
| Studio service billing | Proposed Stripe Checkout/Billing/customer portal, conditional on E4 | Optional recurring service/seat entitlements and separate one-time prepaid service units. Our ordinary processor merchant duties remain explicit. Paddle is an independently approved full-offering/MoR alternative; no automatic fallback. |
| Publishing/learning/commerce | Creator-owned official merchant/destination adapters | Proposed original downloads: independently approved Lemon Squeezy store and provider delivery, manual setup where APIs lack writes. Courses/memberships/Whop require separate WP27/E3 qualification. No Studio master store; Connect/splits await funds-flow/liability/country approval. |
| Messaging/prospect data | Official licensed APIs or authorized imports | Mailbox health/history/suppressions and account-specific lead/enrichment credits. The app does not contain a proprietary lead database or included domains/inboxes. |
| Media | Separately enabled official image/video providers | Exact quote/model/output parameters, rights, reservations, failed/pending charge reconciliation. No entitlement inferred from another product's affiliate/investment relationship. |
| Security | OS vault, validated RPC/IPC, brokered tools, isolated previews/parsers/workers | Permission modes are distinct from OS confinement; generated code/plugins wait for their dedicated sandbox gates. |
| CI/review | Pinned GitHub Actions, deterministic tests, advisory isolated AI review | Structural documentation/roadmap checks exist now. Runtime/e2e/accessibility/security/provider/billing tests ship with code. No untrusted PR receives model/service secrets. |
| Funding | Voluntary verified funding links; optional measured hosted services | Local code/workflows/exports stay account and paywall independent; USD 19.95 is a prepaid service-pack experiment after economics, not unlimited or a promised subscription price. Donations grant no service entitlement or merge authority. |

## User modes

The shared [harness](AGENT-HARNESS.md) qualifies each CLI/API/native route for exact models, tools, delegation and structured results; seven initial declarative roles and their reply requirements are recorded as design metadata. M3C councils and later M9A-D [single Dot](PROACTIVE-DOT.md) reuse that execution platform. AgentMail is a personal-correspondence connector; **agentphone.ai is the owner-selected phone provider** for WP65/M9C. Account/number capabilities and browser ownership/profile isolation remain separately verified.

**Local offline:** edit/import existing permitted content, inspect cached evidence and use installed exports. No studio login. Live research and remote inference visibly wait for a connection.

**Local with owned AI access:** connect an official supported CLI/API or a compatible local runtime. The account/model catalog determines available settings. Native reasoning options remain provider-specific; examples such as Sol xhigh/Astra high are requested only when the account advertises them.

**Optional hosted workspace:** deliberately transfer a compatible project to a cloud authority and use commercially permitted API workers under capped studio credits. No copied personal CLI subscriptions or browser sessions. Cloud costs, recipients and retention are disclosed.

**Paired remote control:** use a responsive phone/browser dashboard to control a chosen host with revocable project/action scopes. A sleeping host is unavailable; a native mobile app is a separate scope decision.

## Payment identities and service dependencies

[PAYMENTS.md](PAYMENTS.md) separates the payer BillingOrganization, active BusinessProject, creator MerchantConnection and buyer identity. Switching projects cannot retarget charges, portal sessions, reservations, refunds or invoices. Sign-in and connector access do not confer billing-admin/merchant authority; the [service decision](SERVICES.md) prefers Clerk for hosted identity without adding Clerk Billing authority. Studio subscription/seat access, service units and buyer access are separate state machines. Seat capacity cannot enable unshipped collaboration.

A creator-owned external checkout does not require a paid Studio plan. Provider-managed delivery can work with the desktop closed; processor-only checkout requires an accepted always-on delivery/ingress service. Hosted jobs require trusted billing/auth, commercially permitted APIs, isolated workers, durable events/reconciliation and staffed operations, not a particular cloud brand. Test/live modes, country/entity/product/AI-content approval, bank/currency, tax/refund/dispute responsibility and measured economics gate each affected service. See the [official provider decision](plans/2026-11-13-payment-provider-decisions.md).

## Integration choices that require actual account evidence

The creator's merchant country/entity, account eligibility, tax/refund responsibility, data rights, budget, provider scope and signing/funding accounts cannot be inferred from a development machine's locale. E1-E7 in the roadmap turn these into explicit activation prerequisites. Local design/build work can proceed. An unavailable service disables only its affected connector and offers an honest import/export/manual handoff where possible.

A minimal complete product-to-customer path can use documents plus one external checkout/delivery service. Optional lead data, mailboxes, image/video, client portal and collaboration are modules on the same business graph, not mandatory purchases for a first export.

## Launch approach

Publish a short, unedited idea-to-editable-product-to-export demo with its actual model, time and usage receipt. Lead with user ownership, inspectable costs and useful local operation. Recruit a small novice pilot before a broad launch; show evidence of task completion, accessibility and recovery. Release source, an honest capability matrix and signed desktop builds before promising hosted scale.

Use GitHub releases/docs/discussions, a focused launch page and useful creator/builder demonstrations. Invite contributors to bounded issues tied to work-package IDs. When funding accounts are verified, add GitHub Sponsors or Buy Me a Coffee links without gating exports or promising income. Avoid personality-led attacks and unsupported allegations; the product's reproducibility and usability make the case.

For product variety, the five M2 document families cover guides, workbooks, reusable template kits, curricula and action plans. M6B adds calculators/assessments/small tools with real domain checks. The defensible difference is evidence, editing, execution reliability and distribution fit for a specific buyer; generating a generic document is not evidence of a market.

## Coherent service and project experience

[SERVICES.md](SERVICES.md) is the service index: need/stage, authority/data, payer/cost floor and exit for each proposed dependency, plus the upstream keep/adapt/replace map. Cloudflare is optional domain/TLS/static edge; isolated Node workers need their own compatibility gate. Start with Convex private storage and existing outbox/coordination, not another database/task engine. R2 needs a measured large-asset gate. Direct essential adapters precede optional bounded Composio; every meta/proxy/execute route stays behind exact server-derived workspace/account policy.

[PROJECT-EXPERIENCE.md](PROJECT-EXPERIENCE.md) defines business-project lifecycle and guided/advanced navigation, immutable operation bindings, accessible motion and truthful zero/offline/error/recovery states. Hosted/system-browser sign-in is preferred; a desktop bridge is separately qualified without widening trusted renderer CSP/IPC. Clerk Electron beta is an alternative requiring evidence, not a replacement shell. WorkOS is an alternative identity provider only on a specific requirement/migration decision. Local content remains available without online auth UI.
