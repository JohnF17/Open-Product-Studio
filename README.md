# Open Product Studio

Turn a useful idea into a product people can use. Keep the files, choose the model, see the costs.

**Development has started.** The pinned T3 Code desktop, web and server source is in this repository. The first work package establishes a reproducible Windows baseline. The Studio dashboard and guided product workflows are planned. See the [baseline record](docs/BASELINE.md) for the build and launch evidence.

Open Product Studio is a planned downloadable Electron application, built as a substantially adapted downstream fork of T3 Code. It is an open-source workspace for researching a buyer's problem, creating a digital product, and preparing its launch. The complete workspace includes research, strategy, product creation, creator partnerships, contacts, launch campaigns, media, publishing, feedback, exports and guidance. All modules appear in the first dashboard; explicit engineering milestones govern which actions are available.

The intended experience is simple: let AI investigate the web and recommend choices at every stage, accept or change those choices, review the result, and export or deliberately publish your work. "Recommend and do safe work" handles bounded research and reversible drafting under your chosen budget. A guided first project teaches the interface while you use it. You can always skip the tour.

## Your tools, your choice

- **Use your CLI:** connect a supported AI CLI under your own account and its provider's terms. Provider usage limits still apply.
- **Bring an API key:** use an official provider connection with an explicit model and budget.
- **Use a local model:** suitable hardware and separately licensed model weights are required.
- **Optional hosted service:** planned for a later release, with clear prices and usage receipts. No paid plan is required for the intended local workflow.

Select the provider, account, model, and available reasoning setting. If your selected model cannot run, the job pauses. It does not quietly become a different model wearing the same name tag.

The planned agent harness gives specialists versioned roles, scoped tools, bounded delegated work, structured results and inspectable receipts. Councils add independent positions, evidence review and visible disagreement. A later single personal assistant adds memory, private proactive work and deliberately connected inbox/browser/phone capabilities through separate release gates.

Free provider allowances are useful for experiments. They are finite, change over time, and do not promise free access to every premium model.

## What we are building

The first complete production milestone proves this workflow inside the full registered dashboard:

1. Describe a specific buyer and problem.
2. Collect sources and separate evidence from assumptions.
3. Choose a product outline and create an editable draft.
4. Check claims, add exercises, and improve the product.
5. Export the reviewed product and permitted source notes, then reopen/edit it outside the app.
6. When launch capabilities are accepted, prepare a sales-page draft and launch kit; the first M2 export needs no CRM, creator or mailbox setup.

Creator partnerships, CRM, campaigns, media, publishing and feedback are part of one shared product design from the start. Unshipped actions show their implementation milestone; project prerequisites and missing connections are separate states. Publishing and sending messages always require a deliberate user action.

## A few unusually ordinary promises

The free edition should remain useful after the welcome screen. Export should not be a retention strategy. A progress bar should measure work, not manufacture urgency.

Our stack is selected for engineering reasons. Equity stakes are not a dependency-resolution algorithm. Any future sponsorships, affiliations, or referral payments will be disclosed beside the relevant recommendation.

We sell no income guarantee. AI can help make a product; usefulness, distribution, customer trust, and maintenance still require work.

## Proposed stack

The fork brings Electron, React, TypeScript, Vite, TanStack Router, Tailwind, Node/Effect services, authenticated RPC, provider contracts and SQLite. Studio will add React Hook Form and Zod for business forms, plus accessible motion. The optional hosted service plans to use Clerk for sign-in and Convex for durable business data. Desktop cloud sign-in has its own qualification gate. Local projects will work without a Studio account.

## Start here

- [Product and experience design](docs/PRODUCT.md)
- [Multi-project navigation, accessible motion and recovery](docs/PROJECT-EXPERIENCE.md)
- [Service needs, stages, authority, costs and exit](docs/SERVICES.md)
- [Payments and separate creator commerce](docs/PAYMENTS.md)
- [First useful result and bounded service flows](docs/plans/2026-11-13-first-result-and-service-flows.md)
- [Architecture and provider contract](docs/ARCHITECTURE.md)
- [Downstream fork strategy](docs/research/fork-strategy.md)
- [Complete module and milestone catalog](docs/MILESTONES.md)
- [Recommendations at every step](docs/RECOMMENDATIONS.md)
- [Local, cloud, commerce and customer-access boundaries](docs/PLATFORM-BOUNDARIES.md)
- [Research skills and tool adoption policy](docs/TOOLING.md)
- [Canonical engineering roadmap](docs/ROADMAP.md)
- [66 dependency-ordered implementation contracts](docs/WORK-PACKAGES.md)
- [Agent harness, roles and councils](docs/AGENT-HARNESS.md)
- [Later single proactive personal agent](docs/PROACTIVE-DOT.md)
- [Feature coverage, evidence and explicit limits](docs/FEATURE-COVERAGE.md)
- [Platform choices and operating modes](docs/PLATFORMS.md)
- [Interactive roadmap explorer](docs/roadmap/explorer.html)
- [Security model](docs/SECURITY-MODEL.md)
- [Business and launch plan](docs/LAUNCH.md)
- [CI and review design](docs/CI.md)
- [Contributing](CONTRIBUTING.md) and [agent instructions](AGENTS.md)

## Support the project

Useful bug reports, accessibility feedback, documentation, and reviewed contributions are welcome. Donation links and GitHub Sponsors can be added once the maintainer supplies verified account URLs. Funding will not buy merge approval or alter the public roadmap in secret.

## License

T3 Code retains its [MIT license](LICENSE). The original Studio planning files and checks retain their [Apache-2.0 license](LICENSES/Studio-Apache-2.0.txt). The [license scope](LICENSES/README.md) identifies the imported materials and third-party notices.
