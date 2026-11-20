import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import {
  getProviderSkillsForSlashMenu,
  hasCompleteProviderWorkspaceSnapshot,
  resolveProviderSkillsForCwd,
} from "@t3tools/client-runtime/providerSkills";
import { createEnvironmentRpcCommand, runAtomCommand } from "@t3tools/client-runtime/state/runtime";
import {
  ORCHESTRATION_V2_WS_METHODS,
  type EnvironmentId,
  ModelSelection,
  type OrchestrationV2ThreadProjection,
  type ProjectId,
  type ThreadId,
} from "@t3tools/contracts";
import { createModelSelection, modelSelectionsEqual, pickModelSelection } from "@t3tools/shared/model";
import { useRouter } from "@tanstack/react-router";
import * as Schema from "effect/Schema";
import { useGT } from "gt-react";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

import { ProviderModelPicker } from "../../components/chat/ProviderModelPicker";
import { TraitsPicker } from "../../components/chat/TraitsPicker";
import { getComposerProviderState } from "../../components/chat/composerProviderState";
import { connectionAtomRuntime } from "../../connection/runtime";
import type { NewThreadHandler } from "../../hooks/useHandleNewThread";
import type { useScratchProject } from "../../hooks/useScratchProject";
import { getLocalStorageItem, useLocalStorage } from "../../hooks/useLocalStorage";
import { canUsePinnedModel } from "../../modelSelection";
import { NO_PROVIDER_MODEL_SELECTION, providerInstanceEntriesFor, type ProviderInstanceEntry } from "../../providerInstances";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { useBuilderRouteCatalog } from "./builderAssistantRouteCatalog";
import {
  BUILDER_ASSISTANT_MAX_PENDING,
  BUILDER_ASSISTANT_MAX_PROMPT_CHARS,
  BUILDER_ASSISTANT_MAX_REPLY_CHARS,
} from "./builderAssistantRouteLimits";
import { draftStages, type DraftEditor } from "./drafts";
import { rememberProjectChat } from "./projectIndex";

export interface BuilderAssistantRouteRequest {
  readonly projectId: string;
  readonly stage: string;
  readonly requestId: string;
  readonly prompt: string;
  readonly routeKey: string;
}

export interface BuilderAssistantBridge {
  readonly selector: ReactNode;
  readonly hasAvailableProviders: boolean;
  readonly availableSkills?: readonly string[];
  readonly routeKey: string | null;
  readonly routeLabel: string | null;
  open(request: BuilderAssistantRouteRequest, signal?: AbortSignal): Promise<void>;
  read(request: BuilderAssistantRouteRequest): Promise<string | null>;
}

function keyForRoute(selection: ModelSelection) {
  const options = [...(selection.options ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify([selection.instanceId, selection.model, options.map(({ id, value }) => [id, value])]);
}

function composerSelection(entry: ProviderInstanceEntry, selection: ModelSelection) {
  const state = getComposerProviderState({
    provider: entry.driverKind, models: entry.models, model: selection.model, modelOptions: selection.options,
  });
  return createModelSelection(entry.instanceId, selection.model, state.modelOptionsForDispatch);
}

interface Binding {
  readonly request: BuilderAssistantRouteRequest;
  readonly scratchProjectId: ProjectId;
  readonly threadId: ThreadId;
  readonly selection: ModelSelection;
}

// The pending review and its thread association share the lifetime of the Studio tab.
// A new request replaces the previous association for this project step.
const bindings = new Map<string, Binding>();
const savedSelectionSchema = Schema.NullOr(ModelSelection);
const presetKey = (environmentId: EnvironmentId | null, projectId: string | null) =>
  "open-product-studio:builder-route:1:" + JSON.stringify([environmentId, projectId]);
const bindingKey = (environmentId: EnvironmentId, request: BuilderAssistantRouteRequest) =>
  JSON.stringify([environmentId, request.projectId, request.stage]);

const readThread = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "studio:builder-assistant:read-thread",
  tag: ORCHESTRATION_V2_WS_METHODS.getThreadProjection,
});

function completedReply(binding: Binding, projection: OrchestrationV2ThreadProjection): string | null {
  const { threadId, request, scratchProjectId, selection } = binding;
  if (projection.thread.id !== threadId || projection.thread.projectId !== scratchProjectId) return null;
  const index = projection.messages.findIndex(message => message.role === "user");
  const sent = projection.messages[index];
  if (!sent || sent.threadId !== threadId || sent.runId === null || sent.text !== request.prompt ||
      sent.attachments.length || sent.context?.records.length || sent.context?.guest ||
      sent.senderThreadId || sent.linkedSender || sent.scheduledTaskId || sent.workflowScript) return null;
  const run = projection.runs.find(candidate => candidate.id === sent.runId);
  if (!run || run.threadId !== threadId || run.userMessageId !== sent.id || run.status !== "completed" ||
      run.providerInstanceId !== selection.instanceId || !modelSelectionsEqual(run.modelSelection, selection)) return null;
  const items = projection.turnItems.filter(item => item.runId === run.id);
  const nodes = projection.nodes.filter(node => node.runId === run.id);
  const attempts = projection.attempts.filter(attempt => attempt.runId === run.id);
  // Studio accepts text-only turns. Native tools may have run in T3 before this import.
  if (items.some(item => item.threadId !== threadId || ![
    "user_message", "assistant_message", "reasoning", "thread_created", "system_notice", "checkpoint",
  ].includes(item.type)) ||
      nodes.some(node => node.threadId !== threadId || !["root_turn", "assistant_message", "reasoning", "system"].includes(node.kind)) ||
      projection.runtimeRequests.some(request => nodes.some(node => node.id === request.nodeId)) ||
      projection.subagents.some(agent => agent.runId === run.id) ||
      attempts.some(attempt => attempt.providerInstanceId !== selection.instanceId)) return null;
  const nativeTurns = projection.providerTurns.filter(turn =>
    attempts.some(attempt => attempt.id === turn.runAttemptId || attempt.providerTurnId === turn.id) ||
    items.some(item => item.providerTurnId === turn.id));
  if (nativeTurns.some(turn => turn.model !== undefined && turn.model !== selection.model)) return null;
  const later = projection.messages.slice(index + 1);
  const last = later.findLastIndex(message =>
    message.role === "assistant" && message.threadId === threadId && message.runId === run.id);
  const answer = later[last];
  if (!answer || answer.streaming || answer.text.length > BUILDER_ASSISTANT_MAX_REPLY_CHARS ||
      !answer.text.trim() || later.slice(0, last).some(message => message.role === "user")) return null;
  const item = items.find(candidate => candidate.type === "assistant_message" && candidate.messageId === answer.id);
  if (item?.type !== "assistant_message" || item.streaming || item.status !== "completed" ||
      (item.phase !== undefined && item.phase !== "final_answer")) return null;
  return answer.text;
}

export function useBuilderAssistantRoute(input: {
  environmentId: EnvironmentId | null;
  projectId: string | null;
  scratchRoot: string | null;
  activeEditor: RefObject<DraftEditor | null>;
  claimOpening(signal: AbortSignal): boolean;
  releaseOpening(signal: AbortSignal): void;
  openScratchProject: ReturnType<typeof useScratchProject>["openScratchProject"];
  openThread: NewThreadHandler;
}): BuilderAssistantBridge & {
  projectPreset(projectId: string, scratchProjectId?: ProjectId): ModelSelection | null;
} {
  const { environmentId, projectId, scratchRoot, activeEditor, claimOpening, releaseOpening, openScratchProject, openThread } = input;
  const router = useRouter();
  const gt = useGT();
  const { settings, providers, entries, choices, modelOptions } = useBuilderRouteCatalog(environmentId, scratchRoot);
  const [saved, save] = useLocalStorage(presetKey(environmentId, projectId), null, savedSelectionSchema);
  const selected = environmentId && projectId ? saved : null;
  const entry = entries.find(candidate => candidate.instanceId === selected?.instanceId);
  const usable = (candidate: ProviderInstanceEntry | undefined, selection: ModelSelection) =>
    !!candidate && canUsePinnedModel(settings, candidate, selection.model) &&
    modelSelectionsEqual(selection, composerSelection(candidate, selection));
  const routeKey = selected && usable(entry, selected) ? keyForRoute(selected) : null;
  function projectPreset(id: string, scratchProjectId?: ProjectId): ModelSelection | null {
    const draft = activeEditor.current?.snapshot().draft;
    if (!environmentId || !draft || draft.id !== id || draft.workspaceId !== environmentId || draft.category === "day-trader") {
      throw new Error("Open the saved builder before preparing a draft.");
    }
    const preset = getLocalStorageItem(presetKey(environmentId, id), savedSelectionSchema);
    if (preset === null) return null;
    const target = (scratchProjectId ? providerInstanceEntriesFor(providers, settings, scratchProjectId) : entries)
      .find(candidate => candidate.instanceId === preset.instanceId);
    if (!usable(target, preset)) throw new Error("The project model or its selected options are unavailable.");
    return preset;
  }
  const owner = JSON.stringify([environmentId, projectId, routeKey, scratchRoot]);
  const opening = useRef<{ owner: string; controller: AbortController } | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Retire the in-flight T3 RPC when its project, provider selection or scratch workspace leaves the screen.
  useLayoutEffect(() => () => {
    if (opening.current?.owner === owner) opening.current.controller.abort();
  }, [owner]);

  function select(selection: ModelSelection) {
    const next = entries.find(candidate => candidate.instanceId === selection.instanceId);
    if (environmentId && projectId && next && canUsePinnedModel(settings, next, selection.model)) {
      save(composerSelection(next, selection));
    }
  }

  function editorFor(request: BuilderAssistantRouteRequest) {
    const editor = activeEditor.current;
    const view = editor?.snapshot();
    if (!view || view.status !== "saved" || request.projectId !== projectId || view.draft.workspaceId !== environmentId ||
        view.draft.id !== request.projectId || view.draft.category === "day-trader" ||
        view.draft.stage !== request.stage || !draftStages(view.draft.category).includes(request.stage)) return null;
    return editor;
  }

  async function open(request: BuilderAssistantRouteRequest, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const editor = editorFor(request);
    if (!environmentId || !scratchRoot || !editor) throw new Error("Open the saved builder step to request assistance.");
    if (!selected || !routeKey || request.routeKey !== routeKey) throw new Error("Review an available model and its options.");
    if (!request.requestId.trim() || request.requestId.length > 256 || !request.prompt.trim() ||
        request.prompt.length > BUILDER_ASSISTANT_MAX_PROMPT_CHARS) throw new Error("Review a bounded builder request.");
    const operation = new AbortController();
    const guard = signal ? AbortSignal.any([signal, operation.signal]) : operation.signal;
    if (!claimOpening(guard)) throw new Error("Another agent draft is opening.");
    opening.current = { owner, controller: operation };
    const href = router.state.location.href;
    const unsubscribe = editor.subscribe(() => operation.abort());
    try {
      const target = await openScratchProject(environmentId);
      guard.throwIfAborted();
      if (router.state.location.href !== href || editorFor(request) !== editor) {
        throw new DOMException("The reviewed step has changed.", "AbortError");
      }
      if (!target || target.environmentId !== environmentId) throw new Error("The local agent workspace is unavailable.");
      const targetEntry = providerInstanceEntriesFor(providers, settings, target.id)
        .find(candidate => candidate.instanceId === selected.instanceId);
      if (!usable(targetEntry, selected)) throw new Error("The reviewed model is unavailable in this workspace.");
      const opened = await openThread(scopeProjectRef(environmentId, target.id), {
        freshDraft: { prompt: request.prompt, modelSelection: selected }, signal: guard,
      });
      if (!opened) {
        guard.throwIfAborted();
        throw new Error("Could not open the reviewed assistant draft.");
      }
      const key = bindingKey(environmentId, request);
      bindings.delete(key);
      if (bindings.size >= BUILDER_ASSISTANT_MAX_PENDING) {
        const oldest = bindings.keys().next().value;
        if (oldest !== undefined) bindings.delete(oldest);
      }
      bindings.set(key, {
        request: { ...request }, scratchProjectId: target.id, threadId: opened.threadId, selection: selected,
      });
      rememberProjectChat(environmentId, request.projectId, { ...opened, projectId: target.id });
    } finally {
      unsubscribe();
      if (opening.current?.controller === operation) opening.current = null;
      releaseOpening(guard);
    }
  }

  async function read(request: BuilderAssistantRouteRequest) {
    const editor = editorFor(request);
    if (!environmentId || !scratchRoot || !editor) return null;
    const view = editor.snapshot();
    const key = bindingKey(environmentId, request);
    const binding = bindings.get(key);
    if (!binding || binding.request.requestId !== request.requestId || binding.request.routeKey !== request.routeKey ||
        binding.request.prompt !== request.prompt) return null;
    const result = await runAtomCommand(appAtomRegistry, readThread, {
      environmentId, input: { threadId: binding.threadId },
    }, { reportFailure: false });
    if (result._tag !== "Success" || bindings.get(key) !== binding || editorFor(request) !== editor ||
        editor.snapshot() !== view) return null;
    return completedReply(binding, result.value);
  }

  const singleChoice = !selected && choices.length === 1 ? choices[0] : null;
  const choiceEntry = singleChoice ? entries.find(candidate => candidate.instanceId === singleChoice.instanceId) : null;
  const quickPick = singleChoice && choiceEntry ? composerSelection(choiceEntry, singleChoice) : null;
  const label = (selection: ModelSelection, selectedEntry?: ProviderInstanceEntry | null) =>
    [selectedEntry ? selectedEntry.displayName + " (" + selectedEntry.instanceId + ")" : selection.instanceId,
     selection.model, ...(selection.options ?? []).map(option => option.id + "=" + option.value)].join(" · ");
  const selector = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <ProviderModelPicker
        environmentId={environmentId}
        workspaceCwd={scratchRoot}
        activeInstanceId={selected?.instanceId ?? choices[0]?.instanceId ?? NO_PROVIDER_MODEL_SELECTION.instanceId}
        model={selected?.model ?? ""}
        instanceEntries={entries}
        lockedProvider={null}
        modelOptionsByInstance={modelOptions}
        triggerAriaLabel={gt("Choose assistant model")}
        {...(!selected ? { triggerLabel: gt("Choose model") } : !routeKey ? { triggerLabel: gt("{model} (unavailable)", { model: selected.model }) } : {})}
        getModelDisabledReason={(instanceId, model) => {
          const candidate = entries.find(option => option.instanceId === instanceId);
          return candidate && canUsePinnedModel(settings, candidate, model) ? null : gt("Model unavailable on this connection");
        }}
        onInstanceModelChange={(instanceId, model) => select(pickModelSelection(selected, instanceId, model))}
        onOpenProviderSetup={instanceId => {
          if (environmentId) void router.navigate({ to: "/settings/providers", search: { environmentId, instanceId } });
        }}
      />
      {entry && selected && (
        <TraitsPicker provider={entry.driverKind} instanceId={entry.instanceId} model={selected.model}
          models={entry.models} modelOptions={selected.options} disabled={!routeKey} allowPromptInjectedEffort={false}
          onModelOptionsChange={options => select(createModelSelection(entry.instanceId, selected.model, options))} />
      )}
      {quickPick && <button type="button" className="rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => select(quickPick)}>
        {gt("Use {route}", { route: label(quickPick, choiceEntry) })}
      </button>}
    </div>
  );
  const routeLabel = selected ? label(selected, entry) + (routeKey ? "" : " · Unavailable") : null;
  const availableSkills = routeKey && entry && hasCompleteProviderWorkspaceSnapshot(entry.snapshot, scratchRoot)
    ? getProviderSkillsForSlashMenu(resolveProviderSkillsForCwd(entry.snapshot, scratchRoot), true).map(skill => skill.name)
    : undefined;
  return { selector, hasAvailableProviders: choices.length > 0, routeKey, routeLabel, open, read, projectPreset,
    ...(availableSkills ? { availableSkills } : {}) };
}
