import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import StudioWorkspace from "./StudioWorkspace";
import { createDraft, insertDraft } from "./drafts";

it.each([false, true])("keeps keyboard entry and return usable with reduced motion %s", async (reduce) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const original = window.matchMedia.bind(window);
  using preference = vi.spyOn(media, "matches", "get").mockReturnValue(reduce);
  using queries = vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === media.media ? media : original(query),
  );
  using animations = vi.spyOn(Element.prototype, "animate");
  const container = document.createElement("div");
  container.style.cssText = "width: 350px; height: 200px";
  await using screen = await render(<StudioWorkspace workspaceId={randomUUID()} />, { container, router: false });
  const video = screen.getByRole("button", { name: /^Video / });
  await expect.element(video).toBeVisible();
  (video.element() as HTMLButtonElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("heading", { name: "Choose a visual style" })).toHaveFocus();
  const viewport = screen.getByRole("region", { name: "Studio project builder" }).element();
  const heading = screen.getByRole("heading", { name: "Choose a visual style" }).element();
  expect(heading.getBoundingClientRect().top).toBeGreaterThanOrEqual(viewport.getBoundingClientRect().top - 1);
  expect(heading.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1);
  const isArtwork = (node: unknown) => node instanceof HTMLElement && node.classList.contains("ops-project-artwork");
  const entry = animations.mock.contexts.findIndex(isArtwork);
  if (reduce) {
    expect(entry).toBe(-1);
  } else {
    expect(entry).toBeGreaterThanOrEqual(0);
    const animation = animations.mock.results[entry]!.value as Animation;
    media.dispatchEvent(new Event("change"));
    expect(animation.playState).toBe("idle");
  }
  await screen.getByRole("textbox", { name: "Project name" }).fill("Coastline short");
  await screen.getByRole("button", { name: "Projects", exact: true }).click();
  const project = screen.getByRole("button", { name: /^Coastline short/ });
  await expect.element(project).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("heading", { name: "Choose a visual style" })).toHaveFocus();
  expect(animations.mock.contexts.filter(isArtwork)).toHaveLength(reduce ? 0 : 1);
});

it("returns to the visible saved card in a scrolled project list", async () => {
  const workspaceId = randomUUID();
  for (let i = 0; i < 12; i++) {
    await insertDraft({ ...createDraft(workspaceId, "video"), title: "Episode " + i });
  }
  const container = document.createElement("div");
  container.style.cssText = "width: 360px; height: 240px";
  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, { container, router: false });
  const picker = screen.getByRole("region", { name: "Open Product Studio" });
  const lastCard = screen.getByRole("button", { name: /^Episode / }).last();
  await expect.element(lastCard).toBeVisible();
  lastCard.element().scrollIntoView({ block: "end", behavior: "instant" });
  (lastCard.element() as HTMLButtonElement).focus({ preventScroll: true });
  const offset = picker.element().scrollTop;
  expect(offset).toBeGreaterThan(0);
  await userEvent.keyboard("{Enter}");
  await screen.getByRole("button", { name: "Projects", exact: true }).click();
  await expect.element(lastCard).toHaveFocus();
  expect(Math.abs(picker.element().scrollTop - offset)).toBeLessThanOrEqual(1);
});
