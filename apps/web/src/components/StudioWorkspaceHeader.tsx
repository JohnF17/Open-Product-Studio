import { Link } from "@tanstack/react-router";
import { SearchIcon, SettingsIcon } from "lucide-react";
import { openCommandPalette } from "../commandPaletteBus";
import { isElectron } from "../env";
import { useActiveStudioProjectTitle } from "../features/studio/projectIndex";
import { WorkspacePageHeader } from "./WorkspacePageHeader";
import { Button, buttonVariants } from "./ui/button";

export function StudioWorkspaceHeader({ workspace }: { workspace: string | null }) {
  const project = useActiveStudioProjectTitle(workspace);
  return (
    <WorkspacePageHeader electron={isElectron} role="region" aria-label="Studio workspace" className="min-w-0 border-b border-border bg-background">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={project ?? undefined}>
        {project ?? "Studio projects"}
      </span>
      <div className="flex shrink-0 items-center gap-1 [-webkit-app-region:no-drag]"
        role="group" aria-label="Workspace commands" data-workspace-titlebar-controls>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Open command palette"
          title="Open command palette" onClick={() => openCommandPalette()}>
          <SearchIcon className="size-4" aria-hidden="true" />
        </Button>
        <Link to="/settings" aria-label="Open settings" title="Open settings"
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}>
          <SettingsIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </WorkspacePageHeader>
  );
}
