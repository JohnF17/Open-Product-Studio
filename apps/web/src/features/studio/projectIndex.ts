import { type EnvironmentId, type ProjectId, type ThreadId } from "@t3tools/contracts";
import type { DraftId } from "../../composerDraftStore";
import { useMemo, useSyncExternalStore } from "react";
import {
  listDrafts,
  notifyProjectChange,
  projectName,
  subscribeProjectChanges,
  type StudioDraft,
  type DraftEditor,
} from "./drafts";

interface ChatLink {
  draftId?: DraftId;
  threadId: ThreadId;
  projectId: ProjectId;
}
const linkKey = (workspace: string, id: string) =>
  "open-product-studio:project-chat:" + JSON.stringify([workspace, id]);

export function rememberProjectChat(workspace: EnvironmentId, id: string, link: ChatLink) {
  try {
    const { threadId, projectId, draftId } = link;
    localStorage.setItem(linkKey(workspace, id), JSON.stringify({ threadId, projectId, draftId }));
    notifyProjectChange(workspace);
  } catch {
    /* The chat itself remains available in T3. */
  }
}
function isChatLink(value: unknown): value is ChatLink {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const link = value as Record<string, unknown>;
  const isId = (field: unknown) =>
    typeof field === "string" && field.length > 0 && field.length <= 256;
  return (
    isId(link.threadId) &&
    isId(link.projectId) &&
    (link.draftId === undefined || isId(link.draftId))
  );
}

function readLink(workspace: string, id: string): ChatLink | null {
  try {
    const link: unknown = JSON.parse(localStorage.getItem(linkKey(workspace, id)) ?? "null");
    if (isChatLink(link)) {
      return {
        threadId: link.threadId,
        projectId: link.projectId,
        ...(link.draftId ? { draftId: link.draftId } : {}),
      };
    }
  } catch {
    /* An unreadable link has no destination. */
  }
  return null;
}
function summary(draft: StudioDraft) {
  return {
    id: draft.id,
    category: draft.category,
    title: projectName(draft),
    restoredCopy: draft.restoredCopy,
    finished: draft.finished === true,
  };
}
type Summary = ReturnType<typeof summary>;
export type ProjectRow = Summary & { editing: boolean; chat: ChatLink | null };
const empty: readonly ProjectRow[] = [];
const editingChanged = new EventTarget();
let active: { workspace: string; project: Summary } | null = null;

function subscribeActiveProject(notify: () => void) {
  editingChanged.addEventListener("change", notify);
  return () => editingChanged.removeEventListener("change", notify);
}

export function useActiveStudioProjectTitle(workspace: string | null) {
  return useSyncExternalStore(
    subscribeActiveProject,
    () => (active && active.workspace === workspace ? active.project.title : null),
    () => null,
  );
}

export function observeStudioEditor(editor: DraftEditor) {
  const { workspaceId, id } = editor.snapshot().draft;
  function update() {
    const project = summary(editor.snapshot().draft);
    if (
      active?.workspace === workspaceId &&
      JSON.stringify(active.project) === JSON.stringify(project)
    )
      return;
    active = { workspace: workspaceId, project };
    editingChanged.dispatchEvent(new Event("change"));
  }
  update();
  const unsubscribe = editor.subscribe(update);
  return () => {
    unsubscribe();
    if (active?.workspace !== workspaceId || active.project.id !== id) return;
    active = null;
    editingChanged.dispatchEvent(new Event("change"));
  };
}

export function studioProjectIndex(workspace: string | null) {
  let snapshot = empty;
  return {
    snapshot: () => snapshot,
    subscribe(notify: () => void) {
      if (!workspace) return () => {};
      let generation = 0;
      let saved: Summary[] = [];
      let links = new Map<string, ChatLink | null>();
      function publish() {
        const current = active?.workspace === workspace ? active.project : null;
        const projects = new Map(saved.map((p) => [p.id, p]));
        if (current) projects.set(current.id, current);
        const previous = new Map(snapshot.map((row) => [row.id, row]));
        const next = [...projects.values()]
          .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
          .map((p) => {
            const row = { ...p, editing: p.id === current?.id, chat: links.get(p.id) ?? null };
            const old = previous.get(p.id);
            return old && JSON.stringify(old) === JSON.stringify(row) ? old : row;
          });
        if (next.length !== snapshot.length || next.some((row, index) => row !== snapshot[index])) {
          snapshot = next;
          notify();
        }
      }
      async function refresh() {
        const request = ++generation;
        try {
          const drafts = await listDrafts(workspace!);
          if (request !== generation) return;
          saved = drafts.map(summary);
          links = new Map(saved.map((row) => [row.id, readLink(workspace!, row.id)]));
          publish();
        } catch {
          /* Keep the editor visible when persistent storage is unavailable. */
        }
      }
      const unsubscribe = subscribeProjectChanges(workspace, () => void refresh());
      editingChanged.addEventListener("change", publish);
      publish();
      void refresh();
      return () => {
        ++generation;
        unsubscribe();
        editingChanged.removeEventListener("change", publish);
      };
    },
  };
}
export function useStudioProjects(workspace: string | null) {
  const index = useMemo(() => studioProjectIndex(workspace), [workspace]);
  return useSyncExternalStore(index.subscribe, index.snapshot);
}
