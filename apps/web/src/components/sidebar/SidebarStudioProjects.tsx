import type { EnvironmentId } from "@t3tools/contracts";
import { Link } from "@tanstack/react-router";
import { MessageSquareIcon } from "lucide-react";
import { memo, useState } from "react";
import { useComposerDraftStore } from "../../composerDraftStore";
import { categories } from "../../features/studio/drafts";
import type { StudioShelfRow } from "../../features/studio/projectShelves";
import { studioProjectHash } from "../../features/studio/projectNavigation";
import { CollapsibleSectionHeader } from "../ui/collapsible-section-header";
import { useSidebar } from "../ui/sidebar";

const ProjectItem = memo(function ProjectItem({
  project: row,
  threadAvailable,
  agentWorking,
  workspace,
}: StudioShelfRow & { workspace: EnvironmentId }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const chat = row.chat;
  const draftAvailable = useComposerDraftStore((store) => {
    if (!chat?.draftId || threadAvailable) return false;
    const draft = store.getDraftSession(chat.draftId);
    return (
      draft?.environmentId === workspace &&
      draft.threadId === chat.threadId &&
      draft.projectId === chat.projectId &&
      !draft.promotedTo
    );
  });
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  const chatProps = {
    "aria-label": "Open linked chat for " + row.title,
    onClick: closeMobile,
    preload: false as const,
    className: "shrink-0 rounded p-1 text-sidebar-muted-foreground hover:bg-sidebar-row-hover",
  };
  return (
    <li className="flex items-center gap-1 ps-4" data-thread-selection-safe>
      <Link
        to="/"
        preload={false}
        hash={studioProjectHash(workspace, row.id)}
        activeOptions={{ exact: true, includeHash: true }}
        onClick={closeMobile}
        aria-current={row.editing ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-sidebar-row-hover aria-[current=page]:bg-sidebar-row-hover"
      >
        <span className="truncate">{row.title}</span>
        {row.restoredCopy && <small>Copy {row.restoredCopy}</small>}
        {agentWorking && (
          <small className="shrink-0 text-sidebar-muted-foreground">Agent working</small>
        )}
      </Link>
      {chat &&
        (threadAvailable ? (
          <Link
            {...chatProps}
            to="/$environmentId/$threadId"
            params={{ environmentId: workspace, threadId: chat.threadId }}
          >
            <MessageSquareIcon className="size-4" />
          </Link>
        ) : (
          draftAvailable &&
          chat.draftId && (
            <Link {...chatProps} to="/draft/$draftId" params={{ draftId: chat.draftId }}>
              <MessageSquareIcon className="size-4" />
            </Link>
          )
        ))}
    </li>
  );
});

export function SidebarStudioCategories({
  rows,
  workspace,
}: {
  rows: readonly StudioShelfRow[];
  workspace: EnvironmentId | null;
}) {
  if (!workspace || !rows.length) return null;
  return categories.map((category) => {
    const projects = rows.filter((p) => p.project.category === category.id);
    if (!projects.length) return null;
    return (
      <li key={category.id} data-thread-selection-safe className="list-none">
        <div className="px-3 pt-1 text-xs text-sidebar-muted-foreground">{category.label}</div>
        <ul aria-label={category.label + " projects"}>
          {projects.map((row) => (
            <ProjectItem key={row.project.id} workspace={workspace} {...row} />
          ))}
        </ul>
      </li>
    );
  });
}

export function SidebarFinishedProjects({
  rows,
  workspace,
}: {
  rows: readonly StudioShelfRow[];
  workspace: EnvironmentId | null;
}) {
  const [expanded, setExpanded] = useState(true);
  if (!rows.length) return null;
  return (
    <>
      <li className="mx-0.5 list-none" data-thread-selection-safe>
        <CollapsibleSectionHeader
          expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          accessory={<span>{rows.length}</span>}
        >
          Finished
        </CollapsibleSectionHeader>
      </li>
      <SidebarStudioCategories
        rows={expanded ? rows : rows.filter((row) => row.project.editing)}
        workspace={workspace}
      />
    </>
  );
}
