# Contributing

For current scope, read [the product proposal](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [security model](docs/SECURITY-MODEL.md), [canonical roadmap](docs/ROADMAP.md) and [work packages](docs/WORK-PACKAGES.md) before proposing work.

## Scope and evidence

One PR should solve one reviewable problem. Explain the user-visible change, the reason, the boundary affected, and the validation performed. Separate mechanical refactors, dependency upgrades, and behavior changes unless their dependency is essential. Large features begin with an issue or design proposal; straightforward fixes need no ceremony.

Do not submit copied proprietary prompts, courses, workbooks, recordings, screenshots, customer lists, secrets, or content you lack permission to distribute. Public accessibility does not establish reuse rights. Attribute third-party source and preserve license notices. Record new dependency licenses and operational/data destinations.

## Rules for human and AI-assisted contributions

- The submitter is accountable for every line, including generated code and tests. State material AI assistance, model/tool if known, and which checks a person actually reviewed. AI use is welcome; undisclosed uncertainty and invented evidence are not.
- Read the applicable instructions and neighboring code before editing. Keep provider, storage, domain, and presentation boundaries intact.
- Never introduce silent model substitutions, unbounded retries, hidden external calls, automatic paid actions, or claims of free unlimited usage.
- Validate untrusted input on the server/process boundary. UI validation alone is insufficient.
- Never log credentials or export tokens. New network destinations, executable tools, auth changes, billing changes, and plugin execution require security review.
- Run packaged install and uninstall checks on the disposable Windows runner. When working inside T3 Code, use synthetic homes for local fixtures and move large builds to CI if they compete with the host. Keep provider accounts and real user profiles out of fixtures. [Windows qualification](docs/BASELINE.md)
- Add meaningful regression tests for behavior/security fixes. Avoid tests that simply repeat the implementation. Documentation-only wording changes need a docs check, not ceremonial app tests.
- Show responsive evidence for UI behavior at narrow mobile and desktop widths; include keyboard and reduced-motion results. Use synthetic content and redact secrets.
- Do not weaken tests, checks, budgets, policy, or security controls to obtain a green badge. Any intentional policy change must be explicit in the PR description.
- List commands and their real results. “Not run” is acceptable when accompanied by the reason and remaining risk. Do not claim screenshots, test passes, reviews, benchmarks, or API compatibility that were not observed.

## Required PR content

Use [the PR template](.github/pull_request_template.md). Include acceptance criteria, relevant issue/design, files or boundaries changed, validation, risks, migration/rollback if applicable, new dependencies/data flows, and rights/provenance confirmation. Reviewers may reject incomplete PRs rather than infer missing evidence.

## Review and merge policy

Plan for one independent maintainer review on ordinary changes and two for auth, billing, permissions, provider process execution, remote access, exports with active content, supply chain, or CI policy. When the project has only one maintainer, record that limitation and obtain a qualified external reviewer for those high-risk areas before enabling them. A model review supplements, but does not replace, maintainer accountability.

Require up-to-date checks on the exact merge candidate. Approvals become stale after substantial changes. Only maintainers merge. AI reviewers and coding agents cannot approve or merge their own contributions. Never merge solely because a model said “looks good.”

GitHub branch rules, required status checks, CODEOWNERS and security contacts must be configured when the remote exists. This local repository cannot enforce hosting settings by documentation alone. See [CI.md](docs/CI.md).

## Commits and licensing

Use clear imperative commit messages. Sign off commits with `git commit -s` to certify [Developer Certificate of Origin 1.1](https://developercertificate.org/). Use the applicable terms in the [license scope map](LICENSES/README.md). Upstream-derived source carries its MIT and third-party notices. Original Studio planning documents and planning checks retain their Apache-2.0 license. No CLA is proposed for the initial project. Do not add invented contributor identities or legal claims.

## Local validation today

`python scripts/check_docs.py` validates required project documents, local Markdown targets, and absence of restricted research asset types. Run the complete planning gate from the repository root:

```sh
python -m unittest discover -s tests -v
python scripts/check_docs.py
python scripts/check_roadmap.py
python scripts/check_agents.py
```

Runtime, security, browser, and model-quality checks described in [CI.md](docs/CI.md) are future gates and must be implemented alongside the corresponding code.
