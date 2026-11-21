import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { recording } from "./clipRecordingFixture";
import { createDraft, readDraft, saveDraft } from "./drafts";
import StudioWorkspace from "./StudioWorkspace";

const original = {
  schema: "studio-tutorial/1",
  title: "Dashboard walkthrough",
  scenes: [
    {
      id: "welcome",
      source: "dashboard",
      start: 0.2,
      end: 1.3,
      narration: "Open the dashboard.",
      caption: "Dashboard",
    },
  ],
};

it("previews a proposal and saves only the shots explicitly added to a tutorial", async () => {
  const workspaceId = randomUUID();
  const draft = createDraft(workspaceId, "video");
  const originalJson = JSON.stringify(original);
  const proposed = {
    ...original,
    scenes: [
      { ...original.scenes[0], id: "menu", narration: "Find the menu.", caption: "Menu" },
      { ...original.scenes[0], id: "skip", narration: "Skip the draft.", caption: "Draft" },
    ],
  };
  await saveDraft({ ...draft, stage: "render", fields: { tutorialProduction: originalJson } }, 0);
  {
    await using ui = await render(
      <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
      { router: false },
    );
    await expect.element(ui.getByRole("heading", { name: "Produce your tutorial" })).toBeVisible();
    await userEvent.upload(
      ui.getByLabelText("Import production plan"),
      new File(
        [
          JSON.stringify({
            ...proposed,
            scenes: [{ ...proposed.scenes[0], source: "C:/private/dashboard.mp4" }],
          }),
        ],
        "invalid.json",
        { type: "application/json" },
      ),
    );
    await expect.element(ui.getByRole("alert")).toBeVisible();
    expect((await readDraft(workspaceId, draft.id))?.fields.tutorialProduction).toBe(originalJson);
    await userEvent.upload(
      ui.getByLabelText("Import production plan"),
      new File([JSON.stringify(proposed)], "proposal.json", { type: "application/json" }),
    );
    await expect.element(ui.getByText("Find the menu.", { exact: true })).toBeVisible();
    expect((await readDraft(workspaceId, draft.id))?.fields.tutorialProduction).toBe(originalJson);
    await ui.getByRole("checkbox", { name: "Include shot 1" }).click();
    await ui.getByRole("button", { name: "Add selected shots" }).click();
    await expect
      .poll(async () =>
        JSON.parse(
          (await readDraft(workspaceId, draft.id))?.fields.tutorialProduction ?? "null",
        )?.scenes.map((shot: { id: string }) => shot.id),
      )
      .toEqual(["welcome", "menu"]);
  }
  await using reopened = await render(
    <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
    { router: false },
  );
  await reopened.getByRole("button", { name: /Shot 2.*Menu/ }).click();
  await expect
    .element(reopened.getByRole("textbox", { name: "Narration" }))
    .toHaveValue("Find the menu.");
});

it("plays a selected local source and keeps its name out of the production plan", async () => {
  const workspaceId = randomUUID();
  const draft = createDraft(workspaceId, "video");
  await saveDraft(
    { ...draft, stage: "render", fields: { tutorialProduction: JSON.stringify(original) } },
    0,
  );
  const container = document.createElement("div");
  container.style.width = "320px";
  await using ui = await render(
    <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
    { router: false, container },
  );
  await userEvent.upload(
    ui.getByLabelText("Choose recording for dashboard"),
    recording("private-recording.webm"),
  );
  await expect.element(ui.getByRole("button", { name: "Play preview" })).toBeEnabled();
  const base = container.querySelector(".ops-workspace")!;
  expect(base.scrollWidth).toBeLessThanOrEqual(base.clientWidth);
  await ui.getByRole("checkbox", { name: "Zoom into the recording" }).click();
  await expect
    .poll(() => container.querySelector<HTMLElement>(".ops-tutorial-footage")?.style.transform)
    .toMatch(/scale\(2\)/);
  await ui.getByRole("button", { name: "Play preview" }).click();
  await expect.poll(() => container.querySelector("video")?.currentTime ?? 0).toBeGreaterThan(0.3);
  await expect
    .poll(
      async () =>
        JSON.parse((await readDraft(workspaceId, draft.id))?.fields.tutorialProduction ?? "null")
          ?.scenes[0]?.focus,
    )
    .toEqual({ x: 0.5, y: 0.5, zoom: 2 });
  expect((await readDraft(workspaceId, draft.id))?.fields.tutorialProduction).not.toContain(
    "private-recording.webm",
  );
  await expect.element(ui.getByRole("button", { name: "Download production plan" })).toBeDisabled();
  await ui.getByRole("checkbox", { name: "I reviewed this production plan" }).click();
  const urls = vi.spyOn(URL, "createObjectURL");
  const anchor = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  try {
    await ui.getByRole("button", { name: "Download production plan" }).click();
    const exported = urls.mock.calls.at(-1)?.[0];
    expect(exported).toBeInstanceOf(Blob);
    const content = await (exported as Blob).text();
    expect(JSON.parse(content)).toEqual({
      ...original,
      scenes: [{ ...original.scenes[0], focus: { x: 0.5, y: 0.5, zoom: 2 } }],
    });
    expect(content).not.toContain("private-recording.webm");
  } finally {
    urls.mockRestore();
    anchor.mockRestore();
  }

  await ui.getByRole("textbox", { name: "On-screen label" }).fill("Find the dashboard");
  await expect.element(ui.getByRole("button", { name: "Download production plan" })).toBeDisabled();
  const step = ui.getByRole("combobox", { name: "Go to step" });
  const valueForStep = (label: string) =>
    Array.from((step.element() as HTMLSelectElement).options).find(
      (option) => option.label === label,
    )!.value;
  await step.selectOptions(valueForStep("Materials"));
  await expect.element(ui.getByRole("heading", { name: "Plan the materials" })).toBeVisible();
  await step.selectOptions(valueForStep("Preview"));
  await expect.element(ui.getByRole("button", { name: "Play preview" })).toBeEnabled();
});

it("requires a separate shot selection after the assistant stages a production proposal", async () => {
  const workspaceId = randomUUID();
  const draft = createDraft(workspaceId, "video");
  const proposed = JSON.stringify(original);
  await saveDraft(
    { ...draft, stage: "render", fields: { tutorialProductionProposal: proposed } },
    0,
  );
  await using ui = await render(
    <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
    { router: false },
  );
  await expect.element(ui.getByRole("heading", { name: "Review proposed shots" })).toBeVisible();
  await expect.element(ui.getByRole("checkbox", { name: "Include shot 1" })).not.toBeChecked();
  await expect.element(ui.getByRole("button", { name: "Add selected shots" })).toBeDisabled();
  expect((await readDraft(workspaceId, draft.id))?.fields.tutorialProduction).toBeUndefined();
  await ui.getByRole("checkbox", { name: "Include shot 1" }).click();
  await ui.getByRole("button", { name: "Add selected shots" }).click();
  await expect
    .poll(async () => (await readDraft(workspaceId, draft.id))?.fields)
    .toEqual({ tutorialProduction: proposed });
});

it("keeps the completed render when a WAV retry fails or a shot edit supersedes a job", async () => {
  const workspaceId = randomUUID();
  const draft = createDraft(workspaceId, "video");
  await saveDraft(
    { ...draft, stage: "render", fields: { tutorialProduction: JSON.stringify(original) } },
    0,
  );
  const service = "http://127.0.0.1:4771";
  const realFetch = window.fetch.bind(window);
  let runs = 0;
  let superseded: AbortSignal | null | undefined;
  const mockFetch = vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    if (input === service + "/info") {
      return Response.json({
        schema: "studio-media-bridge/1",
        nativeVoiceAvailable: false,
        voice: "WAV",
      });
    }
    if (input !== service + "/render") return realFetch(input, init);
    runs += 1;
    if (runs === 2) return new Response("Retry declined.", { status: 422 });
    if (runs === 3) {
      superseded = init?.signal;
      return new Promise<Response>((_, reject) => {
        superseded?.addEventListener("abort", () => reject(superseded?.reason), { once: true });
      });
    }
    const form = new FormData();
    form.append("movie", new Blob(["fixture movie"], { type: "video/mp4" }), "movie.mp4");
    form.append("captions", new Blob(["WEBVTT\n"], { type: "text/vtt" }), "captions.vtt");
    form.append("preview", new Blob(["fixture poster"], { type: "image/jpeg" }), "preview.jpg");
    return new Response(form);
  });
  try {
    await using ui = await render(
      <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
      { router: false },
    );
    await userEvent.upload(
      ui.getByLabelText("Choose recording for dashboard"),
      recording("source.webm"),
    );
    await expect.element(ui.getByRole("button", { name: "Play preview" })).toBeEnabled();
    await ui.getByRole("checkbox", { name: "I reviewed this production plan" }).click();
    await ui.getByLabelText("Renderer pairing code").fill(service + "/#" + "a".repeat(43));
    await ui.getByRole("button", { name: "Connect local renderer" }).click();
    const renderButton = ui.getByRole("button", { name: "Render narrated MP4" });
    await expect.element(renderButton).toBeDisabled();
    const narration = ui.getByLabelText("Narration WAV for the full timeline");
    await userEvent.upload(narration, new File(["first"], "first.wav", { type: "audio/wav" }));
    await renderButton.click();
    const download = ui.getByRole("link", { name: "Download tutorial MP4" });
    await expect.element(download).toBeVisible();
    const first = download.element().getAttribute("href");

    await userEvent.upload(narration, new File(["retry"], "retry.wav", { type: "audio/wav" }));
    await renderButton.click();
    await expect.element(ui.getByText("Retry declined.", { exact: true })).toBeVisible();
    await expect.element(download).toHaveAttribute("href", first!);

    await renderButton.click();
    await expect.poll(() => !!superseded).toBe(true);
    await ui.getByRole("textbox", { name: "Narration" }).fill("Find the drawer.");
    await expect.poll(() => superseded?.aborted).toBe(true);
    await expect.element(download).toHaveAttribute("href", first!);
  } finally {
    mockFetch.mockRestore();
  }
});

it("edits a legacy tutorial’s presentation, invalidates approval and exports the new settings", async () => {
  const workspaceId = randomUUID();
  const draft = createDraft(workspaceId, "video");
  const before = JSON.stringify(original);
  await saveDraft({ ...draft, stage: "render", fields: { tutorialProduction: before } }, 0);

  {
    const container = document.createElement("div");
    container.style.width = "1040px";
    await using ui = await render(
      <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
      { router: false, container },
    );
    const aspect = ui.getByRole("combobox", { name: "Aspect ratio" });
    const captions = ui.getByRole("combobox", { name: "Subtitle position" });
    const review = ui.getByRole("checkbox", { name: "I reviewed this production plan" });
    const screen = () => container.querySelector<HTMLElement>(".ops-tutorial-screen")!;
    await expect.element(aspect).toHaveValue("16:9");
    await expect.element(captions).toHaveValue("lower");
    expect((await readDraft(workspaceId, draft.id))?.fields.tutorialProduction).toBe(before);
    expect(getComputedStyle(screen()).aspectRatio).toBe("16 / 9");

    await review.click();
    await ui.getByRole("button", { name: "Social reel" }).click();
    await expect.element(aspect).toHaveValue("9:16");
    await expect.element(captions).toHaveValue("center");
    await expect.element(review).not.toBeChecked();
    expect(getComputedStyle(screen()).aspectRatio).toBe("9 / 16");
    await aspect.selectOptions("1:1");
    await captions.selectOptions("off");
    expect(getComputedStyle(screen()).aspectRatio).toBe("1 / 1");

    const expected = { aspect: "1:1", style: "social-reel", captions: "off" };
    await expect
      .poll(
        async () =>
          JSON.parse((await readDraft(workspaceId, draft.id))?.fields.tutorialProduction ?? "null")
            ?.presentation,
      )
      .toEqual(expected);
    await review.click();
    const urls = vi.spyOn(URL, "createObjectURL");
    const anchor = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      await ui.getByRole("button", { name: "Download production plan" }).click();
      const exported = urls.mock.calls.at(-1)?.[0];
      expect(exported).toBeInstanceOf(Blob);
      expect(JSON.parse(await (exported as Blob).text())).toEqual({
        ...original,
        presentation: expected,
      });
    } finally {
      urls.mockRestore();
      anchor.mockRestore();
    }
  }

  await using reopened = await render(
    <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
    { router: false },
  );
  await expect.element(reopened.getByRole("combobox", { name: "Aspect ratio" })).toHaveValue("1:1");
  await expect
    .element(reopened.getByRole("combobox", { name: "Subtitle position" }))
    .toHaveValue("off");
  await reopened.getByRole("button", { name: "Walkthrough" }).click();
  await expect
    .element(reopened.getByRole("combobox", { name: "Aspect ratio" }))
    .toHaveValue("16:9");
  await expect
    .element(reopened.getByRole("combobox", { name: "Subtitle position" }))
    .toHaveValue("lower");
});

it("reviews imported formatting on a 390px Video Preview and crops the attached source to a portrait reel", async () => {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(390, 844);
  await using _restoreViewport = {
    [Symbol.asyncDispose]: () => page.viewport(viewport.width, viewport.height),
  };
  const workspaceId = randomUUID();
  const draft = createDraft(workspaceId, "video");
  await saveDraft(
    { ...draft, stage: "render", fields: { tutorialProduction: JSON.stringify(original) } },
    0,
  );
  const container = document.createElement("div");
  container.style.width = "100%";
  await using ui = await render(
    <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
    { router: false, container },
  );
  const proposal = {
    ...original,
    scenes: [{ ...original.scenes[0], narration: "Open the dashboard to continue.", id: "second" }],
    presentation: { aspect: "9:16", style: "social-reel", captions: "center" },
  };
  const importPlan = (plan: typeof proposal) =>
    userEvent.upload(
      ui.getByLabelText("Import production plan"),
      new File([JSON.stringify(plan)], "proposal.json", { type: "application/json" }),
    );
  await importPlan({ ...proposal, presentation: { ...proposal.presentation, aspect: "3:2" } });
  await expect.element(ui.getByRole("alert")).toBeVisible();
  await importPlan(proposal);
  const usePresentation = ui.getByRole("checkbox", { name: /Use proposed presentation/ });
  const aspect = ui.getByRole("combobox", { name: "Aspect ratio" });
  await expect.element(usePresentation).not.toBeChecked();
  await expect.element(aspect).toHaveValue("16:9");
  await usePresentation.click();
  await ui.getByRole("checkbox", { name: "Include shot 1" }).click();
  await ui.getByRole("button", { name: "Add selected shots" }).click();
  await expect.element(aspect).toHaveValue("9:16");
  await expect.element(ui.getByRole("textbox", { name: "Shot label" })).toBeVisible();
  await userEvent.upload(
    ui.getByLabelText("Choose recording for dashboard"),
    recording("portrait-source.webm"),
  );
  await expect.element(ui.getByRole("button", { name: "Play preview" })).toBeEnabled();
  const base = container.querySelector<HTMLElement>(".ops-workspace")!;
  const screen = container.querySelector<HTMLElement>(".ops-tutorial-screen")!;
  expect(base.scrollWidth).toBeLessThanOrEqual(base.clientWidth);
  expect(base.clientWidth).toBeLessThanOrEqual(390);
  expect(screen.getBoundingClientRect().height).toBeGreaterThan(
    screen.getBoundingClientRect().width,
  );
  expect(getComputedStyle(screen.querySelector("video")!).objectFit).toBe("cover");
  expect(screen.querySelector(".ops-tutorial-screen-text")?.textContent).toContain("Open the");
  expect(screen.querySelector("[data-highlight]")?.textContent).toBe("Open");
  expect(screen.querySelector(".ops-tutorial-screen-text strong")).toBeNull();
  const captionVerticalAnchor = () => {
    const { top, height } = screen.getBoundingClientRect();
    const text = screen.querySelector(".ops-tutorial-spoken")!.getBoundingClientRect();
    return (text.top + text.height / 2 - top) / height;
  };
  const captions = ui.getByRole("combobox", { name: "Subtitle position" });
  expect(captionVerticalAnchor()).toBeCloseTo(0.5, 2);
  await captions.selectOptions("lower");
  expect(captionVerticalAnchor()).toBeCloseTo(0.76, 2);
  await captions.selectOptions("off");
  expect(screen.querySelector(".ops-tutorial-screen-text")).toBeNull();
  await ui.getByRole("button", { name: "Walkthrough" }).click();
  await aspect.selectOptions("9:16");
  await captions.selectOptions("off");
  expect(getComputedStyle(screen.querySelector("video")!).objectFit).toBe("contain");
  expect(screen.querySelector(".ops-tutorial-label strong")?.textContent).toBe("Dashboard");
  expect(screen.querySelector(".ops-tutorial-spoken")).toBeNull();
});
