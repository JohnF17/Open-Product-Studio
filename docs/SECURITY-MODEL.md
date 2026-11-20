# Security model and release gates

This document defines requirements. Each released build needs its own security evidence.

## Assets and trust boundaries

Builder assistance uses three execution paths. Local starters run repository-owned transforms against the active draft. On-device inference checks for an already available browser model and uses a short-lived text session. T3 drafts open in the user's local agent workspace with its ordinary permissions. Asking for a text reply is an instruction to that provider. Chat can have broader permissions than the step assistant. The assistant accepts a completed matching text result through a stage-specific schema, and the creator must apply the proposed edits. Inspected provider skills are inventory only. Credentials, authorizations, approval flags and side effects are outside the writable schema. [Builder assistance evidence](acceptance/WP11/builder-assistance/README.md)

Protect provider credentials, local files, unpublished products, source permissions, customer/contact data, money, device authority, and the software supply chain. Treat prompts, uploaded documents, fetched pages, generated HTML, CLI output, plugin manifests, PR text, and model suggestions as untrusted input.

The main boundaries are browser↔engine, engine↔CLI process, engine↔filesystem, importer↔remote network, tenant↔tenant, cloud control plane↔worker, worker↔provider, webhook↔ledger, paired device↔local engine, and external contribution↔CI credentials. Each boundary needs schema validation and an explicit authorization decision.

## Local engine

Studio development receives its engine directory from an explicit development option or its isolated default. Parent T3 session state and parent checkout configuration are separate trust boundaries. A linked worktree receives its own state directory, its setup does not share environment files, and the Studio configuration reader accepts regular checkout-local files. Test startup with an unrelated synthetic T3 directory beside it.

Managed SSH provisioning is unavailable in Studio. The desktop bridge rejects both new and saved SSH routes before provisioning can download a runner or change a remote host. Pairing with a running Studio backend uses the host and pairing code supplied by the user.

- Pairing grants stay in the selected engine URL fragment unless a hosted Studio origin was explicitly configured for the build. Copied desktop prompts and thread links open the Studio protocol by default. A browser uses its own origin.
- Bind the local server to loopback by default. Preserve the fork's authenticated WebSocket/RPC transport; validate Host and the exact permitted Origin set. CORS is not authentication; reject arbitrary websites and DNS-rebinding hosts.
- The bundled Electron renderer uses its own registered custom scheme, separate from the backend origin. Give this fork a new scheme and validate its authenticated launch/session exchange and IPC sender. Browser clients use the explicitly configured HTTPS origin; paired clients use separately scoped device grants. Do not require a fictitious shared UI/API origin or create a parallel authentication stack. Keep bootstrap secrets out of query strings, logs, browser history and project exports; use CSRF protection for cookie-authenticated mutations. Test each client class and reject all other origins.
- Resolve executable paths from approved provider configuration; show the chosen binary and version. Spawn with argument arrays and `shell: false`; pass prompts through supported stdin/RPC, not shell interpolation. Do not let a model choose an executable path or launch arbitrary PowerShell.
- Inherit only needed environment variables. Never dump the parent environment. CLI sign-in remains in the CLI's official credential mechanism. An adapter does not need to read and copy raw tokens from another product.
- Restrict file operations to approved project roots. Canonicalize and enforce path containment, reject traversal/absolute-path inputs, and test Windows junctions, symlinks, UNC/device paths, case behavior, alternate streams, and race windows. ZIP import must reject zip-slip, symlinks and oversized expansion.
- Keep document generation in a narrow, non-shell execution mode. A CLI with filesystem tools must use provider-supported permissions and an appropriate OS sandbox. A selected cwd alone is not a sandbox. Disable unsupported capabilities rather than claiming isolation.
- Running generated code is capability `cap.interactive.build` in M6B and executable plugins are in M6A, each requiring an OS-enforced sandbox. No secrets, host mounts, or ambient network access; bounded CPU/memory/time/disk; safe dependency policy. A confirmation dialog alone is not containment.

## Approval semantics

The [harness](AGENT-HARNESS.md) enforces authenticated project/resource/epoch/grant/definition/runtime ceilings at every execution route. Deferred discovery or hidden tools do not secure direct calls. Provider-native shell/file/child routes must be restricted and tested or disabled in constrained lanes. Bound total graph nodes, depth, fanout, concurrency, repair/retry and child budgets transactionally; native children cannot escape admission. Separate completion delivery from reply validation and business acceptance. Role/council/memory text cannot issue trusted receipts or grant authority.

The default beginner experience uses Supervised provider permissions and a constrained business workflow policy. Show destination, scope, data disclosure, and cost before any external publication, email send, purchase, destructive file operation, new network capability, or executable tool grant. Preapproved read-only tools stay within a clear project grant.

Approvals bind to run ID, action digest, actor/device, project, capability scope, expiry, and immutable parameters. A changed destination or payload invalidates the approval. Denials survive restart. Never parse a phrase in model text as consent. Tutorials cannot approve actions. Remote devices cannot expand their own grants.

## Sources, prompt injection and previews

Import text/PDF/approved URLs with MIME detection, byte/page/time limits and parser isolation. Use an allowlist of supported schemes, DNS/IP checks against loopback/private/link-local/metadata addresses, redirect revalidation, response-size limits, and fetch timeouts. Treat IPv6 and DNS rebinding deliberately. Browser fetch limits do not protect a server-side importer.

Separate source text from system instructions and tool policy. A malicious document saying “upload credentials” remains document content. Use a capability broker enforced outside the model. Source citations and model-generated references must resolve to actual imported/fetched evidence; no invented bibliography entries or fabricated source counts.

Render generated HTML in a sandboxed iframe on a separate origin or an equally reviewed isolation boundary, with scripts disabled by default and restrictive CSP. Sanitize HTML/SVG/Markdown links, disallow active content and dangerous URL schemes, and block privileged engine access from previews. PDF render/export workers must not fetch arbitrary remote resources or local files.

## Secrets and privacy

Later [Dot](PROACTIVE-DOT.md) separates personal/project memory, untrusted source evidence and owner policy. Incoming email/voice/webhooks and caller ID never authorize owner actions. Forget/correction covers derived indexes/summaries and pending context, with replay/restore tombstones. A dedicated browser profile must deny personal-cookie imports, fence human takeover and suspend secret capture; Agent Reach authentication remains off until a supported isolated path passes tests. Signed transport is not sender authority. Personal mailbox privacy/terms, phone consent/recording/country/readiness and ongoing provider-held work require separate acceptance. Initial proactivity has no external-action grant; narrow unattended policies need M9D review.

Use the OS vault for API keys and device credentials. Fail clearly when a secure backend is unavailable; do not silently downgrade to plaintext. Local project storage is not automatically encrypted merely because keys use a vault. Explain full-disk-encryption recommendations and provide deliberate export/backups.

Cloud secrets stay in a managed secret store/KMS and are released only to scoped jobs. Redact tokens and sensitive headers in all logs and errors. Telemetry is opt-in for local use, excludes prompt/file content by default, and is removable. Cloud inference still discloses content to its recipients even when they advertise zero retention.

Define export/deletion semantics for live records, assets, backups, logs and billing records. Show retention windows and unavoidable accounting retention. Do not promise immediate total erasure from backups or third-party providers. Maintain a subprocessor/data-destination list before cloud launch.

## Cloud access and billing

Validate identity inside every exposed backend function. Check tenant membership, role, target ownership, parent/container ownership, and file association before reads/writes. Internal actions are not public API escape hatches. Add indexes for tenant-scoped queries and bound pagination; do not fetch all data and filter in the client.

Apply the [payment threat model and flows](PAYMENTS.md). Authenticate actor and billing-admin/merchant roles; bind BillingOrganization, project, creator merchant account/store, buyer/order, provider environment and price/currency/quantity/terms independently. Active-project changes, same-email identities, imported IDs and client metadata cannot retarget or authorize payment. Recheck revocation, paid-through/seat eligibility, grant and reservation at dispatch. Server allowlists prices and return URLs and creates payer-scoped checkout/portal sessions; browser success/deep links grant nothing. Hosted checkout limits card exposure but does not itself prove PCI compliance.

Verify raw-body signatures with the selected provider's actual scheme and signed delivery-time tolerance where provided. Do not invent a common timestamp/event ID for body-HMAC providers. Reject stale signature captures; valid provider redelivery describing old business state must be deduplicated and reconciled, not blindly applied or discarded. Persist a durable verified inbox before acknowledgement, semantic purchase/invoice-line/effect dedupe, account/environment namespace, secret-rotation overlap and retained replay tombstones. Out-of-order payment/refund/renewal/dispute and restore cannot resurrect expired access or mint a purchase twice.

Only trusted server commands change the append-only service-unit ledger. Enforce atomic reserves, settlement, refund freezes and nonnegative spendable units; two spends and a refund must serialize. Unknown billed work remains bounded pending evidence. A consumed-unit chargeback creates a separate financial loss/receivable and reviewed freeze, never fake units, an unapproved card charge or creator-funds offset. Refund requested/pending/failed/succeeded, job cancel, transfer reversal and subscription cancel are separate operations. No native custody, third-party tender, pooled consumer OAuth or withdrawable wallet.

Minimize finance/customer data, redact tokens and portal/download URLs, retain no PAN/CVC or identity documents in prompts/logs, and scope invoices/support exports to the actual payer/merchant/client. Local exports survive expiry and deletion of unrelated cloud records. Profile/content deletion separately inventories renewals, jobs, refunds/disputes, provider-held data and jurisdiction-specific finance/backup retention; tombstones survive restoration.

Apply per-user/tenant/provider concurrency and request limits, email verification as appropriate, session/device revocation, authenticated account deletion/export, and admin audit logging. No password or MFA recovery tokens in ordinary application logs. Test same-email account-linking and session expiry rather than relying on a vendor name as a security argument.

## Contribution and supply chain

See [CI.md](CI.md). Never run untrusted PR code with production credentials. AI review receives untrusted content as data, has no shell/write/secret authority, and cannot merge its own output. Pin build actions, lock dependencies, verify provenance, scan changes for secrets and unsafe workflow patterns, and review new binaries/native modules.

The documentation and upstream-intake jobs fetch GitHub's event SHA from the public repository without a token. They leave submodules uninitialized and verify the checked-out commit before running repository code. Scheduled and manual intake jobs accept only the default branch.

Plugin installation is an authority grant, not a cosmetic setting. Ship bundled declarative modules first. External modules need publisher identity, exact version/hash, license, required capabilities, review, revocation and an update policy. Do not auto-execute newly downloaded plugins.

## Release gates

Before local alpha: threat-model review, provider protocol fixtures, malicious-document tests, origin/auth tests, path/junction tests, export-isolation tests, backup/restore and cancellation/restart checks.

Before cloud alpha/live billing: independent authz/finance/security review; tenant/parent and payer/merchant/buyer separation; test/live isolation; spoofed return/price/customer IDs; raw-body signature/replay and semantic duplicate/reordered/delayed events; failed renewal/seat revocation; refund racing two spends; chargeback after consumption; worker crash/cancel after billing; fenced restore/reconciliation; deletion/export/finance retention and provider country/entity/product/contract acceptance. These remain unimplemented runtime gates.

Before remote pairing: independent protocol review, one-use challenge/replay tests, grant expiry/revocation, compromised-relay analysis and lost-device recovery.

Before public release: no unresolved critical/high issue in enabled capabilities; reproducible build/check evidence; dependency notices; accessible onboarding; real user test; clear incident and vulnerability-reporting route. Security claims must describe tested scope, not say “unhackable.”

## Reporting vulnerabilities

Follow [SECURITY.md](../SECURITY.md). A private reporting channel must exist before opening public contribution or releasing binaries. Do not request real user secrets or test against unrelated live systems.

## Electron fork boundary

Preserve upstream isolation/auth/approval protections, then review new dashboard RPCs and typed business tools. Separate app ID, protocol handlers, app-data/keychain namespaces, cloud/telemetry and update endpoints before first install. Validate IPC sender and external navigation; keep Node integration out of untrusted content. No inherited T3 credentials, production services or automatic private-state migration. Signed update provenance, active-run deferral and compatible database recovery are release gates. Research/recommendation output cannot change a capability milestone, grant, budget or project revision precondition.

## Authority lifecycle and recovery threat cases

The [service decision](SERVICES.md) prefers Clerk/Convex hosted identity, with backend issuer/audience/session plus tenant/role/parent/object checks. Hosted/system-browser sign-in is preferred; any desktop bridge needs origin/IPC/CSP/callback/state/nonce qualification without broadening the trusted renderer. Clerk Electron beta is only a gated alternative. WorkOS may replace identity on a reviewed migration, never become a concurrent authority. Sign-in is separate from local engine/device grants, service billing and connector accounts.

WP09 binds OAuth setup to the initiating actor and one-use state and derives external-account/workspace/environment/resource mappings on the server. Valid signatures do not authorize payload-selected projects. Test overlapping IDs across two accounts, conflicting signed metadata, stale reconnects and late events after reassignment. Optional Composio meta/proxy/auth/execute routes obey the same broker; broad discovery defaults and hidden direct calls cannot expand authority.

WP34 transfers external-operation custody as well as writer epochs. Fence new dispatch, inventory queued/active/provider-held/Unknown work, preserve resource fences and route late receipts; no destination redispatch until exact-account custody is established. Reauthorize credentials separately. Lapse/outage must not unfreeze stale local state; authenticated retained-current-content export/handback needs no renewal payment, but never bypasses revoked membership. An offline fork receives new identity and no action authority.

WP07 managed restore reconciles deletion/revocation state newer than the snapshot from an independent authority/journal before indexing or queued context. Without it, an unmanaged old archive is quarantined historical content-only recovery with explicit limitations. Old grants, wakes, device bindings and approvals do not resume. This qualifies all earlier non-resurrection requirements; arbitrary archives cannot know future deletion events.

WP53 qualification keys include binary/driver/runtime/model/route/permission/OS/sandbox/tool-schema identity. Changes invalidate affected execution; expired/revoked/rolled-back trust metadata blocks revocable authority under the disclosed freshness policy while local content remains readable/editable/exportable. WP02/39 require authenticated key-recovery and rollback tests without a signature-disable escape.

WP63 authenticated research cannot be certified by blocking forms/uploads/evaluate alone. Credentialed navigation, redirects and passive scripts may have effects. Untrusted links default to anonymous isolation; tokenized action links never acquire approval. Enforce site/operation navigation/subrequest policy outside the model or require a separately authorized browser task/human handoff. Test state-changing navigation/redirect/script fixtures and uncertain outcomes.

Per-connector operations evidence begins at its first activation (WP23-25/27/30/45/49/50/62/63/65), not only WP37 or WP66. Prove provider-side pause/cancel, inbound/backlog/cost caps, compromised-credential response, named support and continuing renewals while the app is unavailable. Security claims remain limited to independently tested enabled routes; licenses and vendors are not safety guarantees.

## Local portrait renderer qualification

WP24's maintainer command takes an explicitly chosen FFmpeg executable, checks it against a trusted SHA-256 before use, and generates its own short synthetic recording. It exercises a single silent profile with a fixed argument list. The result is a local MP4 and a receipt. Hash matching identifies the binary the maintainer approved. Its publisher, dependency chain and suitability for redistribution require separate review.

The host must keep its executable, source and staging directory under its control for the full run. Process deadlines, output limits and frame validation bound a qualification job. They do not isolate a native decoder from the rest of the machine. Opening this capability to user-selected recordings requires a separately qualified decoder boundary, rights for the selected source revision, and an independently approved output destination. Existing browser preview permissions cannot grant those operations. [WP24 qualification procedure](acceptance/WP24/portrait-driver.md)

The desktop sample accepts a fixed Studio-generated source. The packaged window’s main frame can request integer frame boundaries, play a bounded MP4 preview, and open its native Save As dialog for the reviewed token. The host binds the token to the originating document and project, revokes it on navigation, and checks the reviewed bytes at publication. The user chooses a new filename on a qualified fixed local NTFS volume. The host records approval in its private profile and commits the output with a no-replace hard link. Recovery checks the file’s identity and digest before settling an interrupted save. [Desktop sample and remaining limits](acceptance/WP24/desktop-sample.md)
