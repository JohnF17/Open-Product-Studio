import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { act, render } from "../../test/render";
import { useCommandPaletteMount, useCommandPaletteStore } from "../commandPaletteStore";
import { createDraft, DraftEditor } from "../features/studio/drafts";
import { observeStudioEditor } from "../features/studio/projectIndex";
import { StudioWorkspaceHeader } from "./StudioWorkspaceHeader";
import stylesheet from "../index.css?inline";

vi.mock(import("../env"), async (original) => ({ ...(await original()), isElectron: true }));

it("tracks edits only in the active Studio workspace and restores the projects heading on close", async () => {
  await using screen = await render(<StudioWorkspaceHeader workspace="local" />);
  const header = screen.getByRole("region", { name: "Studio workspace" });
  await expect.element(header.getByText("Studio projects")).toBeVisible();
  const editor = new DraftEditor(createDraft("local", "clipper"));
  const close = await act(() => observeStudioEditor(editor));
  try {
    await expect.element(header.getByText("Untitled clip")).toBeVisible();
    await act(() => editor.update({ title: "Workshop cut" }));
    await expect.element(header.getByText("Workshop cut")).toBeVisible();
    await screen.rerender(<StudioWorkspaceHeader workspace="another-device" />);
    await expect.element(header.getByText("Studio projects")).toBeVisible();
    await screen.rerender(<StudioWorkspaceHeader workspace="local" />);
    await expect.element(header.getByText("Workshop cut")).toBeVisible();
  } finally {
    await act(close);
    await editor.flush();
  }
  await expect.element(header.getByText("Studio projects")).toBeVisible();
});

it("keeps controls clickable and reserves the native overlay space at narrow widths", async () => {
  await using screen = await render(<main className="wco" style={{ width: 290 }} data-sidebar-state="collapsed">
    <style>{stylesheet}</style>
    <StudioWorkspaceHeader workspace={null} />
  </main>);
  const shell = screen.container.querySelector("main")!;
  shell.style.setProperty("--workspace-native-controls-inset", "76px");
  const header = screen.getByRole("region", { name: "Studio workspace" }).element();
  const buttons = screen.getByRole("group", { name: "Workspace commands" }).element();
  expect(getComputedStyle(header).getPropertyValue("-webkit-app-region")).toBe("drag");
  expect(getComputedStyle(buttons).getPropertyValue("-webkit-app-region")).toBe("no-drag");
  expect(buttons.getBoundingClientRect().right).toBeLessThanOrEqual(header.getBoundingClientRect().right - 76);
  expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth);
});

it("opens the shell command palette from the keyboard and navigates to application settings", async () => {
  function Shell() {
    useCommandPaletteMount();
    return <StudioWorkspaceHeader workspace={null} />;
  }
  await using screen = await render(<Shell />);
  const commands = screen.getByRole("button", { name: "Open command palette" });
  (commands.element() as HTMLButtonElement).focus();
  await userEvent.keyboard("{Enter}");
  expect(useCommandPaletteStore.getState().open).toBe(true);
  await screen.getByRole("link", { name: "Open settings" }).click();
  await expect.poll(() => screen.router?.state.location.pathname).toBe("/settings");
});
