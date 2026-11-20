import { isThreadWorking } from "@t3tools/client-runtime/state/thread-inbox";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import type { ProjectRow } from "./projectIndex";
import { projectShelf } from "./projectNavigation";

export interface StudioShelfRow {
  project: ProjectRow;
  threadAvailable: boolean;
  agentWorking: boolean;
}

export function studioProjectShelves(
  workspace: string | null,
  projects: readonly ProjectRow[],
  threads: readonly EnvironmentThreadShell[],
) {
  const shelves: Record<ReturnType<typeof projectShelf>, StudioShelfRow[]> = {
    working: [],
    settled: [],
    finished: [],
  };
  const linkedThreads = projects.some((p) => p.chat)
    ? new Map(
        threads
          .filter((t) => t.environmentId === workspace && t.archivedAt === null)
          .map((t) => [t.id, t]),
      )
    : null;
  for (const project of projects) {
    const linked = project.chat && linkedThreads?.get(project.chat.threadId);
    const thread = linked && linked.projectId === project.chat?.projectId ? linked : null;
    const agentWorking =
      !!thread &&
      isThreadWorking(thread) &&
      (thread.runtime?.status !== "idle" || thread.runtime.activeRunId != null);
    shelves[projectShelf(project.finished, project.editing, agentWorking)].push({
      project,
      threadAvailable: !!thread,
      agentWorking,
    });
  }
  return shelves;
}
