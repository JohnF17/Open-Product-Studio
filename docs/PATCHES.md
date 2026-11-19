# Downstream patch and upstream intake ledger

| Revision | Decision | Scope and evidence |
| --- | --- | --- |
| `7d71f852a8edd298ffde67c295760c286a71a27c` | Imported for evaluation | First parent of `8d14fde6896b3636915e38849416e1fedbec4b6c`. The source remains under test. [Import evidence](acceptance/WP01.md) |
| `978587fc31d3c75d3f2fe1781de3c07b3a896f64` | Preserve original Studio plan | Second parent of the import. The patch preserves Studio root instructions, both license scopes and the workbook exclusion. [File manifest](../LICENSES/planning-manifest.json) |
| `a93e61a3438d43eeee99da857270da2222767cd5` | Awaiting triage | Official main sampled on 2026-11-18. Compared with the pin using local Git objects. The candidate contains 1,806 subsequent commits and 3,935 changed paths. This is an inventory. Security advisories, compatibility, individual changes and service defaults still require review. |

For later changes, record the upstream revision, owner, affected routes, prerequisites, decision, downstream revision and test evidence. A read-only inventory can identify a candidate before somebody has reviewed it for adoption. [Update policy](UPSTREAM.md)

The November 19 local run of the scheduled workflow fetched official main at `26b872b46a4dd7a96dd1aaab57bc5a4fb4cef25f`. It counted 1,990 subsequent commits and 4,141 changed paths, returned five recent releases and found zero published advisories in that repository's advisory feed. The candidate awaits triage. The feed excludes dependency advisories and private reports.
