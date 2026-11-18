# Platform responsibilities and transaction boundaries

Engineering design supplement, updated 2026-11-13. This names responsibilities that must remain explicit as feature coverage expands. The final roadmap assigns each capability a work package and gate; this document is not evidence that any service is implemented.

## One product, separate authorities

The Electron dashboard is the user's unified interface. A unified interface does not mean one process, database or permission grant owns every operation.

The **local execution host** owns personal CLI sessions, local files, SQLite state, local tool grants and local workflow recovery. The **optional cloud business service** owns authenticated workspaces, explicitly uploaded/shared content, hosted jobs and service billing. A **customer delivery surface** serves published products and enforces buyer access. An **external connector** owns its provider-native API behavior and service terms. Every cross-boundary action uses validated scoped contracts and durable receipts.

## Four financial concepts

1. **Personal AI-provider usage:** charged/limited by the user's CLI/API account. The platform must not call it free merely because Studio service units are not debited.
2. **Hosted studio services:** recurring storage/service/seat entitlements and separate prepaid inference/service units. A BillingOrganization owns server-side billing; reserve/settle bounded consumption under exact unit/rate snapshots. Packs are not money or a withdrawable wallet.
3. **Creator product sales:** customers buy a published product through a selected merchant/marketplace/payment processor. Orders, fulfillment and entitlement are separate from our AI-credit balance.
4. **Partner compensation:** an agreed creator/operator split, tracked estimates or actual processor-supported transfers. A percentage field does not implement payouts, tax withholding or a legal partnership.

[PAYMENTS.md](PAYMENTS.md) defines these flows. The active project, payer organization, creator merchant legal entity/account/store and buyer identity have distinct IDs and authorization. Switching project cannot change an in-flight checkout, portal, reservation, merchant refund or invoice. An actor selects an authorized binding and the server rechecks it at dispatch. Hosted sign-in provider choice does not determine financial authority.

Never mix these balances or infer a right to hold other people's money. Select the merchant model only after owner country/entity/provider eligibility is known. Prefer external checkout/merchant infrastructure and verified webhooks initially. Native payment processing, marketplace custody and automated split payouts need their own agreements, accounting, fraud/dispute operations and release gate. Do not label an invoice, payout estimate, provider transfer or in-transit payout as confirmed bank receipt. Stripe ordinary processing versus separately approved Managed Payments, Paddle MoR, creator-owned Lemon Squeezy stores and Whop tax modes have different duties; see the [source decision](plans/2026-11-13-payment-provider-decisions.md). No global all-tax-handled promise or master-store resale follows from a destination integration.

## Published products and customer access

A published product is a versioned artifact plus offer/listing, delivery configuration, price/terms and access policy. A publication receipt identifies its exact destination and artifact versions. An order/event is verified with the provider before changing customer access; idempotent processing handles duplicates and out-of-order events.

Downloads, courses and memberships have different entitlement rules. A downloaded document cannot reliably be revoked after delivery. A hosted course can enforce enrollment and progress; subscription access can expire according to disclosed terms. A refund may alter access prospectively but cannot pretend to erase files from the buyer's device. Source rights and necessary attribution travel with delivered content.

Keep draft previews distinct from public pages. Public content cannot reach the creator's local execution engine or secrets. Sanitize customer-visible HTML, isolate media processing and use scoped asset URLs. The customer's account/authentication is not automatically the creator's AI-provider account or their desktop-device grant.

## State ownership and synchronization

Choose one authority for each aggregate and write lane. Local-only business projects are authoritative on their host. Explicit cloud transfer creates a cloud-owned revision with a stable domain ID and origin metadata. Shared editing must use version preconditions or a designed merge protocol; silently writing both stores as masters is unacceptable.

Merchant orders and provider-native buyer entitlements remain authoritative at the external provider; studio local/cloud copies are verified projections and can be stale. Studio subscription/service-seat projections and the service-unit ledger are trusted cloud-owned records for the explicit payer organization. A paid seat does not grant a role, activate WP42 before acceptance or control buyer access. Studio plan expiry cannot revoke provider-paid buyer delivery or existing local exports. No cash balances or subscription credentials migrate with a project. Provider-native message IDs, contact IDs and order IDs are mappings, not our global domain identities. A revoked membership/device loses future authority without deleting legitimately retained historical artifacts.

Preserve domain event/provenance retention independently of transient model stream replay. Backups must cover the database and referenced asset hashes consistently. Deletion/retention policy distinguishes private research, user-uploaded originals, published content, transaction records, logs and backups.

## Payment events, cancellation and retention

Use provider-specific raw-body verification, signed timestamp checks where supported, durable inboxes and semantic once-only purchase/usage/refund effects. Client redirects never authorize grants or charges. Reconcile delayed/reordered events against provider history; refund-before-payment or a stale renewal cannot resurrect access. Atomic reservations/refund freezes prevent double spend and refund/spend races. Unknown provider work remains a bounded pending reservation. Chargeback losses after consumption are finance records, not negative spendable service units or permission to seize merchant earnings.

Subscription cancellation, job cancellation, refund completion, buyer access revocation and profile deletion are separate transitions. Preserve local files and authenticated export/read grace; disclose account-specific finance/dispute retention, backup expiry and provider-held data/renewals. Tombstones and restore reconciliation prevent duplicate grants or resurrection of deleted content. Closed-desktop delivery and scoped buyer URLs remain provider/isolated-service duties.

## Connector contracts

Each connector declares read/draft/write capabilities, auth scopes, destination, rate/cost units, idempotency support, webhook verification, pagination, data rights and known limitations. A capability shown in a vendor UI is not proof that its API exposes it. Unsupported operations may use a transparent manual export/handoff until an official adapter is available; never fake successful automation.

Requests bind tenant/project, actor, artifact/input revision, external destination, grant and budget. Secrets remain in the appropriate host/vault, with rotation/revocation independent of app sign-in. Dynamic provider metadata is validated and not treated as a permission grant. Commercial free-tier availability is not inferred from compatibility with an API format.

## Analytics and evidence

Keep observations, estimates and causality claims separate. Imported orders, refunds, clicks, replies and views are source-stamped measurements. Show gross revenue, refunds, fees and net/payout estimates with their definitions. Missing data is not zero; an attributed sale is not proof that one email caused it.

Recommendations can propose experiments and next actions across the same business graph. They cannot fabricate a conversion rate, guaranteed demand, audited result or market score. Community success stories are opt-in statements with clear provenance, not automatically verified income. Human coaching and professional review are service roles, not features created by naming an AI agent after a person.

## Current authority joins and exit

[SERVICES.md](SERVICES.md) specifies one Convex hosted authority/private storage/coordination service and a preferred Clerk identity adapter with vendor-neutral domain contracts. Cloudflare edge, optional Composio and any later R2 storage do not become parallel business authorities. Direct billing retains the separate service-unit ledger; Clerk identity does not add Clerk Billing.

Connection setup derives exact provider/account/environment/workspace/resource/generation from an authenticated actor and trusted provider verification. Events use trusted subscription/account mappings, not payload project IDs or the active UI project. Personal, creator and Studio-billing ingress/replay namespaces remain separate. Every meta/proxy/direct connector route passes the same broker.

Transfer fences new dispatch and accounts for provider-held schedules, native runs, leases and Unknown effects; retain one custodian or prove cancel/reconciliation before conflicting destination action. Preserve logical IDs and unresolved fences for late receipts. Credentials and approvals are reauthorized, not copied. Cloud lapse stops only affected service work; legitimately owned retained content has authenticated export/handback without new purchase, proposed 30 days with terms finalized before activation. Revocation/outage differ from lapse; cached data is dated, offline forks get new IDs and old writers never resume automatically.

Managed restore requires a current deletion/revocation journal outside the old snapshot. Historical content-only recovery without it explicitly cannot promise knowledge of newer deletions and never restores action authority. First-activation operational support and provider-side shutdown apply to each connector independently; a late hosted milestone cannot protect an already enabled buyer/mail/phone channel.
