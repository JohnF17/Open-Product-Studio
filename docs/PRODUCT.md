# Integrated desktop product design

Revised 19 November 2026. The desktop design retains the T3 Code shell and adds guided project builders and a shared dashboard. The pinned Windows desktop has built and opened a fixture conversation. The project categories and Studio workflows below are planned. [Desktop baseline](BASELINE.md)

## Product definition

A downloadable Electron workspace that carries a person from "I do not know what to make" through research, a product, a creator partnership or direct launch, distribution, delivery and improvement. The AI investigates, synthesizes and proposes the next useful decisions throughout the journey. Beginners should not need to invent prompts or learn what every agent does. Experts can inspect the evidence, prompts, model selections, permissions, activity and artifacts.

The workspace opens to the user's projects. **New project** offers three peer choices. The chosen category determines the starting builder, suggested decisions and primary artifact on Home. All three use the same BusinessProject, modules, connections, jobs and library. Each action shows its release availability and the prerequisites for this project.

| Category | Starting experience | Example outcome |
| --- | --- | --- |
| **Blank** | Create a named workspace, collect notes and material, then choose an eligible workflow when ready. | A research workspace that later produces a video or document. |
| **Digital product** | Start with an idea, supplied material or a recommendation. Choose a format and guide the reader toward a useful outcome. | An editable ebook, workbook, template kit, curriculum or action plan. |
| **Video** | Start with a style or ask for a recommendation. Preview the required tools, prepare the chosen setup, then use a guided brief, storyboard and scene editor. | A standalone captioned explainer, product walkthrough or short with an optional social publication. |

Styles and templates belong within a category. Future categories can add a starter flow and a primary artifact using the existing registry and shared services. A video can begin with a one-line idea and finish with a reviewed export. From an existing ebook, **Make a video from this** creates a linked Video draft with its own project ID. Copy only the selected, permitted pages or assets with their immutable revision and source attribution. Each project keeps its own edits, grants, jobs and receipts. A buyer, offer, ebook or campaign is optional for a Video project.

## Foundation and interface

Maintain a downstream fork of pinned T3 Code. Preserve its desktop window, restrained appearance, sidebar, project navigation, command palette, keyboard conventions, resizable panels, settings, exact model picker and background activity. Replace the main chat route experience with project overview, next decisions, workflow status and editable artifacts. Keep conversation as a collapsible inspector and an optional full thread view. Do not rebuild a separate execution server or introduce a second incompatible model selector.

Home shows the chosen project and goal, the next useful action, decisions awaiting review, module progress, the current artifact preview and budget/run status. A recommendation identifies its evidence as live research, saved material or a demo fixture. Activity includes summaries and inspectable technical details.

Dark and light themes inherit the fork's tokens. Business-specific accents and forms must fit the existing UI. Use existing primitives before adding new shadcn components; RHF/Zod forms are appropriate for domain inputs. Preserve typography/density preferences. Preserve the shell while making the new business views cohesive, beautiful and readable; no wholesale replacement of its component system is proposed. Bespoke work goes into dashboard composition and interactions, not discarding the UI the owner likes.

Desktop first does not waive responsiveness. Narrow windows, tablet and phone control surfaces use the same contracts. A phone controls a connected execution host or cloud worker; it cannot run a desktop CLI on its own. A downloaded desktop app opens without a platform account. Provider sign-in/limits remain separate.

## Every step can recommend

Every decision view offers "Research options," "Recommend one," "Use this," "Change it," and "Explain why" where appropriate. The person can start with an idea, owned material, a creator with permission, or no idea. The recommendation service proposes a bounded shortlist, explains evidence and assumptions, and can do approved reversible work.

For example: choose a problem; compare audiences; propose formats; map starting/desired outcomes; propose an outline; draft content and exercises; select a brand direction; compare creator fit; draft a partnership approach; recommend pricing experiments; prepare launch assets; choose publishing channels; inspect feedback; propose revisions. Reusing evidence across these choices is central functionality, not a separate optional research tab.

"Recommend and do safe work" is a workflow policy. It can research, summarize, generate alternatives, build private drafts and run approved validators within budget. It pauses at external sends, publishing, purchases, destructive actions, privilege expansion, unresolved important rights, or material cost changes. Provider permission mode remains separately visible; an automation preset does not secretly select Full access.

## Complete shared module system

The first dashboard registers all modules below, with an explanation, inputs, outputs, dependencies, implementation milestone and present status. Unimplemented actions never show fake successful runs.

- **Brief:** goals, budget, available knowledge, audience, constraints, rights and outcome.
- **Evidence:** web research, source packs, excerpts/locators, contradictions, provenance and freshness.
- **Strategy:** opportunity proposals, buyer problem, format, transformation map, positioning, pricing hypotheses and decision history.
- **Product:** complete guide, workbook, template-kit, curriculum and action-plan workflows in M2; bounded interactive tools in M6B; editable versions and QA.
- **Creators and partnerships:** permitted profile/content analysis, audience-fit hypotheses, partner shortlist, proposals, responsibilities and agreements tracked as user-supplied records.
- **Contacts:** deduplicated people/organizations, relationship pipeline, tasks, correspondence references, consent/suppression and activity.
- **Campaigns and launch:** reusable brand/product context; sales pages, funnels, emails, social/story sequences, video/ad scripts, FAQs and experiments.
- **Media:** style setup, storyboards, editable scene and audio timelines, licensed references, local or connected rendering, variants, provenance and quality review. Media supplies both the Video project's main deliverable and supporting assets in other categories.
- **Publishing and delivery:** approved destination connectors, preview/dry run, explicit payload approval, publishing receipts and provider-backed delivery configuration.
- **Feedback and improvement:** interviews, imported outcomes, complaints/refunds where authorized, experiment analysis, revision suggestions and source refresh.
- **Library and exports:** product/artifact versions, brand/audience profiles, reusable templates, sources, portable bundles and backups.
- **Guidance:** original contextual tutorials, worked examples, project-aware explanations and help. No imitation of a real person's identity or copied paid course.
- **Connections and activity:** provider accounts/model choices, tools and capabilities, devices, permissions, budgets, receipts and active tasks across every module.

See [MILESTONES.md](MILESTONES.md) for release availability and project progress; [RECOMMENDATIONS.md](RECOMMENDATIONS.md) for the decision engine.

## Shared business graph

One BusinessProject owns its brief, decisions, artifact versions and execution runs. It can also own audience, problem and offer versions and link to sources, claims, contacts, campaigns, publications and experiments when the workflow needs them. A video brief can name a viewer, a topic and a takeaway without inventing a seller or an offer. A creator is a person/contact with profile evidence. A sales campaign uses an approved offer and audience. A publication references exact artifact versions and destination. Feedback creates revision work and preserves the version already published.

Brand voice and customer context are shared, versioned inputs. Changing the promise or target audience invalidates dependent recommendations and marks affected drafts for review. Completed artifacts remain available even if an optional service expires or a connector is unavailable.

## Beginner journey

Start with the category chooser. A person who is undecided can ask for a recommendation or open Blank. Within a guided project, “I have an idea,” “Use my material” and “Help me choose” are ways to fill the brief. Creator collaboration is available where relevant. A Video user gets a topic or style suggestion and a sample scene. A Digital product user gets a proposed reader outcome and sample section. Each suggestion remains editable.

The dashboard makes the next decision small. Recommendations arrive as choices with evidence, tradeoffs and one suggested action. A beginner can accept recommendations repeatedly while the system creates private drafts, tracks progress and explains uncertainty. They can always edit or go back. No hidden prompt-writing prerequisite.

Show how the product helps a particular reader before investing in a long document. Format/length are recommendations rather than fixed page counts. First end-to-end acceptance uses a guide/workbook because it is easy to inspect; the entire system includes the other formats and operational modules in named milestones.

The [first-result and service-flow decision](plans/2026-11-13-first-result-and-service-flows.md) makes this journey concrete. At M1, group existing brief fields into five short prompts covering outcome, skills/permitted material, reachable audience, time/budget, and prior attempts/constraints. Show one recommended route plus one backup, evidence gaps and a small next deliverable. Unknowns remain editable. A backup never authorizes model fallback.

An optional editable 30-day execution plan groups weekly checkpoints and first-week actions around the selected route, current capability gates, time/budget assumptions and a user-adjustable activity target. At M1 it is revisioned recommendation data with manual progress and user-requested check-ins, not the sellable M2 action-plan product. It requires no CRM, calendar account or Dot. Turning eligible steps into M3 tasks/campaigns is an explicit later choice; advice never starts reminders, external actions or persistent wakes. Activity targets are hypotheses, not promised replies or income.

At M2, finish a short reviewed sample, editable export and successful reopening without a contact, campaign, mailbox or cloud account. At M3, a reusable workflow/job card exposes inputs, exact model/tools, budget, approval stops and what counts as done. A bounded service job names one client, permitted inputs, deliverable, revision allowance and handoff; it is different from a reusable product pack. A proof bundle binds a sample version to one proposed recipient and one exact unsent pitch. Generated media stays M4A; sending M4B; publishing M4C; client portals/e-sign/invoices M8A.

Creator proposals include editable split scenarios with exposure assumptions, zero sales, refunds, fees, cost responsibility and uncertainty; scenarios are not earnings or payouts. All job views separate actual charges, estimates, recurring access and unknown costs. A storyboard cannot count as a completed video, a draft cannot count as sent, and export cannot count as client acceptance. These additions refine existing modules and acceptance; they introduce no persona-count target or extra persistent assistant.

## Guides, motion and performance

Wrap an appropriately licensed tour layer in resumable, versioned tutorial state. Driver.js remains a candidate; verify keyboard/screen-reader behavior rather than trusting its marketing. Tours never authorize spending or external action. Provide an example project, contextual help, and clear reasons for unavailable tasks.

Prefer short purposeful motion for opening panels, stage transitions, saved revisions and completed operations. Respect reduced motion, preserve focus, and batch stream updates. Avoid token-by-token layout movement and imaginary percentage estimates.

Target keyboard-only completion, 320 CSS px usability, 200% zoom, visible focus, WCAG 2.2 AA checks and 44 px touch targets where feasible. Preserve upstream accessibility work when replacing routes. Browser targets remain LCP <=2.5 s, INP <=200 ms, CLS <=0.1 on a declared test profile; desktop startup/idle memory get measured baseline and regression budgets in the fork build milestone. These are targets, not measurements.

## Shipping and scope

The entire catalog ships as truthful navigation and explanations in M0B. Working actions activate by the named submilestones in the [canonical roadmap](ROADMAP.md), and each release states exactly which are operational. Do not require paying to see the roadmap. Project prerequisites can unlock tasks in already-shipped modules without imposing an artificial linear funnel.

M0A packages the isolated desktop; M0B adds the full registry, safety/recovery and dashboard. M1 activates evidence/recommendations and separately verified execution adapters; M2 complete document products/export; M3 creator/contact/campaign preparation. M4A media, M4B messaging, M4C publication/commerce/delivery and M4D results have independent gates. M5A transfer, M5B hosted execution and M5C pairing remain optional. M6A extensions, M6B interactive products and M6C collaboration have explicit confinement/convergence gates. Wider ecosystem modules have named M7A-D lead/engagement/delivery/merchant gates and M8A-D client portal/booking/communications/integration gates. All are in the initial registry; only tested capabilities activate. Guidance, security, accessibility, evidence and exact provider policy apply to each affected package.

M0C now inserts the [agent harness](AGENT-HARNESS.md) before AI-dependent M1 actions: versioned roles, exact model policies, scoped tools, delegated work, structured replies, handoffs, memory/wake contracts and inspected outcomes. M3C adds optional councils with independent positions, review and preserved dissent. These are shared product foundations, not extra chat personas. A later [single personal Dot](PROACTIVE-DOT.md) arrives in M9A-D with private proactivity, AgentMail/owned browser/Agent Reach, verified phone, then narrow standing actions. Register all modules in M0B with honest planned states; no mailbox/phone/browser authority activates from displaying the route.

Local content remains usable without cloud login. Optional Studio subscriptions/storage/seats, prepaid service units and personal-provider costs are disclosed separately in the [payment flow](PAYMENTS.md). Studio payer organization, active project, creator merchant and buyer identity are separate; project switching cannot change who is charged or receives a sale. Creator-owned checkout does not require a Studio subscription. Units buy our bounded services, not money transfers or cash-out; USD 19.95 remains a service-pack experiment after metering/economics. Local CLI workflows and exports remain account/paywall independent.

## Evidence-based product analysis

Private research includes the supplied workbooks, published official product imagery and retrieved episode captions/frames. A screenshot establishes visible controls, not whether a backend feature works or produces revenue. Vendor demonstration videos can be edited. Review-site illustrations with uncertain/generated provenance are not accepted as product screenshots. Evidence labels distinguish inspected frames, captions, public marketing and secondary recap claims.

The requirements reproduce generic functionality through original implementation and prompts. T3 MIT code is reused with notices; paid-product assets, copyrighted workbooks and private prompts are not bundled. See [UPSTREAM.md](UPSTREAM.md) and [research index](research/README.md).

## Acceptance

A nontechnical user can use an installed build, understand all module statuses, accept AI recommendations at each active step, inspect sources, create/edit/export a useful product and prepare a launch without typing prompts. Safe automation honors budgets and pauses at concrete external actions. Failed/restarted runs preserve work and model identity. Every claimed available module has real acceptance evidence; planned modules are visibly planned.

## Recorded-demo requirements refinement

The [inspected demonstration](research/demo-observations.md) confirms a richer builder than outline generation alone. The product workspace must connect editable outcome mapping and product charter to outline, manuscript, branding and readiness stages. Show section-level queued/writing/review/complete states, pause/resume and preserved edits. Provide cover/style alternatives, a product charter, a store-page draft and rendered-document preview. Include DOCX alongside PDF/Markdown/HTML/JSON/ZIP exports. DOCX must preserve meaningful heading/list/table structure and remain editable outside the app.

Beginner entry paths and language choice belong in the initial experience. Discovery can explore many candidate ideas, but its shortlist must explain criteria and evidence; a numeric score is not an independently proven market opportunity. Generation duration and reading-time estimates must be labeled honestly. Hidden format controls in another application's recording do not justify inventing its features.

The [operations observations](research/operations-observations.md) further specify saved prospect filters, deduplicated imports/exports, configurable pipeline boards, structured relationship cards, campaign variants/follow-ups, sender readiness, sending windows and a final execution review. They belong to the shared module graph. Authorized data sources and sending providers remain explicit connections; recreating a vendor's UI does not confer its contact database, domains, mailboxes or deliverability.

## Multi-project experience and service design

[PROJECT-EXPERIENCE.md](PROJECT-EXPERIENCE.md) specifies create/rename/archive/duplicate/template/import/export and safe deletion for business projects, without forcing Git repositories. Persistent workspace/project context, guided next actions and advanced inspection share the same state. Switching projects preserves drafts/focus and leaves jobs, payer/provider/host/sender/merchant bindings and late callbacks attached to their original operations. Accessible zero/error/offline/recovery states and purposeful bounded motion are acceptance requirements, including the exported product in an external reader.

[SERVICES.md](SERVICES.md) records why each service is needed, when it can activate, what it owns, who pays and how to exit. Prefer Clerk for optional hosted identity with official Convex integration; Convex remains hosted authority/private storage/coordination. Hosted/system-browser sign-in and a separately qualified desktop bridge do not force online UI into local use. Cloudflare edge and bounded Composio are optional where a real requirement warrants them. Keep direct billing authority separate from sign-in, and direct-product/manual-feedback journeys independent of creator/mail setup.
