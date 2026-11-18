# Fork ownership, licenses and desktop distribution

## Selected foundation

Recommended source baseline: [pingdotgg/t3code at 7d71f852a8edd298ffde67c295760c286a71a27c](https://github.com/pingdotgg/t3code/tree/7d71f852a8edd298ffde67c295760c286a71a27c). The repository currently contains our planning foundation, not an imported working fork. The first implementation task prepares the source, preserves history/notices, establishes the clean baseline and separates product identity.

The [upstream MIT license](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/LICENSE) permits modification/distribution with its notice conditions. Preserve the T3 Tools Inc. copyright/permission text for substantial upstream code, original file notices and packaged license viewer. Distinct branding must not imply endorsement.

Our existing Apache-2.0 planning material remains separately identified. When importing the fork, use the upstream root license for upstream code and retain the Apache text under a clearly scoped license file for our original material. Add an exact directory/file scope map and third-party notices; do not replace MIT notices with our Apache license or claim to have authored upstream code. Resolve the precise downstream licensing layout before publishing code.

Keep `scripts/sync-third-party-license-notices.ts` and review generated notices against the actual shipped dependency graph, including separately licensed embedded code and native helpers. A source license does not grant rights to provider accounts, trademarks, proprietary CLIs, fonts or paid-product assets. The [payment design](PAYMENTS.md) preserves useful account-free local code/CLI/export use while optional hosted jobs require independently licensed commercial API use. Do not resell consumer CLI subscriptions, pool consumer OAuth or confuse a fork license with merchant/product approval. Studio subscription/seat billing, service-unit consumption and creator commerce have separate provider agreements; neither sponsorship nor a paid plan grants upstream merge or release authority.

## Identity separation before an installable build

Change app ID/name, executable/publisher, icons, protocol handler, app-data location, keychain namespaces, crash/telemetry destinations, update feed and cloud configuration. Do not inspect/migrate private T3 state or silently share its environment identity. Keep internal package names where harmless; broad branding renames create needless merge churn.

Audit inherited Clerk/relay/release configuration. Local mode cannot depend on upstream service credentials. Disable inherited telemetry until its destinations/content/consent are reviewed. Never ship a client that upgrades to upstream T3 binaries.

## Packaging and updates

Retain the existing [desktop build script](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/scripts/build-desktop-artifact.ts), Electron Builder integration and `electron-updater` boundary. Review Windows server-ASAR/native-helper handling rather than assuming a web build is a desktop build.

First gate: locally package and install on Windows x64 with synthetic data and independent application identity. Public Windows release requires verified signing/publisher setup and a tested installer. macOS requires platform signing/notarization; Linux artifacts require their own native tests. Do not advertise unsupported platforms just because a build target exists.

Own HTTPS update feeds and stable/beta channels. Test update provenance/signature failure, interrupted downloads, schema migration, active-run deferral and restore. An older executable may not read a newer database; rollback requires an explicit compatible backup/recovery plan. Freeze or record staged dependency resolutions where upstream tooling does not use the lockfile.

Signing credentials, production domains and release secrets come from the owner's approved accounts through a secret-entry mechanism. Local development/package verification proceeds without inventing them. No release/account purchase is authorized merely by choosing Electron.

## Maintenance

Keep untouched upstream tracking refs and an explicit downstream patch series. Record upstream/downstream revision, schema and provider compatibility per release. Integrate reviewed batches through staging, prioritize security fixes, preserve upstream checks and add dashboard/business acceptance tests. Do not auto-merge upstream changes or run third-party contributor code with release secrets.

Ownership areas: provider compatibility, Electron packaging/update infrastructure, domain/research workflows, security and product accessibility. A fork saves reconstruction of a mature platform but creates an ongoing upstream review obligation.

## Required upstream intake process

Configure this at WP01/WP02 import, before public alpha. It is not live monitoring today: this repository has no imported application, configured remote watcher or running update agent.

Use `origin` for our repository and `upstream` for official T3. Preserve upstream ancestry/remote-tracking refs and protect published `main`. Candidate batches go through `integration/upstream-<sha>` and a reviewable PR. The default is frequent **reviewed upstream merges**, keeping the shared runtime close to upstream. Keep studio changes additive and avoid broad formatting/renaming of preserved files. Do not overwrite our branch with a Sync Fork action or publish upstream binaries through our feed.

An urgent fix can be backported with its complete prerequisite set and regression test while a larger migration is pending. Record upstream/downstream commit IDs and reconcile it during the next merge. Selective cherry-picking does not replace review of the remaining upstream changes.

### Detection and ownership

Assign a primary upstream/security maintainer and backup before public release. Repository-owned read-only automation checks upstream commits/releases and public advisories daily; ordinary changes receive weekly human review. Relevant critical/exploited fixes interrupt the feature queue rather than wait for the weekly batch. Publish response targets only when staffing supports them.

Watch our actual shipped dependency graph independently: Electron/Chromium/Node, transitive packages, native binaries, unlocked staging resolutions and separately updated CLI/provider protocols. Configure applicable Dependabot/Renovate, dependency review, code/secret scanning and private vulnerability reporting when the remote exists. Public feeds cannot reveal undisclosed upstream issues or establish that no vulnerability exists.

Persist last successful check time, last reviewed SHA, adopted/backported revisions and unresolved items. Failed monitoring or an overdue integration is visible maintenance debt, not "no updates."

### Explicit decisions and evidence

At WP01 create `docs/upstream/manifest.json`, an intake ledger and `docs/PATCHES.md`. Record exact upstream/downstream SHAs, license digest/notices, resolved dependency/SBOM hashes, schema/protocol versions, supported platforms, ownership and acceptance evidence. The researched target revision is not marked adopted before the import/build gate passes.

Each commit/PR/advisory gets an owner, affected components, local applicability, prerequisites and one decision: `adopt`, `backport`, `defer` or `not-applicable`. Keep reasons, mitigation, review date/blocker, downstream commit and test evidence. A hidden UI feature is not evidence that its vulnerable code is unreachable. Not-applicable decisions require route/capability evidence.

Track all changes; select which capabilities to activate. New tools, native routes, permissions, account/cloud links, telemetry and release defaults do not become enabled automatically. Unwanted capabilities are disabled server-side, not merely hidden. Source presence, UI availability and permission remain distinct. General fixes may be contributed upstream through separately authorized reviewed PRs, reducing future divergence.

### Candidate validation and promotion

1. Inspect code, migrations, dependencies/licenses, build hooks, native artifacts, new tools/scopes and inherited service defaults. Intake jobs treat contributor text as data and never execute fetched code with publishing/signing credentials.
2. Run preserved upstream checks plus studio tests on the exact candidate: models, native-tool restrictions, delegation/cancellation, result acceptance, approvals, browser ownership, secrets and dormant Dot/channel state.
3. Test populated database/assets, interrupted migrations/updates, restore, queued/active work, protocol compatibility and installers on supported systems. A merge or successful web build is insufficient.
4. Compare startup, memory, UI responsiveness, queues and affected export/job profiles on declared hardware/repeatable inputs. Performance changes cannot remove security checks to improve a benchmark.
5. Independently review the exact revision/evidence, stage signed beta/canary artifacts on our own feed, then promote the identical accepted artifacts to stable. Publish adopted revisions, fixes, migrations and limits. Pause bad rollouts; database rollback needs a compatible verified backup, not just an older executable.

Application/data/vault identity, telemetry and update endpoints are permanent regression gates. AI may summarize/classify changes and draft/review ports; it cannot approve its own merge, alter required checks or sign a release. Monitoring, build/test and signing/promotion have separate authorities.

## License and redistribution gate

Checked 12 November 2026: the cached researched baseline and [current upstream LICENSE](https://raw.githubusercontent.com/pingdotgg/t3code/main/LICENSE) state MIT, copyright T3 Tools Inc. The [MIT text](https://opensource.org/license/mit) permits modification, merging, redistribution and selling copies, subject to its notice conditions. Our fork and optional commercial hosting fit that permission in principle; this does not certify every future dependency, asset or integration.

| Material | Required handling |
| --- | --- |
| Imported and modified upstream code | Preserve MIT copyright/permission and applicable file notices; keep upstream MIT text at root after import |
| Existing original planning material | Preserve Apache-2.0 in a scoped license file/path map; do not relabel upstream code Apache-only |
| New studio code | Declare license per package/path and review actual combined distribution; branding does not determine license |
| Dependencies/native helpers/fonts/icons/embedded code | Inventory exact versions/files, applicable licenses/notices and redistribution conditions, including resolved packaging dependencies |
| Provider CLIs/models/services | Separate licenses, terms, account/credit/commercial rights; MIT does not convey subscriptions or resale rights |
| Brands/proprietary assets | Use our own cleared identity/assets; copyright permission does not imply endorsement, trademark rights or access to private prompts/code |

Verify notices in source **and shipped installer/ASAR/worker/container contents**, with bundled third-party notices and an About/licenses surface. New/changed licenses block adoption until reviewed. Preserve source/license evidence for every adopted revision and evaluate later releases individually. The current Apache planning root is not a claim that T3 code becomes Apache-only. This is a compliance process, not a blanket legal warranty.

Maintenance references: [GitHub repository advisories](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/about-repository-security-advisories) and [repository security configuration](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository). Verify applicable account/plan features during remote setup.

## Component versus release evidence and trust lifecycle

The [service map](SERVICES.md) records the benefit and WP owner for each retained/adapted/replaced T3 surface. WP02 accepts isolated development packaging and upstream-schema fixtures without waiting for later Studio data. WP07 then supplies populated-data upgrade/restore integration evidence; E1 signing/promotion and that restore evidence remain mandatory before public activation. Do not add reverse dependency edges or mark those later results passed early.

Signed distribution metadata must carry expiry, monotonic generation and key/version revocation; an old valid signature alone is insufficient. Test revoked publisher key, stale offline metadata and rollback. Publish an independently authenticated trust-root recovery procedure (for example a separately verified release channel/manual reinstall with authenticated new key) and revoke compromised keys without a permanent signature bypass. Local content inspection/edit/installed export stays usable when affected execution trust expires. WP39/53 apply the same policy to extensions and provider-route qualification; changed binaries/runtime/tool descriptors invalidate affected qualification receipts.
