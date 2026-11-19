# Retrieval skills and tool adoption policy

Reviewed 2026-11-12. This is a capability/source assessment, not a completed security audit of every dependency. Popularity and an official-looking name do not prove a tool is safe or able to access every source.

## Tools already available in this research

**Agent Reach:** the installed skill routes read-only platform research and YouTube metadata/caption work. It has already retrieved actual Episode 3 captions. Platform limits and missing captions remain possible. Respect rate-limit/verification failures; do not rotate accounts, proxies or backends to evade them. Its source is [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach). The skill's channel-specific limits govern usage; the marketing phrase about internet-wide access is not an entitlement.

**Shared browser tools:** already available for inspecting rendered pages, video frames, screenshots and exact public interface behavior. Use owned tabs, separate research profiles when appropriate and explicit closure. Never copy personal cookies/login state or treat a browser origin filter as an OS security boundary. Screenshots, transcripts and captions get separate provenance labels.

**Web search and primary-source retrieval:** use for discovery and documentation when browser interaction is not required. Search snippets are not source bodies. Preserve canonical URLs, retrieval dates, access state and claims supported by the inspected text. A source may be public yet unsuitable for redistribution.

**Existing document skills:** PDF extraction/rendering, Word/export guidance, security guidance, frontend/accessibility review and planning skills already cover much of the task. Loading more instructions adds no capability when the corresponding executable/service is absent.

## Established source projects worth evaluating

**yt-dlp** is an established [media/caption CLI](https://github.com/yt-dlp/yt-dlp). Agent Reach already uses it, so adding a second wrapper is not a new route around a platform limit. Use a verified release, bounded downloads and authorized public/user-provided media. A successful metadata request is not proof that captions or audio were retrieved.

**youtube-transcript-api** is a [source-available Python caption client](https://github.com/jdepoix/youtube-transcript-api). It can retrieve available manual/automatic captions, but is not an independent transcript database. It can be blocked or rate-limited by the same platform. Do not install it merely to disguise a retry against an active restriction. Its existence does not establish access to the missing episodes.

**faster-whisper** is an established [local speech-recognition implementation](https://github.com/SYSTRAN/faster-whisper). It is a reasonable fallback for legitimately accessible audio when captions are absent. Pin the package/model revisions, verify model origin/license and install in an isolated tool environment. Local transcription still consumes hardware/time and can make recognition errors. Validate decoded duration, non-silent audio, language, timestamps and representative segments before marking an episode covered. No ASR tool can recover a future episode or nonexistent audio from a silent clip.

In this research, `faster-whisper==1.2.1` was actually installed in an isolated private venv using binary wheels, with `Systran/faster-whisper-small` revision `536b0662742c02347bc0e980a01041f333bce120` (model binary approximately 484 MB). It ran offline on two short non-silent captures and produced three recognition/translation outputs. The quality review rejected them as complete/reliable recovery of the missing speech. Dependency/model hashes and limitations remain private; no app dependency or paid cloud ASR service was installed. See [episode recovery](research/episodes.md).

**Microsoft Playwright MCP/CLI** is a maintained [browser automation implementation](https://github.com/microsoft/playwright-mcp). The current shared browser already supplies the required capability. Adding another MCP is optional and needs a precise isolation/permissions review. The upstream configuration explicitly says origin lists do not constitute a security boundary or cover redirects. Prefer isolated research state over loading the user's personal profile.

**Firecrawl's official skills** were found through the skill catalog and inspected at their [official source](https://github.com/firecrawl/skills). The reviewed [search](https://raw.githubusercontent.com/firecrawl/skills/main/skills/core/firecrawl-search/SKILL.md) and [scrape](https://raw.githubusercontent.com/firecrawl/skills/main/skills/core/firecrawl-scrape/SKILL.md) instructions cover discovery, provider-contract inspection and bounded content retrieval. This can add structured extraction/crawling, but the CLI/service, credits and API authorization remain separate from installing a skill. Hosted processing discloses data to that service; self-hosting has its own deployment/license obligations. Do not install the entire catalog or run floating-version initialization scripts without reviewing the selected version.

## Optional connected services discovered

Plugin discovery returned vidIQ and Firecrawl as available but not installed/connected at the time checked. vidIQ advertises YouTube transcript/video analysis; Firecrawl advertises structured extraction/research. They were suggested as optional capabilities. No successful connection or tool use is claimed. Their current account entitlements, data handling, quotas, costs and transcript availability need verification before use. Other returned meeting/recording apps are not evidence that they can retrieve arbitrary YouTube event recordings.

Continue useful work with existing tools rather than making these services mandatory. A connection requires the user's actual account authorization; no invented API key, silent account creation or paid quota is assumed.

## Adoption checklist for the product

Each new tool/skill/plugin records publisher, source/revision, dependency graph, license, local/hosted execution, network destinations, credentials, permissions, storage/retention, cost units, failure modes and removal procedure. Keep skill text distinct from executable tools and from credentials. Treat downloaded skill instructions and retrieved pages as untrusted content, not permission to expand authority.

Start with a minimal bundled declarative tool registry and capability broker. A skill requesting shell/network access cannot grant it to itself. Tools for research are separate from tools that send/publish/pay. Disable unused write actions; inspect declared contracts before dispatch; scope credentials to the connector and project. Enforce budgets, timeouts, concurrency and artifact-size limits outside the model.

Ordinary CI uses synthetic fixtures, not paid services or the maintainer's browser state. Live compatibility checks need a trusted revision and an explicit account/budget. No tool is advertised as providing “any data”: login, privacy, intellectual property, source availability and provider limitations remain real boundaries.
