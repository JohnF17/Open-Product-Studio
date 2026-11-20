import { ProjectId, ThreadId } from "@t3tools/contracts";
import type * as Context from "effect/Context";
import {
  dispatchedCommands,
  ENVIRONMENT_ID,
  installFakeEnvironment,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { DraftId, useComposerDraftStore } from "../composerDraftStore";
import { rememberProjectChat } from "../features/studio/projectIndex";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "../../test/render";
import { createDraft, saveDraft } from "../features/studio/drafts";
import { studioProjectHash } from "../features/studio/projectNavigation";
import { randomUUID } from "../lib/randomUUID";
import Sidebar from "./Sidebar";
import StudioLanding from "./StudioLanding";
import { SidebarProvider } from "./ui/sidebar";

const workspace = ENVIRONMENT_ID;
vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});
vi.mock(import("../env"), async (original) => ({ ...(await original()), isElectron: true }));
vi.mock(import("../state/environments"), async (original) => ({
  ...(await original()),
  usePrimaryEnvironmentId: () => workspace,
}));
vi.mock("../hooks/useScratchProject", () => ({
  useScratchProject: () => ({ scratchWorkspaceRootFor: () => null }),
}));
vi.mock("./sidebar/SidebarChrome", () => ({
  SidebarChromeHeader: () => null,
  SidebarChromeFooter: () => null,
}));
vi.mock("./WorkspacePageHeader", () => ({ WorkspacePageHeader: () => null }));

it("opens the saved builder from its category in the real sidebar, then finishes, reopens and closes it", async () => {
  const previousViewport = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(1400, 900);
  await using _viewport = {
    [Symbol.asyncDispose]: () => page.viewport(previousViewport.width, previousViewport.height),
  };
  using _environment = installFakeEnvironment([]);
  const project = {
    ...createDraft(workspace, "clipper"),
    title: "Sidebar clip " + randomUUID(),
    stage: "review",
  };
  await saveDraft(project, 0);
  await saveDraft({ ...project, workspaceId: "elsewhere", title: "Other workspace clip" }, 0);
  const root = createRootRoute({
    beforeLoad: () => ({ authGateState: { status: "authenticated" } }),
    component: () => (
      <SidebarProvider>
        <Sidebar routeReveal={{ observedKey: null, pendingKey: null }} />
        <Outlet />
      </SidebarProvider>
    ),
  });
  const studio = createRoute({ getParentRoute: () => root, path: "/", component: StudioLanding });
  const draftChat = createRoute({
    getParentRoute: () => root,
    path: "/draft/$draftId",
    component: () => <p>Linked draft</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([studio, draftChat]),
    history: createMemoryHistory(),
  });
  await router.load();
  await using screen = await render(<RouterProvider router={router} />, { router: false });
  const settled = screen.getByTestId("sidebar-settled-shelf-toggle");
  await expect.element(settled).toBeVisible();
  if (settled.element().getAttribute("aria-expanded") !== "true") await settled.click();
  const row = screen
    .getByRole("list", { name: "Clipper projects" })
    .getByRole("link", { name: project.title });
  await expect.element(row).toBeVisible();
  expect(row.element().getAttribute("href")).toBe("/#" + studioProjectHash(workspace, project.id));
  await expect
    .element(screen.getByRole("link", { name: "Other workspace clip" }))
    .not.toBeInTheDocument();
  await row.click();
  await expect
    .element(screen.getByRole("textbox", { name: "Project name" }))
    .toHaveValue(project.title);
  await expect.element(screen.getByTestId("sidebar-working-shelf-toggle")).toBeVisible();
  await screen.getByRole("button", { name: "Finish project", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: /^Finished/ })).toBeVisible();
  await screen.getByRole("button", { name: "Reopen project", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: /^Finished/ })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "Projects", exact: true }).click();
  await expect.element(row).toBeVisible();
  await expect.element(screen.getByTestId("sidebar-working-shelf-toggle")).not.toBeInTheDocument();

  const chat = {
    projectId: ProjectId.make(randomUUID()),
    threadId: ThreadId.make(randomUUID()),
    draftId: DraftId.make(randomUUID()),
  };
  const ref = { projectId: chat.projectId, environmentId: workspace };
  useComposerDraftStore
    .getState()
    .setLogicalProjectDraftThreadId("navigation-fixture", ref, chat.draftId, {
      threadId: chat.threadId,
      mapProject: false,
    });
  try {
    rememberProjectChat(workspace, project.id, chat);
    const link = screen.getByRole("link", { name: "Open linked chat for " + project.title });
    await expect.element(link).toBeVisible();
    await link.click();
    await expect.element(screen.getByText("Linked draft", { exact: true })).toBeVisible();
    expect(router.state.location.pathname).toBe("/draft/" + chat.draftId);
    expect(dispatchedCommands()).toEqual([]);
  } finally {
    useComposerDraftStore.getState().clearDraftThread(chat.draftId);
  }
});
