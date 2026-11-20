import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { modelSelectionsEqual } from "@t3tools/shared/model";
import { useBlocker, useRouter, useRouterState } from "@tanstack/react-router";
import { projectFromHash, studioProjectHash } from "../features/studio/projectNavigation";
import { rememberProjectChat } from "../features/studio/projectIndex";
import { useLayoutEffect, useRef } from "react";

import StudioWorkspace, { type StudioAgentRequest } from "../features/studio/StudioWorkspace";
import { useBuilderAssistantRoute } from "../features/studio/builderAssistantRoute";
import { BUILDER_TOOL_SETTINGS_ID } from "../features/studio/builderToolRegistry";
import {
  clipEvidencePrompt,
  clipImageDigest,
  isClipContactSheet,
  readBoundClipReply,
  readBoundClipSelection,
  rememberClipThread,
} from "../features/studio/clipComposer";
import { readClipEvidence } from "../features/studio/clipPicks";
import type { ClipperEvidence } from "../features/studio/clipperEvidence";
import { type DraftEditor } from "../features/studio/drafts";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { useScratchProject } from "../hooks/useScratchProject";
import { workspaceAreaProps } from "../lib/workspaceFocus";
import { usePrimaryEnvironmentId } from "../state/environments";
import { rememberComposerImageBytes } from "./chat/composerAttachmentFiles";
import { SidebarInset } from "./ui/sidebar";
import { StudioWorkspaceHeader } from "./StudioWorkspaceHeader";

/** Desktop-only entry. Source drafts and provider sessions are scoped to the local engine. */
export default function StudioLanding() {
  const localId = usePrimaryEnvironmentId();
  const router = useRouter();
  const routeProjectId = useRouterState({
    select: state => localId ? projectFromHash(state.location.hash, localId) : null,
  });
  const { openScratchProject, scratchWorkspaceRootFor } = useScratchProject();
  const openThread = useNewThreadHandler();
  const pending = useRef<AbortSignal | null>(null);
  const activeEditor = useRef<DraftEditor | null>(null);
  const clipOpening = useRef<AbortController | null>(null);
  const scratchRoot = localId ? scratchWorkspaceRootFor(localId) : null;
  const builderAssistant = useBuilderAssistantRoute({
    environmentId: localId, projectId: routeProjectId, scratchRoot,
    activeEditor, openScratchProject, openThread,
    claimOpening(signal) {
      if (pending.current && !pending.current.aborted) return false;
      pending.current = signal;
      return true;
    },
    releaseOpening(signal) {
      if (pending.current === signal) pending.current = null;
    },
  });
  useLayoutEffect(() => () => clipOpening.current?.abort(), [localId]);
  useBlocker({
    shouldBlockFn: async () => {
      const editor = activeEditor.current;
      if (!editor || editor.snapshot().status === "saved") return false;
      await editor.flush();
      return editor.snapshot().status !== "saved";
    },
    enableBeforeUnload: () => {
      const editor = activeEditor.current;
      return !!editor && editor.snapshot().status !== "saved";
    },
  });

  async function openRecommendation(request: StudioAgentRequest) {
    request.signal.throwIfAborted();
    if (activeEditor.current?.snapshot().draft.category === "day-trader") {
      throw new Error("Day Trader assistance runs offline.");
    }
    if (!localId || request.workspaceId !== localId || !scratchWorkspaceRootFor(localId)) {
      throw new Error("The local agent workspace is unavailable. Your Studio draft is saved.");
    }
    if (pending.current && !pending.current.aborted) {
      throw new Error("Another agent draft is opening.");
    }
    const clipEditor = clipEditorFor(request.projectId);
    const scope = request.clipSettingsScope;
    const followup = request.clipSettingsFollowup === true || scope !== undefined;
    const owner = activeEditor.current;
    const clipView = owner?.snapshot();
    if (!owner || clipView?.status !== "saved" || clipView.draft.id !== request.projectId ||
        clipView.draft.workspaceId !== localId || clipView.draft.stage !== request.stepId) {
      throw new Error("Open the saved builder step before preparing a draft.");
    }
    const reviewedPreset = followup ? null : builderAssistant.projectPreset(request.projectId);
    if (followup && (!clipEditor || (scope !== undefined && !scope.trim()))) {
      throw new Error("Open the Clipper edit to request settings.");
    }
    const href = router.state.location.href;
    pending.current = request.signal;
    try {
      const scratch = await openScratchProject(localId);
      request.signal.throwIfAborted();
      if (!scratch || scratch.environmentId !== localId) {
        throw new Error("Could not prepare a local agent workspace.");
      }
      const source = followup
        ? readClipEvidence(clipView?.draft.fields.clipSourceEvidence)
        : undefined;
      const modelSelection = followup
        ? source ? await readBoundClipSelection(localId, request.projectId, source.sourceRevision, request.signal) : null
        : builderAssistant.projectPreset(request.projectId, scratch.id);
      request.signal.throwIfAborted();
      if (router.state.location.href !== href || activeEditor.current !== owner || owner.snapshot() !== clipView ||
          (!followup && !samePreset(reviewedPreset, modelSelection))) {
        throw new DOMException("The reviewed builder step or model has changed.", "AbortError");
      }
      const opened = await openThread(scopeProjectRef(localId, scratch.id), {
        freshDraft: { prompt: request.prompt, modelSelection },
        signal: request.signal,
      });
      if (!opened) {
        request.signal.throwIfAborted();
        throw new Error("Could not open a recommendation draft.");
      }
      rememberProjectChat(localId, request.projectId, { ...opened, projectId: scratch.id });
      if (scope !== undefined) {
        rememberClipThread({
          environmentId: localId,
          projectId: request.projectId,
          scope: "settings:" + scope,
          scratchProjectId: scratch.id,
          threadId: opened.threadId,
          prompt: request.prompt,
        });
      }
    } finally {
      if (pending.current === request.signal) pending.current = null;
    }
  }

  function clipEditorFor(projectId: string) {
    const editor = activeEditor.current;
    const draft = editor?.snapshot().draft;
    if (draft?.id === projectId && draft.category === "clipper" && draft.workspaceId === localId) {
      return editor;
    }
    return null;
  }

  function samePreset(left: ReturnType<typeof builderAssistant.projectPreset>, right: typeof left) {
    return left && right ? modelSelectionsEqual(left, right) : left === right;
  }

  async function onEvidenceReady(evidence: ClipperEvidence, signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (!localId || !scratchWorkspaceRootFor(localId)) {
      throw new Error("The local agent workspace is unavailable. Your Studio draft is saved.");
    }
    const editor = clipEditorFor(evidence.projectId);
    const view = editor?.snapshot();
    if (!editor || view?.draft.stage !== "source" || view.status !== "saved") {
      throw new Error("Open the saved Clipper Source step to use this evidence.");
    }
    if (!isClipContactSheet(evidence.contactSheet)) {
      throw new Error("The reviewed contact sheet cannot be attached.");
    }
    if (pending.current && !pending.current.aborted) {
      throw new Error("Another agent draft is opening.");
    }

    const reviewedPreset = builderAssistant.projectPreset(evidence.projectId);
    clipOpening.current?.abort();
    const operation = new AbortController();
    clipOpening.current = operation;
    const opening = signal ? AbortSignal.any([signal, operation.signal]) : operation.signal;
    pending.current = opening;
    const href = router.state.location.href;
    const unsubscribe = editor.subscribe(() => {
      if (editor.snapshot() !== view) operation.abort();
    });
    try {
      const prompt = clipEvidencePrompt(evidence);
      const bytes = new Uint8Array(await evidence.contactSheet.arrayBuffer());
      rememberComposerImageBytes(evidence.contactSheet, bytes);
      opening.throwIfAborted();
      const scratch = await openScratchProject(localId);
      opening.throwIfAborted();
      if (router.state.location.href !== href || clipEditorFor(evidence.projectId) !== editor) {
        throw new DOMException("The reviewed evidence is no longer open.", "AbortError");
      }
      if (!scratch || scratch.environmentId !== localId) {
        throw new Error("Could not prepare a local agent workspace.");
      }

      const modelSelection = builderAssistant.projectPreset(evidence.projectId, scratch.id);
      if (!samePreset(reviewedPreset, modelSelection)) {
        throw new DOMException("The Clipper model has changed.", "AbortError");
      }
      const opened = await openThread(scopeProjectRef(localId, scratch.id), {
        freshDraft: { prompt, image: evidence.contactSheet, modelSelection },
        signal: opening,
      });
      if (!opened) {
        opening.throwIfAborted();
        throw new Error("Could not open an assisted clip draft.");
      }
      rememberProjectChat(localId, evidence.projectId, { ...opened, projectId: scratch.id });
      rememberClipThread({
        environmentId: localId,
        projectId: evidence.projectId,
        scope: evidence.sourceRevision,
        image: {
          name: evidence.contactSheet.name,
          size: evidence.contactSheet.size,
          digest: clipImageDigest(bytes),
        },
        scratchProjectId: scratch.id,
        threadId: opened.threadId,
        prompt,
      });
    } finally {
      unsubscribe();
      if (clipOpening.current === operation) clipOpening.current = null;
      if (pending.current === opening) pending.current = null;
    }
  }

  async function onReadClipReply(projectId: string, scope: string) {
    if (!localId || !scratchWorkspaceRootFor(localId)) return null;
    const editor = clipEditorFor(projectId);
    if (!editor) return null;
    const view = editor.snapshot();
    const reply = await readBoundClipReply(localId, projectId, scope);
    return clipEditorFor(projectId) === editor && editor.snapshot() === view ? (reply ?? null) : null;
  }

  return (
    <SidebarInset
      {...workspaceAreaProps("home", 1, "Studio home")}
      role="main"
      className="h-dvh min-h-0 overflow-hidden"
    >
      <StudioWorkspaceHeader workspace={localId ?? null} />
      {localId ? (
        <StudioWorkspace
          key={localId}
          workspaceId={localId}
          routeProjectId={routeProjectId}
          onProjectRoute={(id) => {
            const hash = id ? studioProjectHash(localId, id) : "";
            if (router.state.location.hash !== hash) void router.navigate({ to: "/", hash });
          }}
          activeEditor={activeEditor}
          onOpenProviderSettings={() => {
            void router.navigate({ to: "/settings/providers", search: { machine: localId }, hash: BUILDER_TOOL_SETTINGS_ID });
          }}
          {...(scratchRoot
            ? { onAskAgent: openRecommendation, onEvidenceReady, onReadClipReply, builderAssistant }
            : {})}
        />
      ) : (
        <p role="status" className="m-6 text-sm text-muted-foreground">
          Connecting to this device…
        </p>
      )}
    </SidebarInset>
  );
}
