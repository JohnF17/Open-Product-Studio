# T3 Code architecture research for an original local-AI digital-product studio

Research date: 2026-11-12. Research only; no application implementation, child agents, paid model calls, PRs, or changes to the installed application.

## 1. Findings that should guide the product

Build an original **local execution studio with remote clients**, rather than a hosted chat application that happens to invoke an LLM. T3 Code's useful precedent is its separation of workspace ownership, provider instances, durable conversations, provider sessions, runs, approvals, and client connections. A mobile device controls the machine that owns the files and CLI credentials; it does not acquire those credentials or take over execution. This boundary is explicit in upstream architecture documentation and reflected in the server/client-runtime split. [S03, S04]

For a faithful provider/model selector, use the **actual provider instance's catalog and model-specific option descriptors**. A flat array of model names plus one universal effort dropdown is insufficient. Codex obtains models and reasoning choices through its app server; Claude's built-in catalog and dispatch profiles come from a validated manifest; ACP and other drivers expose their own capabilities. Different accounts, installations, CLI versions, workspaces, and providers can offer different choices. [S05–S12]

Use **SQLite on the execution host as the first authoritative store**, with a daemon that owns side effects and durable jobs. Convex can later provide optional cloud identity, coordination, selected shared metadata, billing integration, and notifications. A cloud database does not replace the daemon that must run the user's installed CLI and operate on their local filesystem. [S19–S22, E03–E05]

Two corrections to possible assumptions:

- The upstream repository is **[pingdotgg/t3code](https://github.com/pingdotgg/t3code)**, with an MIT license naming **T3 Tools Inc.**. It is not a generic “T3 stack” template or the T3 Chat source repository. [S01, S02]
- The inspected installation does **not establish the existence of a custom fork**. It declares v0.1.7 and a commit that exists in public upstream. The named GPT model IDs also appear in public source, installed bundles, and official provider documentation; they should not be dismissed as private runtime aliases. Account availability and the precise exposed effort/service-tier combinations still require live discovery. [I01, I02, S07, S13, E01, E02]

“Exactly like T3 Code” should mean the same selection mechanics, capability honesty, and instance/account boundaries. It should not mean promising a permanently identical model list across different hosts or reproducing every defaulting behavior where the studio explicitly requires **no silent model fallback**.

## 2. Scope, revisions, and provenance

### Public source baseline

The pinned public source examined is:

- Repository: https://github.com/pingdotgg/t3code
- Branch observed: main.
- Revision **U**: **7d71f852a8edd298ffde67c295760c286a71a27c**
- Commit timestamp: 2026-11-12T06:58:49+05:30, equivalent to 2026-11-12T01:28:49Z.
- Commit subject: “fix(mobile): screen readers hear when the open thread needs you or finishes (#34431)”.
- Public server/web package versions at U: 0.1.9.

Unless marked otherwise, upstream claims and source links below refer to U, not an unspecified moving main branch. Source files were retrieved through the GitHub connector and saved in the private research workspace source cache. A shallow partial Git fetch supplied the revision and file-tree inventory; its checkout was interrupted when bulk blob retrieval stalled. The research does not depend on a successful complete clone or running upstream code.

### Installed application baseline

Only application distribution files under **E:/T3Code/app** were inspected. No userdata databases, conversation history, environment variables, login files, provider homes, tokens, private project files, or credential stores were opened.

The ASAR header and selected application-owned bundle bytes establish:

| Item | Observed value |
| --- | --- |
| Desktop package | E:/T3Code/app/resources/app.asar::/package.json |
| name | t3code |
| version / buildVersion | 0.1.7 / 0.1.7 |
| t3codeCommitHash | 322f6544dfad |
| declared license / author | MIT / T3 Tools |
| Electron entry | apps/desktop/dist-electron/boot.cjs |
| Server package | E:/T3Code/app/resources/server.asar::/package.json |
| server name / version | t3code-server / 0.1.7 |
| Public revision matching declared hash, **I** | 322f6544dfad0a3c8a0c8cbecf2c7f7874b14268 |
| Public I timestamp | 2026-11-04T00:41:08Z |
| app.asar SHA-256 | 889ed542a773efb9bcf38d6d25073b13163c1a47a80a73fac5a2d9addfdfb2c9 |
| server.asar SHA-256 | d2c744c10246780ba0cdcb1cdd36c6b0e5098fff5375d707825db04d1100e1f3 |

Here “archive::/path” identifies an entry inside an ASAR; it is not a separate physical directory. These hashes fingerprint the examined archives, but are not a verified signature or a reproducible-build comparison.

Public commit I resolves in the upstream repository. Its model contracts name gpt-6-astra as the default; its model manifest contains gpt-6.1-sol, gpt-6-astra, and gpt-6-luna. Its orchestration toolkit also defines delegate_task. Thus these features alone are **not evidence of a custom fork**. [I02]

The installed server bundles additionally contain:

- /apps/server/dist/ManagedEndpointRuntime-olGvALiB.mjs: DEFAULT_MODEL = "gpt-6-astra", delegation-related contracts, and orchestrator_capabilities.
- /apps/server/dist/runtimeLayer-BDHHK7u1.mjs: manifest entries for gpt-6.1-sol / gpt-6-astra and injected T3 orchestration instructions.
- /apps/server/dist/server-UENsecr6.mjs: delegation, target-required errors, and remote-delegation implementation.

These are packaged program constants, not private account/catalog records. [I01]

**Provenance conclusion:** the installation is consistent with a public upstream build at I. Package metadata can be preserved by a modified build, so this is not proof of bit-for-bit upstream identity. No custom-fork repository, patch set, or separate license was identified. Newer features documented at U must not automatically be attributed to the older installed build.

## 3. License and an original open-source product

The root LICENSE at U is MIT, copyright 2026 T3 Tools Inc. Its grant includes use, modification, distribution, sublicensing, and sale of copies, conditioned on preserving the copyright and permission notice in copies or substantial portions. It also contains the standard warranty/liability disclaimer. [S02]

For the proposed studio:

- Original branding, product workflows, information architecture, and code are compatible with learning from this architecture.
- If copying substantial upstream implementation, retain its required notices and record source revisions.
- The root license does not establish rights to use T3 branding or imply endorsement.
- Dependency licenses, bundled assets, fonts, native modules, and external CLI/SDK terms need their own release review. An MIT host application does not make every integrated CLI or model service MIT.
- Provider subscription compatibility is a technical integration fact, not a blanket authorization to resell provider access or share login credentials.

The architecture report does not establish subscription entitlements, permitted redistribution of proprietary CLIs, or service-specific commercial terms. Keep a provider integration manifest that records executable origin, SDK dependency, upstream license, and supported auth modes separately.

## 4. Actual upstream stack and ownership boundaries

T3 Code is a TypeScript monorepo. At U its workspace catalog pins React 19.3.0 and Effect 4.1.2; web uses Vite/Vite+, TanStack Router, Tailwind, Base UI, Tiptap and other UI libraries. The desktop shell is Electron. The native mobile application has Expo/React Native dependencies. The execution server is a Node application with Effect services and SQL persistence. These are observations of U, not prescribed versions for a new project. [S14–S17]

The relevant decomposition is:

| Boundary | Upstream location | Responsibility |
| --- | --- | --- |
| Web / desktop renderer | apps/web | Conversation, composer, model picker, project and file views |
| Desktop shell | apps/desktop | Launch/own local backend, native integration, SSH/platform services |
| Native mobile | apps/mobile | Phone UI and platform services |
| Shared client runtime | packages/client-runtime | Environment connections, auth integration, RPC, synchronized state |
| Shared contracts | packages/contracts | Runtime-validated messages, schemas, capabilities, commands/events |
| Provider core | packages/provider-core | Adapter contract, drivers, catalogs, provider-host ports |
| Provider packages | packages/provider-* | Provider-owned protocol and runtime behavior |
| Execution server | apps/server | Processes, Git, files, terminals, persistence, orchestration, auth |
| Optional Connect infrastructure | infra/relay and server cloud services | Cloud identity/linking and managed reachability |

A client is connected to an **environment**: one server with its own machine state, files, provider credentials and persistent state. A project is an environment-local directory record. It is not a sandbox or a credential boundary. [S03, S23]

Desktop normally bundles and starts a primary server. It can also disable that local environment and connect only to saved remote ones. The renderer is served from a bundled t3code:// scheme rather than requiring the backend to serve its UI. It still sends API traffic to the selected environment. SSH lifecycle belongs to desktop main; the shared client runtime sees a usable forwarded endpoint. A remote server that the launcher merely discovers must not be killed when that client disconnects. [S24]

Upstream has both a responsive browser client and a native mobile application; “mobile” is not merely a claim that the desktop renderer fits a small screen. Native mobile shares connection/domain logic while retaining its own UI. The server, not the phone, owns provider execution.

## 5. Provider adapter architecture

### Driver, instance, adapter, runtime

Upstream distinguishes four levels:

1. **Driver kind**: an integration family such as codex, claudeAgent, opencode, or pi.
2. **Provider instance**: one configured installation/account/environment with an instanceId. Multiple instances can use the same driver.
3. **Orchestration adapter**: normalized behavior and capabilities exposed by that instance.
4. **Session runtime**: the live provider execution attachment, events, and control methods.

The ProviderDriver interface includes metadata, configSchema, defaultConfig, create, and optional usage reading. A created ProviderInstance exposes its identity, snapshot, optional per-cwd snapshot/refresh/auth controls, text generation, and orchestrationAdapter. Its create calls must share no mutable state across instance IDs/configurations. [S05]

ProviderAdapterV2 exposes getCapabilities, planSelectionTransition and openSession. The resulting ProviderAdapterV2SessionRuntime includes ensureThread, resumeThread, startTurn, steerTurn, interruptTurn, respondToRuntimeRequest, readThreadSnapshot, rollbackThread and forkThread, plus event streams and optional background-task/context controls. Some operations remain methods that return typed unsupported errors; capabilities determine whether an affordance is offered. [S06]

Normalized events cover sessions, native provider threads/turns, app messages, execution nodes, subagents, runtime requests, plans, terminal outcomes and selected ephemeral deltas. Raw provider frames do not become the application's entire domain model.

### Registered integrations at U

The built-in registry includes Codex, Claude, Cursor, Grok, fx, OpenCode, Antigravity, Kiro, Pi, Muse, and ACP Registry. This list is from source registration; it does not mean all are enabled, installed, authenticated, or available in the inspected installation. [S18]

| Integration | Verified integration surface | Important caveat |
| --- | --- | --- |
| Codex | codex app-server, typed client/protocol package | Model catalog and capabilities depend on installed CLI and account |
| Claude | @anthropic-ai/claude-agent-sdk query(), configured local executable support | Not equivalent to wrapping every turn in a bare claude -p process |
| Cursor | @cursor/sdk adapter | SDK/session semantics remain provider-owned |
| ACP Registry and ACP-based flavors | Shared ACP adapter; ACP_PROTOCOL = acp.ndjson-jsonrpc | Generic registry agents should not acquire per-agent branches in orchestration |
| Grok / fx / Kiro / Antigravity | Dedicated integrations around ACP where extra behavior is required | Runtime modes, setup, catalogs and native permissions differ |
| OpenCode | Version probe selects 1.x or 2.x runtime | 1.x thread server ownership differs from 2.x instance server ownership |
| Pi | User's pi install in RPC mode | Native session files support resume/fork/rollback; Pi owns its extension discovery |
| Muse | @muse-code/sdk / MSP integration | Advertised capabilities differ from Codex |

Sources: [S08, S18, S25–S29]. This is a current-source inventory, not a guarantee of vendor support or interoperability across every future release.

### Account and process isolation

The provider constraints documentation is particularly useful:

- OpenCode 1.x uses a T3-managed chat server per thread; helper work can share an instance-owned server.
- OpenCode 2.x uses a server per instance, with thread-specific MCP entries and permission isolation.
- Antigravity isolates profiles/accounts and removes ambient Google credentials to prevent accidental use of another billing account.
- Helpers can run native hooks/MCP before a prompt. Denying tools after startup is not equivalent to a sandbox.
- Background status checks should not unexpectedly launch login browsers, hooks, or full sessions.
- Native permission option IDs must survive normalization; a visible label is not necessarily a valid response ID.
- A provider instance must not silently reuse another instance's credentials, catalog cache, or session state. [S08]

For the studio, make provider instance identity part of every cache key, run request and persistent selection. Driver name alone is insufficient.

## 6. Transport: three protocols, three roles

### Client → studio/environment server

Upstream's browser/desktop/mobile clients use authenticated RPC over WebSocket. The shared contract is packages/contracts/src/rpc.ts. The server constructs Effect RpcServer.makeProtocolWithHttpEffectWebsocket and supplies RpcSerialization.layerJson; it does not use a generic “just stream the terminal” transport. Authentication occurs at upgrade, and a separate authorization middleware checks the method's required scope. [S30, S31, S23]

HTTP is still used for uploads, assets, authentication, initial descriptors and other routes. File viewing/upload authority must remain server-owned. A WebSocket being authenticated does not authorize arbitrary files or every RPC.

The shared connection runtime owns one transport retry loop per environment, with jittered backoff and wakeup behavior. It distinguishes socket connectivity from initial server-config readiness and from shell/thread data freshness. Read projections may remain cached while offline. Reconnection does not blindly replay every mutation; command-level idempotency owns that decision. [S04]

### Server → native agent

Codex uses a child-process stdio transport. Launch args begin with app-server and thread_unload_delay_secs=0. The provider protocol is bidirectional newline-delimited JSON-RPC style messaging, with response correlation, server requests, notifications and separate stderr handling. Codex's wire omits the usual jsonrpc version property. T3 includes a typed client/schema/protocol package rather than parsing TUI output. [S32, S33]

Official Codex docs independently describe stdio JSONL, initialization, thread/turn operations, model/list and server-initiated approvals. They explicitly say model/effort availability depends on client/account. Generate protocol types against supported CLI versions rather than assuming one schema forever. [E01]

Claude uses Agent SDK query()/message iteration and control APIs, with canUseTool approval handling and pathToClaudeCodeExecutable support. The SDK owns the Claude Code harness integration. The official CLI also offers noninteractive -p usage, but a one-shot CLI wrapper is not feature-equivalent to T3's persistent SDK adapter. [S09, E06, E07]

ACP has its own agent/client protocol and session/config/permission lifecycle. T3's generic ACP adapter identifies its protocol as acp.ndjson-jsonrpc. Do not call every local-agent connection “MCP”. [S25, E08]

### Agent → studio tools

MCP is the agent-facing control/tool surface for T3 orchestration, thread tools, worktree operations and other capabilities. A launched agent receives a thread/session-scoped connection. External MCP clients use a separate OAuth audience and grant boundary. MCP is not a replacement for the provider-native agent protocol or the browser RPC protocol. [S23, S34]

The studio should preserve this separation even if it uses a simpler WebSocket implementation than Effect RPC.

## 7. Threads, sessions, runs and durable execution

The essential entities are distinct:

| Entity | Durable meaning |
| --- | --- |
| AppThread | User-facing conversation and work history |
| ProviderThread | Native conversation handle and provider-specific continuity |
| ProviderSession | Runtime attachment to a live process/connection |
| Run | App-owned execution request/attempt lifecycle associated with a message |
| ProviderTurn | One native provider turn; a run can encompass multiple native turns |
| ExecutionNode | Nested execution graph node, such as tool/subagent/request |
| RuntimeRequest | Approval or structured question with response capability |
| ContextHandoff | Explicit portable context transferred across native conversations |
| CheckpointScope / checkpoint | Filesystem state and diff boundary |

Sources: [S03, S06, S35]. A thread survives process exit; resuming its UI from SQLite and resuming its provider-native conversation are different operations. Native goal/continuation behavior can create multiple provider turns in one run. [S08]

### Durable command flow

The v2 orchestrator serializes commands and decides state transitions. EventSink commits events, updated persisted projections, command receipts and outbox effects in a database transaction, then publishes committed updates. EffectWorker performs provider/filesystem work after durable intent is recorded and feeds outcomes back. A command acknowledgement means acceptance committed, not that the provider has started or the job has finished. [S03, S36–S38]

This pattern matters for a product studio: a disconnected phone must not create duplicate “generate product” runs when it retries, and a daemon crash must not leave only a UI spinner without a durable job record.

It is **not** a guarantee that arbitrary shell/network side effects execute exactly once. The new studio should use idempotency keys for commands, effect leases/attempt IDs, provider-native identifiers and reconciliation. When a crash leaves an external side effect uncertain, record uncertainty rather than blindly replaying it.

### Completion, stop and recovery

Provider completion is distinct from checkpoint/diff finalization. RunFinalizationService captures the checkpoint and refreshes workspace/VCS state; slower display/forge refreshes must not keep reporting the model as running. The newer architecture overview makes this distinction explicit. Some lifecycle design documentation contains older “checkpoint before terminal” wording, so current implementation/overview should take precedence when reconstructing exact behavior. [S03, S39]

A stop request returning successfully is not itself proof that the process stopped. The adapter's native terminal event or confirmed process termination establishes the outcome. Parent stop also holds queued work and propagates cancellation to delegated descendants, preventing automatic continuations from immediately restarting it. [S34, S37]

On restart or idle-runtime release, retain AppThread, ProviderThread and native resume cursor. Recreate the runtime when necessary, then resume the correct provider conversation. Lost live approval callbacks must be marked non-resumable rather than shown as actionable. Some async questions are different: Codex message-based questions can be persisted and answered by a later user message, even after a turn/process ends. [S06, S08]

### Provider/model switching

Switching providers does not transfer hidden native state. Upstream documents explicit context handoffs; returning to an earlier provider can resume its native thread and inject a summary of intervening work. Fresh provider threads can use a fuller handoff when native continuation is unavailable. Selection transitions belong to adapters/capability policy. [S40]

For the studio, record the handoff and the covered run range. Do not present a cross-provider switch as a lossless continuation of another model's private state.

## 8. Approvals and permission modes

The permission modes documented at U are:

| UI label | Meaning |
| --- | --- |
| Supervised | Native approval for commands/file changes as applicable |
| Auto-accept edits | Edits accepted automatically; other actions may ask |
| Auto | Provider's automatic review mode where supported |
| Full access | Commands/edits without ordinary approval prompts |

At U, upstream's initial new-thread default is Full access. That is a product default, not a recommendation to copy it for a commercial product studio. Runtime mode and interaction mode (default/plan) are separate. [S41]

Providers do not implement all modes identically. supportedRuntimeModes controls offered choices. RuntimePolicy runs an unsupported stored mode as approval-required, and managed ceilings can reject broader modes. Adding-provider guidance says native enforcement is required where a mode is offered; a client-side “approval” overlay should not pretend to supply a missing sandbox. [S08, S42]

The generic ACP Registry guide is an important qualification: registry agents run their own tools in their own mode, while T3 answers approval requests according to the selected permission policy. That approval-response policy is not an OS sandbox and should not be described as one. [S41]

Runtime requests should carry:

- App-owned request ID and scoped native request reference.
- Thread/run/node/provider-session identity.
- Request kind and native response options, preserving IDs.
- Response capability: live callback, message-based answer, or no longer resumable.
- Pending/resolved/cancelled/expired state and decision audit metadata.

Approvals from native or T3-owned child work must be routed to the correct owner, not whichever run is now active. A persisted request may outlive its native callback, so validate that capability before responding. [S06, S08, S34]

**Recommended studio default:** supervised execution for newly paired phones and newly configured projects, explicit elevation for unattended work, and a separate confirmation gate for publishing, emailing, purchases and other external mutations. This is a proposed product policy, not a claim that upstream provides every such domain-specific gate.

Permission policy, filesystem containment and network policy must remain separate. An agent in a Git worktree under the same OS account may still access other readable files or execute commands outside that checkout.

## 9. Discovery and the selector: what “exactly like T3 Code” entails

### Canonical upstream selection shape

The canonical contract is effectively:

```ts
type ModelSelection = {
  instanceId: string;
  model: string;
  options?: Array<{ id: string; value: string | boolean }>;
};
```

The old provider field and object-shaped option records have decode compatibility, but the canonical identity is instanceId. [S10, S11]

Provider option descriptors are select or boolean controls. Select choices have native IDs, labels, optional descriptions/default markers; descriptors can identify a reasoning role even when the native option ID is not reasoningEffort. Custom model entries can carry explicit capabilities. These descriptors should drive both UI controls and server-side validation. [S10]

### Codex discovery and effort

CodexProvider pages through model/list using nextCursor, maps model.model to the slug, and maps supportedReasoningEfforts/defaultReasoningEffort to a reasoningEffort descriptor. It also maps live serviceTiers or older additionalSpeedTiers to a separate serviceTier descriptor. The service-tier “default” sentinel displays as Standard. T3 has an explicit medium-effort default override for the gpt-6-astra family at U. [S07]

The source recognizes labels including none, minimal, low, medium, high, xhigh, max and ultra. **Recognizing a label does not mean every model offers it.** The picker should display only the choices returned for that specific model/instance. API model-page settings, a runtime's tool metadata and a CLI account's live model/list are distinct catalogs.

The public preferred-default Codex list starts with gpt-6-astra, then gpt-5.6-sol and gpt-5.6-terra. The first discovered match becomes T3's default; otherwise the provider's own default remains. This is default selection, not proof that T3 executes an explicitly requested missing model under a substitute name. [S07, S10]

Bare custom Codex slugs can borrow descriptors from the first built-in model in upstream. That is a compatibility convenience, **not evidence that the custom model supports those controls**. The studio should mark such capabilities unverified and require explicit configuration or a successful native capability probe.

### Manifest and other providers

The bundled model manifest supports offline startup and refresh from upstream main. Updates must validate both generic catalog references and provider-owned adapter schemas. A newer bundled updatedAt outranks an older remote cache; invalid fetches retain usable metadata. [S12]

Claude's entire built-in catalog, capability profiles, effort mappings, suffixes/context metadata and CLI compatibility gates are manifest-owned. Codex still discovers executable models from its app server, with manifest classification/version overlays. Known newer models can appear as updateRequiredModels when the installed CLI is too old. A manifest entry is not proof of an account entitlement. [S12, S13, S43]

ACP can advertise config choices after session opening or after a particular model is selected. Upstream warns that writing an option before the agent advertises it can be accepted without effect. Wait for native capability advertisement before applying controls, and distinguish a stored unsupported option from a native rejection. “Default model” sentinels are product state, not literal model IDs to send downstream. [S08]

### UI behavior verified from code

The web picker has:

- Provider-instance navigation and account/instance badges where needed.
- A Favorites tab and per-environment model preferences/order.
- Search over model/provider metadata.
- Current vs expandable legacy models.
- Custom entries, unavailable retained selections, and provider setup actions.
- Notices for models requiring a provider update.
- A docked model/options presentation, keyboard focus handling and a permission footer.
- Model catalog refresh on opening when the environment advertises that capability.

Sources: [S44–S46]. Some parent controls can support selecting multiple models, but a faithful single-run selection still resolves to a particular instance/model/options tuple. Exact screenshots and pixel-level behavior were not evaluated; this was source research, not browser interaction.

### Actual no-fallback semantics: do not overclaim upstream

OrchestratorMcpService honors an explicit providerInstanceId and fails if it is unavailable. An explicitly requested model is validated against the selected provider's advertised list, and explicit invalid option values are rejected. Driver-only selection can choose a healthy instance; switching provider with no named model can use the first advertised model. Inherited selections/options have their own compatibility rules. [S47]

Web modelSelection.ts also contains default-resolution helpers that can choose a default/first model, with special unavailable-selection preservation behavior. CodexAdapterV2 handles native model/rerouted notifications and tracks the actual rerouted model. Thus it would be inaccurate to describe all upstream paths as a universal immutable-model guarantee. [S48, S49]

For the studio, keep the selector behavior while enforcing a deliberately stricter execution contract in section 13.

## 10. Local persistence and reconnect behavior

The execution environment derives paths including:

- userdata/statev2.sqlite
- userdata/attachments
- userdata/logs
- settings.json and keybindings.json
- environment identity, browser artifacts and separate secrets paths.

Development and explicitly configured base directories can alter the root. These are source-defined paths; no actual user-state files were inspected. [S19]

SQLite setup enables foreign keys, busy_timeout = 5000, WAL, synchronous = NORMAL, and maintenance/checkpoint handling. It uses a local Node SQLite client with reader/checkpoint workers. Pending schema migrations require the owning-server lock, protecting a running server from another CLI changing its schema. [S20]

**Durability nuance:** NORMAL reduces per-commit fsync overhead; upstream comments explicitly acknowledge that power/OS failure can roll back post-checkpoint commits without corrupting the database. Do not advertise an absolute zero-data-loss guarantee. Choose FULL or other durability measures for the studio if its business-critical decisions require stronger guarantees, then measure latency. [S20]

Events are not an indefinite audit archive. Upstream prunes covered event history after roughly a day, while keeping required anchors/high-water marks and durable command receipts. Persisted projections therefore cannot generally be rebuilt from the retained event log alone. A reconnect cursor that missed pruned events requires a snapshot. [S03, S21]

For a product studio that sells downloadable artifacts, preserve **business provenance separately**: product briefs, artifact versions/hashes, requested/effective model, approvals, source inputs, publication decisions and export manifests. Short-lived stream replay is a different retention problem.

Keep file bytes on local disk/object storage with IDs and hashes in SQLite. A browser's cached projection, draft state or connection catalog is not the authority for a running daemon.

## 11. Worktrees, checkpoints and orchestration

### Worktrees

WorktreeMcpService handles branch validation, base resolution, optional remote fetch, checkout creation and thread rebinding. With startFromOrigin it resolves a fetched remote base; otherwise the supplied/local commit can be used. Setup and durable thread/workspace association are server-side, not established merely by an agent saying it changed directory. [S50]

A particularly important distinction in source U:

- delegate_task with isolation omitted/shared uses the parent's checkout.
- delegate_task with isolation: worktree resolves the **parent checkout's HEAD**, uses that commit as baseRef and sets startFromOrigin: false.
- Uncommitted parent edits do not appear in that new checkout.
- Top-level thread launch separately accepts an explicit workspace strategy: new worktree, existing worktree, or project root. The intended base must be passed deliberately. [S34, S47, S51]

Do not confuse the orchestration prompt's policy for choosing the default branch for independent new work with the implemented isolated-child default of parent HEAD.

For the studio, model WorkspaceLease / Worktree as a resource owned by a job. Use separate checkouts for concurrent writers, serialize shared-workspace writes, and require an explicit integration step. Git worktrees isolate checkouts, not OS privileges, and are less useful for non-Git binary/document projects unless supplemented by a versioned artifact workspace.

### Checkpoints

Upstream uses hidden Git refs for workspace checkpoints without adding commits to the user's branch. Conversation rollback and filesystem restore must agree. Current architecture guidance explicitly rejects a revert before filesystem mutation when the selected provider cannot roll back its conversation. Older capability design prose permits broader degradation ideas; prefer verified current behavior. [S03, S08]

A new studio should also support immutable artifact versions outside Git: PDFs, ZIPs, image sets, slide decks and product bundles. A Git checkpoint is not an adequate product delivery record by itself.

### T3-owned delegation vs native subagents

Native provider subagents and T3-owned delegated threads are distinct. The latter are durable app threads/tasks with selected instance/model/options and a parent execution relationship. T3 injects its MCP tools so providers can request these tasks. Native subagents may expose fewer controls and have provider-specific lifetimes. [S06, S34]

orchestrator_capabilities lists inherited selection, registered instances, advertised models/options/runtime modes, and availability constraints. The deliberately short list includes current/custom/favorite/caller models according to provider policy; omittedModels and search expose the rest. A short capability result is not the full catalog. [S34]

delegate_task creates durable delegated_task.request intent. It supports role, target, isolation, wait/async behavior, clientRequestId, runtime and interaction mode constraints. Stable request IDs deduplicate retries. Async completion wakes the parent; waiting can end on timeout or actionable questions/approvals without cancelling the child. “Parent turn ended” and “delegated work settled” are separate states. [S34, S47, S51]

The tool explicitly starts the child with the supplied task rather than automatically copying the parent's full conversation. A useful delegation brief therefore includes the concrete goal, findings, relevant artifact paths and unresolved objections; it must not contain secrets. A provider-native subagent may have different context inheritance semantics. [S51]

task_cancel/parent stop operate on child work, not only on the wait. Children cannot gain broader runtime or interaction permissions than the parent. Remote delegation follows linked-environment threads and records remoteChild rather than pretending a foreign thread is local. [S24, S34]

There are also workflows, schedules, thread send/wait/interrupt, linked environments and PR coordination. A digital-product studio need not reproduce this entire tool surface in its first release. The useful transferable part is the durable task graph, permission ceiling, resource ownership and completion semantics.

## 12. Secure local daemon and mobile pairing

This section is a recommended design informed by upstream trust boundaries, not a completed security audit or a claim of a tested new implementation.

### Transport and trust

Start the studio daemon bound to loopback. Desktop uses local authenticated IPC/HTTP/WebSocket. For remote phones, prefer a private tailnet with HTTPS termination (such as Tailscale Serve) or an explicitly enabled HTTPS/WSS tunnel. Do not expose the provider's raw CLI/app-server port to the public network. The phone should reach the studio's authorized command surface, not an unrestricted process transport. [S23, S24, E09]

T3 Connect separates cloud identity/relay reachability from environment authentication. Its broker can issue a one-time proof-bound bootstrap, while the environment issues the actual session. App traffic goes through the environment's tunnel hostname; the relay Worker is not the ordinary HTTP/WebSocket application proxy. The broker is still trusted to request session minting—DPoP does not eliminate that trust. Cloudflare tunnel transport is also not proof of end-to-end confidentiality against the tunnel infrastructure. [S52]

### Proposed pairing flow

1. On the host, the owner selects permissions and generates a short-lived, single-use pairing grant. Default phone grant: observe jobs/artifacts and submit supervised work; exclude unrestricted shell and pairing administration.
2. QR/link identifies daemon/environment ID, connection endpoint, protocol version, expiry and bootstrap material. Keep a web bootstrap secret in the URL fragment, exchange it directly with the daemon, then strip it from history. Upstream uses this hosted-web pattern. Never put reusable session credentials in URLs. [S24]
3. The phone generates a device proof key. For native mobile, use OS-protected key storage; for a browser, use a non-extractable WebCrypto key where supported, with a clear device-loss/re-pairing policy.
4. Pairing exchange binds the authorized grant to that proof key and atomically spends the one-time bootstrap. The host shows the device/permission grant for owner review when required by the selected pairing method.
5. Daemon issues short-lived scoped access credentials and a revocable device/session record. Prefer a standard proof-of-possession mechanism such as DPoP over inventing cryptography. Validate method/URL/token bindings, timestamps, nonce/replay identifiers and audience. Proof-key possession is not proof of user consent. [E10]
6. WebSocket upgrade uses a short-lived route-scoped ticket; proof-bound tickets must require a fresh matching proof. Enforce each RPC's authorization after upgrade. Browser-origin and Host validation should defend against cross-site WebSocket attacks and DNS rebinding.
7. Permit local revocation even when cloud identity is unavailable. Close/restrict revoked sockets and invalidate refresh/pairing descendants according to a defined policy. A reconnect may restore transport; it must not widen permissions.

Upstream implements five-minute default one-time grants, bearer/cookie/DPoP session variants, scoped WebSocket tickets and per-RPC scope checks. It also separates external MCP sessions from ordinary RPC sessions. Those are valuable implementation references. [S23, S53–S55]

**Critical limitation:** a scope that permits a full-access agent or host shell is effectively broad host-user authority. Withholding an “admin” RPC while still allowing an arbitrary host command is not a meaningful restriction. T3's documentation states this explicitly. For a genuinely limited phone, enforce a runtime ceiling and OS sandbox/worker boundary, not just a hidden terminal button. [S23]

### Host hardening and artifact isolation

Recommended minimums:

- No credentials in task prompts, logs, telemetry, artifact manifests, or browser localStorage.
- Provider-managed credential homes or OS keychain storage; keep per-instance account isolation and launch-environment filtering.
- Spawn fixed, validated executables with argument arrays and controlled cwd/env; avoid constructing a shell command from a prompt.
- Process-tree cancellation, output size limits, concurrency limits and resource budgets.
- Independent authorization for filesystem, terminal, job operation, publishing, device management and pairing.
- Artifact previews on a constrained origin/frame. Generated HTML, office files and images are untrusted content; never grant them desktop bridge or privileged daemon APIs.
- Electron nodeIntegration disabled, context isolation and sandboxing enabled, narrow IPC with sender validation, navigation restrictions and CSP. This follows Electron's security guidance. [E11]
- Pairing, catalog diagnostics and connection records must expose metadata, never recoverable raw pairing/session secrets.
- Distinguish client-offline, host-offline, provider-limited, waiting-for-approval and job-failed states. The host must remain running for new local execution; a phone cannot run an unavailable desktop's CLI.

## 13. Recommended provider-selector schema and strict execution contract

The following is a design proposal. It intentionally extends T3's canonical selection with environment routing, provenance and a strict model policy.

```ts
type OptionDescriptor =
  | {
      id: string;                    // native/adapter option id, not UI label
      type: "select";
      role?: "reasoning" | "service-tier" | "context";
      label: string;
      choices: Array<{ id: string; label: string; description?: string }>;
      defaultValue?: string;
      application: "native" | "adapter-mapped" | "prompt-injected";
    }
  | {
      id: string;
      type: "boolean";
      label: string;
      defaultValue?: boolean;
      application: "native" | "adapter-mapped" | "prompt-injected";
    };

type ModelDescriptor = {
  id: string;                        // exact dispatch id; preserve spelling
  label: string;
  lifecycle: "current" | "legacy" | "deprecated";
  origin: "native-discovery" | "manifest" | "user-configured";
  availability: "available" | "unavailable" | "update-required" | "unknown";
  unavailableReason?: string;
  minCliVersion?: string;
  inputModalities?: string[];
  options: OptionDescriptor[];
};

type ProviderCatalog = {
  environmentId: string;
  instanceId: string;                 // installation/account boundary
  driverKind: string;
  label: string;
  cliVersion?: string;
  protocolVersion?: string;
  workspaceScope?: string;            // if cwd affects catalog/config
  revision: string;
  observedAt: string;
  freshness: "fresh" | "stale" | "unverified";
  status: "ready" | "missing-cli" | "signed-out" | "disabled" | "error";
  models: ModelDescriptor[];
  supportedRuntimeModes: string[];
};

type ExecutionSelection = {
  environmentId: string;
  instanceId: string;
  model: { kind: "exact"; id: string }
       | { kind: "provider-default" }; // explicit user choice, resolve once
  options: Array<{ id: string; value: string | boolean }>;
  catalogRevision: string;
  modelPolicy: "exact-or-error";
};

type RunSelectionAudit = {
  requested: ExecutionSelection;
  resolved: {
    modelId: string;
    options: Array<{ id: string; value: string | boolean }>;
    cliVersion?: string;
    protocolVersion?: string;
    catalogRevision: string;
  };
  providerReported?: {
    modelIds: string[];
    options?: Array<{ id: string; value: string | boolean }>;
  };
  mismatch?: {
    kind: "provider-reroute" | "option-ignored" | "unknown-effective-model";
    detail: string;
  };
};
```

Contract rules:

1. **No provider substitution.** A missing environment, instance, executable or authentication state produces a typed error. Never silently route to another account or provider.
2. **No model substitution.** Preserve an unavailable named model in the selector and show why it cannot run. Offer alternatives as explicit choices, not automatic migration.
3. **Resolve defaults visibly.** “Provider default” is a distinct choice, never an arbitrary ID like default passed to every CLI. Resolve it to an actual ID at enqueue/start; store and display the result. Once resolved, retries keep that resolution.
4. **Validate at enqueue and execution.** Catalog changes between selection and dispatch must yield a revalidation result. Stale display cache is allowed; pretending stale capabilities are verified is not.
5. **Validate native options per model.** Preserve option IDs and allowed values. Reject explicitly unsupported options rather than silently dropping them or globally coercing xhigh to high.
6. **Expose mappings.** For providers that map a displayed choice to different flags, store adapter mapping/version. Clearly distinguish native effort from prompt-injected instructions.
7. **Audit the effective result.** Record native model reports/reroute events. Exact-or-error can refuse an unsupported known reroute policy before starting; if a reroute is only reported after work begins, stop further work when possible and surface the mismatch. Do not claim the daemon can undo tokens already consumed or guarantee a provider never reroutes.
8. **Unknown is not verified.** If native effective-model identity is unavailable, report it as unknown. A strict compliance mode may require a provider that can attest enough information or refuse the run.
9. **Keep auto routing separate.** A provider's “auto” model is a deliberate routing policy, not a claim of one exact underlying model. Label it accordingly; it cannot satisfy an immutable underlying-model requirement.
10. **Independent task selection.** A research/writing/design/export worker can inherit the parent's explicit selection or receive a separately approved tuple. No cheap-model auto fallback on quota/error. Retry the same target or return provider_limited/model_unavailable.
11. **Separate helper text generation.** Title/commit-message/transcript helpers have their own named selection policy. They must not quietly become substitutes for the main agent.

Suggested typed errors include environment_unavailable, provider_unavailable, auth_required, model_unavailable, cli_update_required, option_unsupported, catalog_changed, runtime_mode_unsupported, provider_limited and effective_model_mismatch.

Acceptance tests should cover an unavailable retained model, account switch, invalid effort, old CLI, authoritative empty catalog, cached catalog after logout, queued run after catalog change, provider default changes, reported reroute, restart recovery, duplicate submit, stop before native turn-start, and expired approval callbacks. Protocol replay fixtures are especially valuable; upstream specifically recommends real captured provider transcripts instead of only hand-written mock frames. [S08]

## 14. SQLite versus cloud Convex

This is a placement decision, not a claim that one database is universally better.

| Question | Local SQLite authority | Cloud Convex authority |
| --- | --- | --- |
| Local CLI and local files | Daemon owns both and can record jobs beside execution | Still needs a host agent/daemon to execute |
| Offline host operation | Can accept/run jobs without cloud | Cloud calls and shared state require connectivity |
| Phone while host is online | Phone calls daemon over authenticated tunnel | Can coordinate/observe through cloud, but execution remains on host |
| Phone while host is offline | Cached data only unless another service stores requests | Can store requested work for later delivery; cannot make the offline CLI run |
| Team collaboration | Requires an explicit sharing/sync service | Reactive shared state and auth integration are useful |
| Privacy | Data can remain on host by default | Requires a declared uploaded-data/credential boundary |
| Failure semantics | One execution owner and local transaction/outbox | Must handle cloud/host acknowledgements, retries, ordering and split authority |
| Product operations | Simple local backup/export | Useful for accounts, subscriptions, cloud metadata and notifications |

SQLite's documentation positions it for application/device-local storage, and WAL requires processes using a database to be on the same host; sharing the live database file over a network filesystem is not the remote-client design. Use the daemon API. [E03, E04]

Convex offers reactive client queries and server functions. Its actions have a documented ten-minute timeout; they are not a persistent supervisor for an arbitrary long-lived local CLI session. Using Convex for metadata or queue coordination still leaves native session/process recovery on the execution host. [E05, E12]

**Recommendation:** local-first, optional cloud coordination.

Local authoritative data:

- Provider instance configuration references and protected auth handles.
- Catalog snapshots and provenance.
- Projects/workspaces/worktree leases.
- Threads, messages, run attempts, nodes, runtime requests.
- Command receipts and effect outbox.
- Artifact versions, hashes and delivery manifests.
- Local approval/publication audit records.

Optional cloud data, only with explicit product requirements/consent:

- Account/org/device membership and subscription state.
- Encrypted or minimized environment descriptors.
- Job request envelopes awaiting host acceptance.
- Selected job status/artifact metadata for collaborators.
- Notification routing and explicitly shared artifact blobs.

If cloud job intake is added, use a host-acknowledged command envelope with globally stable command ID, selected environment/instance/model, permission ceiling, expected revision and expiry. Persist the local receipt before acknowledging acceptance; cloud retries must return that receipt, not start duplicate work. Never allow a cloud admin/relay compromise to silently replace local executable paths or widen runtime modes.

A cloud record saying “queued” means requested, not accepted by the host. Keep requested, accepted, running and settled distinct.

## 15. Recommended implementation stack and original studio scope

These are recommendations, not implemented changes.

| Layer | Recommended choice | Rationale |
| --- | --- | --- |
| Language/workspace | TypeScript monorepo with isolated contracts/provider packages | Shared validated contracts across daemon and clients |
| Local daemon | Node on a maintained compatible release; structured process management | Strong CLI/SDK ecosystem and cross-platform process access |
| Runtime framework | Effect if the team can support it; otherwise explicit services/cancellation/outbox | T3 demonstrates the value, but copying framework complexity is optional |
| Web UI | React + Vite + a router, capability-driven selector | No requirement for Next.js server execution to operate local CLIs |
| Desktop | Electron first when parity with T3/native Node integrations matters | Same UI and daemon lifecycle; harden the renderer boundary |
| Storage | SQLite migrations + transactional outbox; artifact bytes on disk | Single execution owner and offline capability |
| Providers | Codex app-server and Claude Agent SDK first; ACP extension boundary | Deep lifecycle/approval parity before a broad unverified provider list |
| Client transport | Versioned authenticated WebSocket RPC + bounded HTTP routes | Subscriptions, approvals, stop/steer and reconnect |
| Remote access | Private tailnet/HTTPS first; optional managed tunnel later | Reduces first-release broker/identity complexity |
| Phone | Responsive web/PWA control surface first | Validate remote job/approval UX before maintaining native apps |
| Native phone later | Separate native UI sharing contracts/client runtime | T3's architecture supports that separation |
| Cloud | Optional Convex control/coordination plane | Useful when actual team/subscription requirements justify it |
| Verification | Unit tests for state decisions + real-protocol replays + targeted live compatibility checks | Provider protocols, stop/approval timing and resume are the hard parts |

Do not pin a new app to U's exact development versions merely because they appear in this report. Select supported releases and reproduce the provider compatibility tests.

For an **original digital-product studio**, put original domain objects above the execution layer:

- Product brief, intended customer, source/reference pack and content/license notes.
- Research, outline, authoring/design, QA and packaging stages.
- Product/version/artifact registry with content hashes and format metadata.
- Export packs such as Markdown, PDF, DOCX, PPTX, image sets and ZIPs.
- Preview and approval surfaces for the actual deliverable.
- Explicit publication/delivery jobs that are separate from drafting.
- Per-stage requested/effective provider settings and traceable inputs.

Local coding-agent CLIs can drive tools that create these files, but do not themselves guarantee publication quality, factual accuracy, license compliance or a valid marketplace upload. Treat generation, validation, packaging and publishing as separate jobs with inspectable artifacts.

For an open-source release, keep the local daemon, provider adapters, contracts, workflow engine and local export path usable without the optional cloud. Paid hosted coordination can be a separate service without making local work depend on a cloud login.

## 16. Remaining uncertainties and validation needed

1. **Installed build provenance:** package commit I matches public upstream, but no signed release checksum or reproducible build comparison was performed. A preserved commit field does not exclude local modifications.
2. **No private runtime catalog inspection:** installed CLI versions, signed-in accounts, actual model entitlements and model/list output were intentionally not queried. Exact provider/effort availability on this machine remains unverified.
3. **Model names:** gpt-6.1-sol and gpt-6-astra are verified public identifiers at the researched date. That does not prove universal access or that runtime-specific ultra/service-tier options match public API documentation.
4. **Current U vs installed I:** the public baseline is newer. Registry additions, protocol details and selector behavior can differ; only explicitly inspected installed bundle facts are attributed to I.
5. **Documentation drift:** some orchestration design docs show simplified or older contracts. Actual ModelSelection, ProviderAdapterV2SessionRuntime, orchestratorMcp schemas and service implementations take precedence. Capability documents are architecture guidance, not a guarantee of every driver's implementation.
6. **No dynamic compatibility test:** no agent sessions, hooks, MCP servers, provider login, CLI execution or builds were started. Stop/approval/recovery conclusions are source-backed, not locally reproduced.
7. **Cloud/provider terms and costs:** no commercial entitlement or redistribution audit was completed. No current cost estimate is inferred from model IDs alone.
8. **Security:** this is an architectural boundary review, not a completed penetration test or comprehensive code audit. The pairing design requires focused implementation review, replay/expiry tests and sandbox validation before exposure.
9. **Exact visual parity:** no UI browser test/screenshot comparison was performed. Source verifies behavior and components, not exact installed screen appearance.
10. **Non-Git product workflows:** checkpoint/version/export behavior for binary artifacts is a recommended extension, not established upstream T3 functionality.

## 17. Primary source index

All S-links are pinned to revision U unless marked otherwise. Line anchors identify useful entry points, not a claim that all relevant code fits at one line. Retrieved source snapshots remain in the private research workspace; public URLs below are the portable evidence.

### Identity and architecture

- **S01:** [Repository and pinned revision](https://github.com/pingdotgg/t3code/tree/7d71f852a8edd298ffde67c295760c286a71a27c).
- **S02:** [LICENSE](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/LICENSE).
- **S03:** [docs/internals/overview.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/overview.md).
- **S04:** [docs/internals/connection-runtime.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/connection-runtime.md).

### Provider boundaries and discovery

- **S05:** [packages/provider-core/src/server/driver.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-core/src/server/driver.ts).
- **S06:** [packages/provider-core/src/server/ProviderAdapter.ts, runtime interface](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-core/src/server/ProviderAdapter.ts#L649).
- **S07:** [apps/server/src/provider/CodexProvider.ts, options and discovery](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/provider/CodexProvider.ts#L218).
- **S08:** [docs/internals/providers.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/providers.md) and [adding-a-provider.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/adding-a-provider.md).
- **S09:** [apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts, query runner](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L1413).
- **S10:** [packages/contracts/src/model.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/contracts/src/model.ts).
- **S11:** [packages/contracts/src/modelSelection.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/contracts/src/modelSelection.ts).
- **S12:** [docs/internals/model-manifest.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/model-manifest.md).
- **S13:** [apps/server/src/provider/model-manifest.json](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/provider/model-manifest.json).

### Stack and persistence

- **S14:** [pnpm-workspace.yaml](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/pnpm-workspace.yaml).
- **S15:** [apps/web/package.json](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/web/package.json).
- **S16:** [apps/server/package.json](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/package.json) and [apps/desktop/package.json](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/desktop/package.json).
- **S17:** [apps/mobile/package.json](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/mobile/package.json).
- **S18:** [apps/server/src/provider/builtInDrivers.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/provider/builtInDrivers.ts).
- **S19:** [apps/server/src/config.ts, derived paths](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/config.ts#L146).
- **S20:** [apps/server/src/persistence/Sqlite.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/persistence/Sqlite.ts).
- **S21:** [apps/server/src/orchestration-v2/ProjectionMaintenance.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/ProjectionMaintenance.ts#L255).
- **S22:** [apps/server/src/persistence/DatabaseStorage.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/persistence/DatabaseStorage.ts).

### Auth, remote and provider transports

- **S23:** [docs/internals/environment-auth.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/environment-auth.md).
- **S24:** [docs/internals/remote.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/remote.md).
- **S25:** [packages/provider-acp/src/server/adapter.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-acp/src/server/adapter.ts).
- **S26:** [OpenCode 1.x adapter](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-opencode/src/server/adapter.ts) and [2.x adapter](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-opencode/src/server/v2/adapter.ts).
- **S27:** [packages/provider-pi/src/server/adapter.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-pi/src/server/adapter.ts).
- **S28:** [packages/provider-cursor/src/server/adapter.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-cursor/src/server/adapter.ts).
- **S29:** [packages/provider-muse/src/server/adapter.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/provider-muse/src/server/adapter.ts).
- **S30:** [packages/contracts/src/rpc.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/contracts/src/rpc.ts).
- **S31:** [apps/server/src/ws.ts, WebSocket RPC construction](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/ws.ts#L3458).
- **S32:** [apps/server/src/provider/codexLaunchArgs.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/provider/codexLaunchArgs.ts).
- **S33:** [packages/effect-codex-app-server/src/client.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/effect-codex-app-server/src/client.ts) and [protocol.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/effect-codex-app-server/src/protocol.ts).

### Lifecycle, selection and orchestration

- **S34:** [docs/orchestration-v2/orchestrator-mcp-server.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/orchestration-v2/orchestrator-mcp-server.md). Descriptive prose includes some older simplified schemas; S47/S51 are authoritative for exact current arguments.
- **S35:** [docs/orchestration-v2/core-graph-and-data-model.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/orchestration-v2/core-graph-and-data-model.md).
- **S36:** [apps/server/src/orchestration-v2/EventSink.ts, commit path](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/EventSink.ts#L691).
- **S37:** [apps/server/src/orchestration-v2/Orchestrator.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/Orchestrator.ts).
- **S38:** [apps/server/src/orchestration-v2/EffectWorker.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/EffectWorker.ts).
- **S39:** [apps/server/src/orchestration-v2/RunFinalizationService.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/RunFinalizationService.ts).
- **S40:** [docs/orchestration-v2/provider-switching-and-context.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/orchestration-v2/provider-switching-and-context.md).
- **S41:** [docs/user/permission-modes.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/user/permission-modes.md).
- **S42:** [apps/server/src/orchestration-v2/RuntimePolicy.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/RuntimePolicy.ts).
- **S43:** [ClaudeModelCatalog.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/provider/ClaudeModelCatalog.ts), [ClaudeModelManifest.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/provider/ClaudeModelManifest.ts) and [codexModelCatalog.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/provider/codexModelCatalog.ts).
- **S44:** [apps/web/src/components/chat/ProviderModelPicker.tsx](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/web/src/components/chat/ProviderModelPicker.tsx).
- **S45:** [apps/web/src/components/chat/ModelPickerContent.tsx](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/web/src/components/chat/ModelPickerContent.tsx).
- **S46:** [apps/web/src/components/chat/ProviderModelPicker.logic.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/web/src/components/chat/ProviderModelPicker.logic.ts).
- **S47:** [apps/server/src/mcp/OrchestratorMcpService.ts, target resolution](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/mcp/OrchestratorMcpService.ts#L1329), [isolated child base](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/mcp/OrchestratorMcpService.ts#L2474).
- **S48:** [apps/web/src/modelSelection.ts, default-resolution helpers](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/web/src/modelSelection.ts#L249).
- **S49:** [apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts, model reroute](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L4748).
- **S50:** [apps/server/src/mcp/WorktreeMcpService.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/mcp/WorktreeMcpService.ts#L214).
- **S51:** [packages/contracts/src/orchestratorMcp.ts, target/delegation schemas](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/packages/contracts/src/orchestratorMcp.ts#L94) and [toolkit](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/mcp/toolkits/orchestrator/tools.ts).
- **S52:** [docs/internals/t3-connect.md](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/docs/internals/t3-connect.md).
- **S53:** [apps/server/src/auth/PairingGrantStore.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/auth/PairingGrantStore.ts#L261).
- **S54:** [apps/server/src/auth/SessionStore.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/auth/SessionStore.ts).
- **S55:** [apps/server/src/auth/RpcAuthorization.ts](https://github.com/pingdotgg/t3code/blob/7d71f852a8edd298ffde67c295760c286a71a27c/apps/server/src/auth/RpcAuthorization.ts#L284).

### Installed evidence and its matching public source

- **I01:** Local read-only archives and entries enumerated in section 2; physical files E:/T3Code/app/resources/app.asar and E:/T3Code/app/resources/server.asar.
- **I02:** [Public commit matching the installed declared revision](https://github.com/pingdotgg/t3code/commit/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268), [model contracts at I](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/packages/contracts/src/model.ts), [model manifest at I](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/apps/server/src/provider/model-manifest.json), and [orchestration toolkit at I](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/apps/server/src/mcp/toolkits/orchestrator/tools.ts).

### External primary documentation retrieved on the research date

- **E01:** [Official Codex App Server documentation](https://learn.chatgpt.com/docs/app-server), especially Protocol, Models/model-list, lifecycle and approvals.
- **E02:** [Official GPT-6.1 Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [GPT-6 Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra). These establish public identifiers, not this host's entitlement.
- **E03:** [SQLite: appropriate uses](https://sqlite.org/whentouse.html).
- **E04:** [SQLite: WAL](https://sqlite.org/wal.html).
- **E05:** [Convex actions](https://docs.convex.dev/functions/actions).
- **E06:** [Claude Code programmatic/headless usage](https://code.claude.com/docs/en/headless).
- **E07:** [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview).
- **E08:** [Agent Client Protocol overview](https://agentclientprotocol.com/protocol/v1/overview).
- **E09:** [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve).
- **E10:** [RFC 9449: OAuth DPoP](https://www.rfc-editor.org/rfc/rfc9449).
- **E11:** [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
- **E12:** [Convex React client documentation](https://docs.convex.dev/client/react/overview).

External documentation is mutable and not revision-pinned. The source-pinned implementation evidence above should be retained when the report is used to make later design decisions.

