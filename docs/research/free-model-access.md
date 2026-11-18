# Research: free-model aggregation for a local-first AI studio

Researched 12 November 2026. Research only: no candidate installed or executed, no authenticated inference calls, credential access, publishing, or limit circumvention. Repository statements establish what maintainers claim, not independently tested functionality. Provider documentation takes precedence over gateway marketing. Rankings below express identification confidence, not benchmarks.

## Finding and recommendation

**OmniRoute is the strongest match to the remembered tool.** Its forks preserve the 237-provider/90-free-provider marketing, the localhost:20128/v1 endpoint, and the approximately 1.6-billion-token monthly estimate. 9Router shares the endpoint and a similar promise, so the port alone does not identify the project. The original OmniRoute URL redirects to [cheaper-inference/OmniRoute](https://github.com/cheaper-inference/OmniRoute). Current headline counts have changed; they are not a contractual allowance.

For the studio, use **local inference as the default, an official API as an explicit optional connection, and fixed model selections for substantive work**. Start with a user-owned Groq free API key and the documented `openai/gpt-oss-20b` model for limited experiments, or a user-selected OpenRouter `:free` model. Offer `openrouter/free` only as a visibly opt-in experimental mode. Do not import consumer cookies or pool subscriptions into a hosted resale service. Add LiteLLM only if centralized routing is actually needed; direct adapters are a simpler initial trust boundary. This is an architectural recommendation, not a claim that these models match proprietary flagship quality.

## Ranked matches, licensing, and mechanism

| Rank | Candidate / primary source | License or service status | Why it matches; access mechanism |
|---|---|---|---|
| 1 | [OmniRoute](https://github.com/cheaper-inference/OmniRoute) | [MIT](https://raw.githubusercontent.com/cheaper-inference/OmniRoute/main/LICENSE) | Closest match to all clues. Self-hosted gateway, provider routing/fallback, compression, and MCP integration. Mixes API-key providers with subscription/OAuth/web adapters; enabled adapters determine risk. |
| 2 | [9Router](https://github.com/decolua/9router) | MIT, shown in repository | Local gateway with format translation, multi-account routing and subscription → cheap → free fallback. README uses localhost:20128/v1 and promotes free coding. A particularly plausible recollection if the user remembers a dashboard rather than hundreds of providers. |
| 3 | [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | MIT, shown in repository | Go proxy exposing OpenAI/Gemini/Claude/Codex-compatible interfaces. Wraps CLI/account access as well as compatible API credentials. “Free models” here can mean access attached to a consumer account, not an official free developer API. |
| 4 | [CLIProxyAPIPlus maintained fork](https://github.com/kaitranntt/CLIProxyAPIPlus) | MIT snapshot/fork; verify the selected release | Original [router-for-me URL](https://github.com/router-for-me/CLIProxyAPIPlus) returned 404. The linked CCS fork explicitly identifies itself as an April 2026 MIT snapshot with upstream sync. Plus extends third-party-provider support. Do not substitute an arbitrary similarly named repository as the original. |
| 5 | [Puter](https://github.com/HeyPuter/puter) / [Puter.js](https://docs.puter.com/user-pays-model/) | Puter server AGPL-3.0; hosted service governed separately | Plausible if the memory is “free AI, no API key.” It is chiefly a user-pays cloud platform: users authenticate to Puter and spend their own allowance/credits. It does not manufacture a pooled entitlement to other companies’ free tiers. |
| 6 | [OpenRouter](https://openrouter.ai/openrouter/free/apps) | Hosted commercial API; no self-hostable gateway license established here | Strong match to “one API, many free models,” weaker match to open-source program. `openrouter/free` selects eligible free models; a single OpenRouter credential replaces multiple direct provider accounts. |
| 7 | [LiteLLM](https://github.com/BerriAI/litellm) | [MIT outside enterprise directory; enterprise separately licensed](https://raw.githubusercontent.com/BerriAI/litellm/main/LICENSE) | General SDK/gateway with routing, fallbacks, logging and cost controls. It supplies infrastructure, not free credits. Configure official API-key routes explicitly; do not infer that every available integration has identical authorization terms. |

Additional identity clue: [BlackRiver Gateway](https://github.com/ai-joe-git/blackriver-gateway) preserves the 237-provider/90-free wording and the same endpoint. It is a naming/fork lead rather than a separately validated recommendation. Another [OmniRoute fork](https://github.com/harryweiser/omniroute) explicitly identifies its upstream and retains the billion-token wording. Neither establishes which exact Reddit post the user saw. No exact original Reddit URL was provided.

These are chiefly gateways/programs. Some expose MCP or bundle skills/plugins, but an MCP interface does not itself grant model access or change upstream billing.

## What the 1.6B claim actually means

The preserved [FREE_TIERS methodology](https://raw.githubusercontent.com/harryweiser/omniroute/main/docs/reference/FREE_TIERS.md), dated June 17, 2026, describes approximately 1.54B recurring tokens and 2.15B including first-month credits. It labels the numbers upper-bound estimates, deduplicates shared pools, and converts request-only quotas using an assumed 800 output tokens per request. Its largest claimed component is Mistral at 1B. It excludes its own approximately 10B continuous-rate extrapolation and counts deposit-unlocked OpenRouter capacity separately. These are historical project calculations, not fresh grants verified for this user.

The current [Mistral rate-limit article](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them) documents organization-wide limits, Free mode for evaluation/prototyping, and account-specific limits in the admin console. It does **not establish a generally available 1B-token monthly free allocation**. Therefore the largest component of the headline remains unverified. Its current [consumer terms](https://legal.mistral.ai/terms/row-consumer-terms/) also exclude Studio/API access, directing business use to commercial terms; do not repeat old gateway summaries of Mistral’s terms as current legal facts.

Independent analytical objections:

- A sum across different models is not an allowance for any one model. Switching from a proprietary model to an open-weight model changes capabilities and potentially tool semantics.
- Requests, dollars, neurons, credits, input tokens and output tokens are different units. Token conversions require stated model, price, workload and time-window assumptions.
- Daily caps multiplied by 30 describe a ceiling, not reservable monthly capacity. Minute limits, input size, concurrency, geography, account eligibility and shared organization quotas can reduce usable volume.
- Signup credits expire or are one-time. A required deposit is spending even if subsequent selected requests are priced at zero.
- Multiple gateway entries can ultimately draw on the same upstream allocation. A catalog count is not a count of independent funded pools.
- Compression reduces some transmitted text; it does not grant quota, guarantee unchanged quality, or prove the advertised savings on studio workloads.

**Verdict:** the wording can be traced to the OmniRoute family, but the full 1.6B entitlement, all provider integrations, and “never hit limits/free forever” promises were not verified. No basis was found for free unlimited flagship-model access.

## Official free APIs versus consumer-account proxies

An official free API is a provider-supported developer endpoint with a documented free price/quota and its own credentials. A consumer proxy instead holds a login token, refresh token or session cookie and translates requests into an account-bound product’s protocol. Both can expose the same local OpenAI-compatible URL. Compatibility says nothing about entitlement, commercial rights or the real model.

OAuth is not inherently unauthorized: official integrations also use OAuth. The relevant question is whether that provider authorizes **this client, endpoint and use**, especially shared or resold access. A subscription purchase is not evidence of blanket permission to redistribute inference.

Concrete official constraints:

- **Kiro:** its [FAQ](https://kiro.dev/faq/) allows listed Kiro surfaces and supported integrations but prohibits third-party automation harnesses routing requests outside native interfaces. A router advertising Kiro access does not override that restriction.
- **Claude Code:** current [legal documentation](https://code.claude.com/docs/en/legal-and-compliance) says offering Claude Code inside products requires its commercial terms and the unmodified binary; absent another agreement, customers may not intermediate or resell end-user Claude usage, and each end user authenticates under their own agreement. This is specifically the embedded Claude Code case, not a claim that ordinary API-powered SaaS is universally prohibited. Its [authentication docs](https://code.claude.com/docs/en/authentication) document supported subscription and API/Console paths; the existence of tokens is not third-party resale authorization.
- **Groq:** [Services Agreement §§3.2 and 6.3](https://console.groq.com/docs/legal/services-agreement) prohibit reselling/leasing account access and selling/reselling/sublicensing/distributing cloud services without express approval. Observe model-specific terms too. Selling studio software is distinguishable from selling a raw shared Groq endpoint, but a hosted monetized design needs assessment under the applicable contract.
- **Gemini:** [API terms](https://ai.google.dev/gemini-api/terms) permit developer professional/business purposes but restrict regions and require Paid Services for API clients available in the EEA, Switzerland or UK. Unpaid-service content may be used to improve products and read by human reviewers; the terms warn against submitting sensitive, confidential or personal information. Applicable regional/billing exceptions must be checked.
- **OpenRouter:** [service terms](https://openrouter.ai/terms) cover commercial use and incorporate additional applicable terms; models may be removed. They are not a blanket license to repackage every model or provider. I did not verify an express general resale authorization for a competing public gateway. The general prepaid-credit language and dedicated free-model documentation also differ in scope; use the explicit free-model docs for experimental free access, not as proof of contractual production entitlement.

MIT permits commercial reuse of the gateway software subject to its notice conditions. It does not license provider accounts, model weights, hosted services or trademarks. Puter’s AGPL server license adds source obligations for relevant modified network deployments; it does not make third-party inference free when self-hosted. Assess the actual components being redistributed, rather than applying the server license indiscriminately to every client library.

## Official free options and privacy

**Groq direct API:** the current [limits page](https://console.groq.com/docs/rate-limits) lists `openai/gpt-oss-20b` and `openai/gpt-oss-120b` at 30 RPM, 1,000 RPD, 8,000 TPM and 200,000 TPD in its free table. Limits are organization-scoped and account settings are authoritative. Long agent prompts can exhaust the minute limit before the request count. These are open-weight models, not proprietary ChatGPT flagship access. [Data documentation](https://console.groq.com/docs/your-data) says inference content is not retained by default, with stateful-feature and reliability/abuse exceptions; all customers can enable ZDR, disabling features that need retention. Usage metadata remains collected. Treat cloud inference as data leaving the device even with ZDR.

**OpenRouter free API:** [free-model documentation](https://openrouter.ai/collections/free-models) states `:free` variants are 20 RPM and 50 requests/day, rising to 1,000/day after the qualifying credit purchase; failed attempts count. [Limits documentation](https://openrouter.ai/docs/api_reference/limits) says extra accounts/keys do not increase governed capacity. [Free router description](https://openrouter.ai/openrouter/free/apps) describes random selection among free models filtered for required features. That is not a quality guarantee. [Support](https://openrouter.ai/support/) explicitly describes free models as unsuitable for production.

OpenRouter adds a cloud intermediary before the inference provider. Its [data policy](https://openrouter.ai/docs/guides/privacy/data-collection) describes default logging opt-outs, metadata collection, provider-specific practices and safety/legal retention exceptions. Free endpoints may have their own training policies. Do not equate “OpenRouter logging off” with “no provider retention.” Check the specific endpoint and current account controls before sending client material.

**Gemini direct API:** [pricing](https://ai.google.dev/gemini-api/docs/pricing) offers limited free access to certain models, while its most advanced options can be paid-only. Use the actual account/model allowance, not historical Gemini CLI or Google Cloud signup-credit numbers. Given unpaid data terms, it is a secondary option for deliberately non-sensitive test material rather than the studio’s private default.

**Puter:** [user-pays documentation](https://docs.puter.com/user-pays-model/) explains that each user’s account covers usage, starts with a free monthly allowance and can upgrade. The developer using the app is also a paying/allowance-consuming user. [Quota documentation](https://docs.puter.com/rate-limits-and-quotas/) says allowance resets monthly, model rates vary, and exhausted credit can produce `402 insufficient_funds`; the amount is shown in the account dashboard. “No provider API key” still entails Puter authentication, cloud processing and metering. This is a viable separate user-funded UX, not the recommended offline-first backend.

**Local inference:** [Ollama](https://github.com/ollama/ollama) is an MIT-licensed runtime; [its FAQ](https://docs.ollama.com/faq) documents local execution and hardware configuration. Local execution avoids a provider token bill, but hardware, electricity, memory and speed remain constraints. Model licenses are separate. Select and pin an appropriately licensed weight artifact after the target hardware is known; no flagship-equivalence or model-size recommendation is justified by the information supplied.

## Credentials and data exposure by architecture

| Architecture | Credential custody and data recipients | Studio consequence |
|---|---|---|
| Direct official API | Studio process holds a user’s provider key; provider receives submitted prompts/files/results | Prefer local OS secret storage; no secrets in exported projects or source control. |
| Self-hosted gateway | Gateway can read keys/tokens and request bodies; upstream still receives data | A local URL does not make inference local. Review gateway logs, backups, admin access and enabled outbound services. |
| Hosted third-party proxy | Proxy operator can access requests and whatever credentials are entrusted to it | Avoid giving an unknown operator consumer session or refresh tokens. |
| OpenRouter / Puter | Hosted intermediary and selected upstream process relevant request data; intermediary account credentials remain necessary | Disclose cloud routing and inspect per-provider privacy policies. |
| Local model only | Local process sees prompts; cloud exposure depends on optional integrations | Keep cloud fallback off for private projects and verify the local configuration. |

These are trust-boundary deductions, not a completed code/security audit. I did not verify every project’s encryption-at-rest implementation or telemetry defaults. One concrete default worth noting: [CLIProxyAPI’s current configuration template](https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/config.example.yaml) binds to all interfaces when host is empty, while remote management is separately disabled. “Local proxy” should not be assumed to mean loopback-only. Set loopback explicitly if later evaluated; no configuration was changed in this research.

## Proposed studio behavior

This section is a design recommendation, not implemented work:

1. Default to a local model and local project storage. Show when a task would leave the device.
2. Let users connect official API keys locally. Offer an exact provider/model identifier, avoid `latest` aliases where versioned IDs exist, and record the returned model identity with each run. Hosted pins are routing selections, not immutable weight hashes.
3. On quota exhaustion, pause and offer retry later, another explicitly selected model, or local execution. Never silently substitute a model for a pinned job.
4. Put “Free auto-route (model may change)” behind opt-in. Use `openrouter/free` rather than conflating it with paid/quality-oriented auto routers. For stronger control, maintain a user-approved free-model/provider allowlist in the studio.
5. Keep paid fallbacks disabled by default. Separate experimental free mode from an explicit paid connection; do not depend solely on gateway cost estimates to prevent charges.
6. Limit retries, honor backoff, and fail clearly at exhausted allowances. Do not create accounts, rotate identities or collect other people’s credentials to evade quotas.
7. For monetization, sell the studio’s workflow/product value with local inference or user-owned supported API connections. Treat a centrally funded hosted inference service as a separate product requiring suitable upstream agreements, budgets and data handling. Do not advertise shared subscription resale as a benefit.

[LiteLLM’s configuration documentation](https://docs.litellm.ai/docs/proxy/configs) supports explicit model mappings, credentials and routing settings if a gateway becomes useful. Its presence should not change these product rules. OmniRoute remains the likely remembered project, while an official-API-only, deliberately narrow setup is the safer recommendation.

## Unverified or unresolved

- Exact remembered Reddit post, historical repo revision and identity of every rebranded/forked distribution.
- Reproducible 1.6B free tokens for one eligible account set today, especially the Mistral component.
- Availability, quota, geography and terms for every advertised provider; catalog totals are not an audited census.
- Whether any candidate transparently preserves model identity, tool calls, streaming or quality across all adapters. No executions or benchmarks were performed.
- Current original CLIProxyAPIPlus maintenance/succession: 404 confirms fetch failure, not the reason for removal. Fork identities were verified separately.
- Blanket commercial hosted-resale rights for any pooled free-tier design. Public source licenses do not answer that question.
- A universally free, unlimited, production-reliable route to current proprietary flagship models. None was established.
