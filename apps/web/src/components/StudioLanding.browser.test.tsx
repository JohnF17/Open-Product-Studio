import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { expect, it, vi } from "vite-plus/test";
import { act, render } from "../../test/render";
import { createDraft, DraftEditor, listDrafts, saveDraft } from "../features/studio/drafts";
import { studioProjectHash } from "../features/studio/projectNavigation";
import StudioLanding from "./StudioLanding";
import { usePrimaryEnvironmentId } from "../state/environments";

const { workspace, directWorkspace } = await vi.hoisted(async () => {
  const { randomUUID } = await import("../lib/randomUUID");
  return { workspace: randomUUID(), directWorkspace: randomUUID() };
});
vi.mock(import("../state/environments"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePrimaryEnvironmentId: vi.fn(() => workspace as ReturnType<
    typeof import("../state/environments").usePrimaryEnvironmentId
  >),
}));
vi.mock("../hooks/useScratchProject", () => ({
  useScratchProject: () => ({ scratchWorkspaceRootFor: () => null }),
}));
vi.mock("../hooks/useHandleNewThread", () => ({ useNewThreadHandler: () => vi.fn() }));
vi.mock("./WorkspacePageHeader", () => ({ WorkspacePageHeader: () => null }));

it("resumes the requested saved builder and follows project and home navigation in place", async () => {
  const workspace = directWorkspace;
  vi.mocked(usePrimaryEnvironmentId).mockReturnValue(workspace as ReturnType<typeof usePrimaryEnvironmentId>);
  const original = { ...createDraft(workspace, "video"), title: "Direct open", stage: "storyboard" };
  const next = { ...createDraft(workspace, "blank"), title: "Second builder" };
  await saveDraft(original, 0);
  await saveDraft(next, 0);
  const root = createRootRoute();
  const studio = createRoute({ getParentRoute: () => root, path: "/", component: StudioLanding });
  const router = createRouter({
    routeTree: root.addChildren([studio]),
    history: createMemoryHistory({ initialEntries: ["/#" + studioProjectHash(workspace, original.id)] }),
  });
  await using screen = await render(<RouterProvider router={router} />, { router: false });
  const title = screen.getByRole("textbox", { name: "Project name" });
  await expect.element(title).toHaveValue(original.title);
  await act(() => router.navigate({ to: "/", hash: studioProjectHash(workspace, next.id) }));
  await expect.element(title).toHaveValue(next.title);
  await screen.getByRole("button", { name: "Projects", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: /Second builder/ })).toBeVisible();
  expect(router.state.location.hash).toBe("");
});

it("keeps a conflicting edit in the window until the user explicitly leaves it", async () => {
  vi.mocked(usePrimaryEnvironmentId).mockReturnValue(workspace as ReturnType<typeof usePrimaryEnvironmentId>);
  const root = createRootRoute();
  const studio = createRoute({ getParentRoute: () => root, path: "/", component: StudioLanding });
  const settings = createRoute({
    getParentRoute: () => root,
    path: "/settings",
    component: () => <h1>Settings fixture</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([studio, settings]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await using screen = await render(<RouterProvider router={router} />, { router: false });
  const chooser = screen.getByRole("region", { name: "Open Product Studio" });

  await expect.element(chooser.getByRole("heading", { name: "New project" })).toBeVisible();
  const brandMark = chooser.element().querySelector<HTMLImageElement>(".ops-identity img");
  expect(brandMark?.getAttribute("alt")).toBe("");
  await expect.poll(() => brandMark?.naturalWidth ?? 0).toBeGreaterThan(0);
  await screen.getByRole("button", { name: /^Blank/ }).click();
  await expect.element(screen.getByText("Saved on this device")).toBeVisible();
  const [stored] = await listDrafts(workspace);
  expect(stored).toBeDefined();
  await saveDraft({ ...stored!, title: "Saved by another window" }, stored!.revision);
  const name = screen.getByRole("textbox", { name: "Project name" });
  await name.fill("Keep this unsaved edit");
  await expect.element(screen.getByRole("alert")).toBeVisible();
  using guardFlush = vi.spyOn(DraftEditor.prototype, "flush");
  const originalHash = router.state.location.hash;
  const sibling = createDraft(workspace, "video");
  await saveDraft(sibling, 0);
  await act(() => { void router.navigate({ to: "/", hash: studioProjectHash(workspace, sibling.id) }); });
  await expect.poll(() => guardFlush.mock.calls.length).toBeGreaterThan(0);
  expect(router.state.location.hash).toBe(originalHash);
  await expect.element(name).toHaveValue("Keep this unsaved edit");
  const callsBeforeSettings = guardFlush.mock.calls.length;
  await act(() => { void router.navigate({ to: "/settings" }); });
  await expect.poll(() => guardFlush.mock.calls.length).toBeGreaterThan(callsBeforeSettings);
  expect(router.state.location.pathname).toBe("/");
  await expect.element(name).toHaveValue("Keep this unsaved edit");
  await screen.getByRole("button", { name: "Projects", exact: true }).click();
  await screen.getByRole("button", { name: "Leave without these edits" }).click();
  await act(() => router.navigate({ to: "/settings" }));
  await expect.element(screen.getByRole("heading", { name: "Settings fixture" })).toBeVisible();
  expect((await listDrafts(workspace)).find(project => project.id === stored?.id)?.title).toBe("Saved by another window");
});
