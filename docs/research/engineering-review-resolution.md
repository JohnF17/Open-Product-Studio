# Engineering review disposition

12 November 2026. Independent Astra max design review, followed by parent source checks and revision 3 integration. These are resolved planning issues or explicit implementation gates, not repaired application vulnerabilities. No application has been built or audited.

| Finding | Disposition in the current plan | Runtime evidence still required |
| --- | --- | --- |
| ER-01 dependency order | WP04-09 foundation precedes WP10-11 research; WP18 contacts precedes WP19-22 creator/campaign consumers | Actual dependency interfaces, durable budget and restore fixtures |
| ER-02 typed execution bridge | WP04 deliberately extends one typed effect and the shared transaction/outbox; ordinary edits remain independent of Git/threads | Atomicity/crash tests against the imported fork |
| ER-03 obsolete origin model | SECURITY-MODEL now distinguishes custom-scheme desktop, HTTPS browser and paired-device clients | Origin/session/IPC/RPC authorization fixtures |
| ER-04 storage/authority lifecycle | WP07 snapshot/asset/migration rules; WP34 ownership fencing; transport replay and business retention separated | Restore, interrupted migration and old-writer rejection |
| ER-05 untestable whole-product scope | Stable capability/package IDs, complete examples for five document families, named API/free/local/extensions/interactive/collaboration gates | Independent family/adapter acceptance; external feature census reconciliation |
| ER-06 overloaded distribution | WP27 capability decision, WP28 publication, WP29 merchant events and WP30 fulfillment have separate interfaces | Destination-specific sandbox/live receipts and buyer-access tests |
| ER-07 no inbox lifecycle | WP25 cursor/gap/reply/sender lifecycle precedes WP26 approved dispatch | Message-event races, suppressions, sender health and sleep behavior |
| ER-08 media/creator provenance | WP19 separate caption/mirror/frame/ASR provenance; WP23-24 expiring quotes, rights and async-cost outcomes | Accessible audio coverage, provider compatibility and rights review |
| ER-09 conflicting dated research | ROADMAP defines spec precedence and preserves baseline pins; local models optional and hardware-dependent | Per-provider requested/effective identity and drift checks |
| ER-10 diffuse acceptance | Every package names owner/reviewer roles and evidence; crosscutting checks embedded; versioned evaluation rubric | Real assigned reviewers, exact-revision results and novice pilot |
| ER-11 unscheduled external gates | E1-E7 name release, connector, commerce, service economics, funding, rights and platform prerequisites | Real accounts/contracts/eligibility/signing, unit economics and maintenance staffing |

Source checks confirmed the custom-scheme renderer in pinned [remote internals](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/remote.md), WAL/NORMAL in [Sqlite.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/persistence/Sqlite.ts), and the typed transaction/effect surfaces in [EventSink.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/EventSink.ts) and [EffectWorker.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/EffectWorker.ts). FULL durability and `studio.execute` are proposed downstream changes, not current upstream behavior.

The [canonical roadmap](../ROADMAP.md), [implementation contracts](../WORK-PACKAGES.md), [architecture](../ARCHITECTURE.md), [security model](../SECURITY-MODEL.md) and [CI](../CI.md) contain the integrated decisions. The structural check cannot certify the technical truth of a reviewer report or an acceptance file.
