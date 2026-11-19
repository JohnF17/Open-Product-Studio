import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { useBlocker } from "@tanstack/react-router";
import { useRef } from "react";

import StudioWorkspace, { type StudioAgentRequest } from "../features/studio/StudioWorkspace";
import { type DraftEditor } from "../features/studio/drafts";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { useScratchProject } from "../hooks/useScratchProject";
import { workspaceAreaProps } from "../lib/workspaceFocus";
import { usePrimaryEnvironmentId } from "../state/environments";
import { SidebarInset } from "./ui/sidebar";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

/** Desktop-only entry. Source drafts and provider sessions are scoped to the local engine. */
export default function StudioLanding() {
  const localId = usePrimaryEnvironmentId();
  const { openScratchProject, scratchWorkspaceRootFor } = useScratchProject();
  const openThread = useNewThreadHandler();
  const pending = useRef<AbortSignal | null>(null);
  const activeEditor = useRef<DraftEditor | null>(null);
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
    if (!localId || request.workspaceId !== localId || !scratchWorkspaceRootFor(localId)) {
      throw new Error("The local agent workspace is unavailable. Your Studio draft is saved.");
    }
    if (pending.current && !pending.current.aborted) {
      throw new Error("Another agent draft is opening.");
    }
    pending.current = request.signal;
    try {
      const scratch = await openScratchProject(localId);
      request.signal.throwIfAborted();
      if (!scratch || scratch.environmentId !== localId) {
        throw new Error("Could not prepare a local agent workspace.");
      }
      const opened = await openThread(scopeProjectRef(localId, scratch.id), {
        prompt: request.prompt,
        signal: request.signal,
      });
      if (!opened) throw new Error("Could not open a recommendation draft.");
    } finally {
      if (pending.current === request.signal) pending.current = null;
    }
  }

  return (
    <SidebarInset
      {...workspaceAreaProps("home", 1, "Studio home")}
      role="main"
      className="h-dvh min-h-0 overflow-hidden"
    >
      <WorkspacePageHeader electron />
      {localId ? (
        <StudioWorkspace
          key={localId}
          workspaceId={localId}
          activeEditor={activeEditor}
          {...(scratchWorkspaceRootFor(localId) ? { onAskAgent: openRecommendation } : {})}
        />
      ) : (
        <p role="status" className="m-6 text-sm text-muted-foreground">
          Connecting to this device…
        </p>
      )}
    </SidebarInset>
  );
}
