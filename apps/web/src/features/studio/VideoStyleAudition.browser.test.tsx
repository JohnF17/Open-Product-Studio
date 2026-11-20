import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import StudioWorkspace from "./StudioWorkspace";
import { createDraft, insertDraft, listDrafts } from "./drafts";
import { VideoStyleAudition } from "./VideoStyleAudition";

it("auditions each style against one scene and only commits the tool plan on Apply", async () => {
  const workspaceId = randomUUID();
  const caption = "Listen for the click as the latch closes.";
  const draft = {
    ...createDraft(workspaceId, "video"),
    title: "Latch study",
    fields: { brief: "Show how the latch works.", storyboard: "Hold on the latch." },
    tools: ["storyboard-skill", "voice-import", "effect-plugin"],
    videoCues: [
      {
        id: "latch",
        timestamp: "0:00",
        action: "Close the latch",
        caption,
        narration: "",
        sound: "",
      },
    ],
  };
  await insertDraft(draft);
  const savedBefore = (await listDrafts(workspaceId))[0]!;

  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, {
    router: false,
  });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const radio = (name: string) => screen.getByRole("radio", { name, exact: true });
  const preview = screen.getByRole("figure", { name: "Same-scene preview" });
  const apply = button("Apply style");
  const discard = button("Discard preview");

  await button(/^Latch study/).click();
  await expect.element(radio("Kinetic typography")).toBeChecked();
  await expect.element(apply).toBeDisabled();

  for (const style of [
    "Product walkthrough",
    "3D showcase",
    "Stick-figure explainer",
    "Kinetic typography",
  ]) {
    await radio(style).click();
    await expect.element(preview.getByText(caption, { exact: true })).toBeVisible();
  }
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(radio("Product walkthrough")).toBeChecked();
  await expect
    .element(screen.getByText("Import approved screenshots or a screen recording", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Removed on Apply: Add an optional third-party visual effect"))
    .toBeVisible();
  expect((await listDrafts(workspaceId))[0]).toMatchObject({
    revision: savedBefore.revision,
    style: "kinetic-type",
    tools: draft.tools,
  });

  await discard.click();
  await expect.element(radio("Kinetic typography")).toBeChecked();
  await radio("3D showcase").click();
  await button("Next").click();
  await expect
    .element(screen.getByRole("combobox", { name: "Script and timed text" }))
    .toHaveValue("storyboard-skill");
  await button("Back").click();
  await expect.element(radio("Kinetic typography")).toBeChecked();

  await radio("Product walkthrough").click();
  await apply.click();
  await expect.element(apply).toBeDisabled();
  await button("Next").click();
  await expect
    .element(screen.getByRole("combobox", { name: "Demo footage" }))
    .toHaveValue("capture-import");
  await expect
    .element(screen.getByRole("combobox", { name: "Shot sequence" }))
    .toHaveValue("storyboard-skill");
  await expect
    .element(screen.getByRole("checkbox", { name: /Use a recorded narration/ }))
    .toBeChecked();
  await button("Projects").click();
  expect((await listDrafts(workspaceId))[0]).toMatchObject({
    style: "product-demo",
    tools: ["storyboard-skill", "voice-import"],
    fields: draft.fields,
    videoCues: draft.videoCues,
  });
});

it("starts silent playback by keyboard and stops when the treatment changes", async () => {
  const draft = createDraft(randomUUID(), "video");
  const onApply = vi.fn();
  await using screen = await render(<VideoStyleAudition draft={draft} onApply={onApply} />, {
    router: false,
  });
  const play = screen.getByRole("button", { name: "Play preview" });
  const frame = screen.container.querySelector(".ops-audition-frame")!;

  await expect
    .element(screen.getByText("Save the idea before you move on.", { exact: true }))
    .toBeVisible();
  expect(frame.getAnimations({ subtree: true })).toHaveLength(0);
  (play.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("button", { name: "Stop preview" })).toBeVisible();
  expect(frame.getAnimations({ subtree: true }).length).toBeGreaterThan(0);
  await screen.getByRole("radio", { name: "3D showcase" }).click();
  await expect.element(play).toBeVisible();
  expect(frame.getAnimations({ subtree: true })).toHaveLength(0);
  expect(onApply).not.toHaveBeenCalled();
});

it("returns focus to the selected style when reduced motion interrupts playback", async () => {
  const original = window.matchMedia.bind(window);
  const query = "(prefers-reduced-motion: reduce)";
  const media = original(query);
  using preference = vi.spyOn(media, "matches", "get").mockReturnValue(false);
  using queries = vi.spyOn(window, "matchMedia").mockImplementation((value) =>
    value === query ? media : original(value),
  );
  const draft = createDraft(randomUUID(), "video");
  await using screen = await render(<VideoStyleAudition draft={draft} onApply={vi.fn()} />, { router: false });
  await screen.getByRole("button", { name: "Play preview" }).click();
  await expect.element(screen.getByRole("button", { name: "Stop preview" })).toHaveFocus();
  preference.mockReturnValue(true);
  media.dispatchEvent(new MediaQueryListEvent("change", { matches: true, media: query }));
  await expect.element(screen.getByRole("radio", { name: "Kinetic typography" })).toHaveFocus();
  expect(screen.container.querySelector(".ops-audition-frame")?.getAttribute("data-playing")).toBe("false");
});

it("uses the brief as the common text in reduced-motion stills", async () => {
  const nativeMatch = window.matchMedia.bind(window);
  const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const result = nativeMatch(query);
    if (query === "(prefers-reduced-motion: reduce)") {
      Object.defineProperty(result, "matches", { value: true });
    }
    return result;
  });
  const brief = "Show how to read the final number.";
  const draft = { ...createDraft(randomUUID(), "video"), fields: { brief } };
  try {
    await using screen = await render(<VideoStyleAudition draft={draft} onApply={vi.fn()} />, {
      router: false,
    });
    await expect.element(screen.getByText("Project brief · Still preview")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Play preview" }))
      .not.toBeInTheDocument();
    await screen.getByRole("radio", { name: "Stick-figure explainer" }).click();
    await expect.element(screen.getByText(brief, { exact: true })).toBeVisible();
    expect(
      screen.container.querySelector(".ops-audition-frame")!.getAnimations({ subtree: true }),
    ).toHaveLength(0);
  } finally {
    matchMedia.mockRestore();
  }
});
