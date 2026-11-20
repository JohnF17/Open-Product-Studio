import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { createDraft, readDraft, saveDraft, type Category } from "./drafts";
import type { BuilderAssistantBridge } from "./builderAssistantRoute";
import StudioWorkspace from "./StudioWorkspace";

const label = "Draft helper · Example model (high)";
function fakeBridge(): BuilderAssistantBridge {
  return {
    selector: <button type="button">Example model (high)</button>,
    routeLabel: label,
    routeKey: "fixture-instance/model/high",
    hasAvailableProviders: true,
    open: vi.fn(async () => {}),
    read: vi.fn(async () => null),
  };
}

it.each([
  ["blank", "notes"],
  ["digital-product", "outline"],
  ["video", "storyboard"],
  ["clipper", "edit"],
  ["replica", "design"],
  ["day-trader", "rules"],
  ["affiliate-storefront", "design"],
] satisfies [Category, string][])(
  "applies and undoes a local starter in the %s builder",
  async (category, stage) => {
    const workspaceId = randomUUID();
    const draft = { ...createDraft(workspaceId, category), stage };
    await saveDraft(draft, 0);
    await using screen = await render(
      <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
      { router: false },
    );
    const panel = screen.getByRole("region", { name: "Step assistant" });
    await panel.getByRole("button", { name: "Suggest", exact: true }).click();
    await expect.element(panel.getByText("Local starter · built into Studio")).toBeVisible();
    await panel.getByRole("button", { name: "Apply selected" }).click();
    await expect
      .poll(async () => {
        const copy = await readDraft(workspaceId, draft.id);
        return (
          copy &&
          JSON.stringify([copy.fields, copy.affiliate]) !==
            JSON.stringify([draft.fields, draft.affiliate])
        );
      })
      .toBe(true);
    await panel.getByRole("button", { name: "Undo applied changes" }).click();
    await expect
      .poll(async () => {
        const copy = await readDraft(workspaceId, draft.id);
        return JSON.stringify([copy?.fields, copy?.affiliate]);
      })
      .toBe(JSON.stringify([draft.fields, draft.affiliate]));
  },
);

it("lets a creator review the exact outbound text and accept a matching reply after returning from T3", async () => {
  const workspaceId = randomUUID();
  const draft = {
    ...createDraft(workspaceId, "blank"),
    fields: { notes: "Private workshop notes" },
  };
  await saveDraft(draft, 0);
  const bridge = fakeBridge();
  const props = { workspaceId, routeProjectId: draft.id, builderAssistant: bridge };
  await using first = await render(<StudioWorkspace {...props} />, { router: false });
  const panel = first.getByRole("region", { name: "Step assistant" });
  await panel.getByRole("button", { name: "Suggest", exact: true }).click();
  await panel.getByRole("textbox").fill("Help plan a balcony garden");
  await panel.getByText("Review exact request").click();
  const prompt = panel.element().querySelector("pre")?.textContent;
  expect(prompt).toContain("balcony garden");
  expect(prompt).not.toContain("Private workshop notes");
  await panel.getByRole("button", { name: "Open reviewed draft in T3" }).click();
  await expect.poll(() => vi.mocked(bridge.open).mock.calls.length).toBe(1);
  const binding = vi.mocked(bridge.open).mock.calls[0]![0];
  expect(binding.prompt).toBe(prompt);
  expect(binding.projectId).toBe(draft.id);
  expect(binding.routeKey).toBe(bridge.routeKey);
  await first.unmount();
  await using second = await render(<StudioWorkspace {...props} />, { router: false });
  const returned = second.getByRole("region", { name: "Step assistant" });
  await returned.getByRole("button", { name: "Read completed reply" }).click();
  await expect
    .element(returned.getByText(/matching completed reply is not available/))
    .toBeVisible();
  vi.mocked(bridge.read).mockResolvedValue(
    JSON.stringify({
      summary: "Plan the growing space.",
      nextStep: "Measure daylight at the balcony.",
      changes: [{ key: "notes", value: "Measure the balcony before selecting pots." }],
    }),
  );
  await returned.getByRole("button", { name: "Read completed reply" }).click();
  await expect.element(returned.getByRole("button", { name: "Apply selected" })).toBeEnabled();
  expect(vi.mocked(bridge.read).mock.calls[1]![0]).toEqual(binding);
  expect((await readDraft(workspaceId, draft.id))?.fields.notes).toBe("Private workshop notes");
  await returned.getByRole("button", { name: "Apply selected" }).click();
  await expect
    .poll(async () => (await readDraft(workspaceId, draft.id))?.fields.notes)
    .toContain("Measure the balcony");
});

it("keeps Day Trader offline even when T3 is connected and never applies an explanation", async () => {
  const workspaceId = randomUUID();
  const draft = { ...createDraft(workspaceId, "day-trader"), stage: "rules" };
  await saveDraft(draft, 0);
  const bridge = fakeBridge();
  await using screen = await render(
    <StudioWorkspace
      workspaceId={workspaceId}
      routeProjectId={draft.id}
      builderAssistant={bridge}
    />,
    { router: false },
  );
  const panel = screen.getByRole("region", { name: "Step assistant" });
  await panel.getByRole("button", { name: "Explain", exact: true }).click();
  await expect.element(panel.getByText("Local starter · built into Studio")).toBeVisible();
  expect(panel.element().querySelector("textarea")).toBeNull();
  expect(panel.element().textContent).not.toContain("Apply selected");
  expect(bridge.open).not.toHaveBeenCalled();
});

it("runs an installed device model for a practice explanation and returns keyboard focus to Explain", async () => {
  const workspaceId = randomUUID();
  const draft = {
    ...createDraft(workspaceId, "day-trader"),
    stage: "journal",
    fields: { journalNotes: "Private practice notes" },
  };
  await saveDraft(draft, 0);
  const destroy = vi.fn();
  const reply = JSON.stringify({
    summary: "Record what you knew at the time.",
    nextStep: "Write down one observation.",
    changes: [],
  });
  const promptStreaming = vi.fn(
    (_prompt: string) =>
      new ReadableStream({
        start(controller) {
          controller.enqueue(reply);
          controller.close();
        },
      }),
  );
  vi.stubGlobal("LanguageModel", {
    availability: async () => "available",
    create: async () => ({ promptStreaming, destroy }),
  });
  const bridge = fakeBridge();
  try {
    await using screen = await render(
      <StudioWorkspace
        workspaceId={workspaceId}
        routeProjectId={draft.id}
        builderAssistant={bridge}
      />,
      { router: false },
    );
    const panel = screen.getByRole("region", { name: "Step assistant" });
    await expect.element(panel.getByText("On-device AI", { exact: true })).toBeVisible();
    const explain = panel.getByRole("button", { name: "Explain", exact: true });
    await explain.click();
    await panel.getByRole("textbox").fill("What should a practice entry capture?");
    await panel.getByRole("button", { name: "Ask on-device AI" }).click();
    await expect.element(panel.getByText("Record what you knew at the time.")).toBeVisible();
    expect(promptStreaming.mock.calls[0]?.[0]).not.toContain("Private practice notes");
    expect(destroy).toHaveBeenCalledOnce();
    expect(bridge.open).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    await expect.element(explain).toHaveFocus();
    expect((await readDraft(workspaceId, draft.id))?.fields).toEqual(draft.fields);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("invalidates an earlier suggestion once the author edits its target", async () => {
  const workspaceId = randomUUID();
  const draft = { ...createDraft(workspaceId, "digital-product"), stage: "outline" };
  await saveDraft(draft, 0);
  await using screen = await render(
    <StudioWorkspace workspaceId={workspaceId} routeProjectId={draft.id} />,
    { router: false },
  );
  const panel = screen.getByRole("region", { name: "Step assistant" });
  await panel.getByRole("button", { name: "Suggest", exact: true }).click();
  await screen.getByRole("textbox", { name: "Section outline" }).fill("My replacement");
  await expect.element(panel.getByRole("button", { name: "Apply selected" })).toBeDisabled();
  await expect
    .poll(async () => (await readDraft(workspaceId, draft.id))?.fields.outline)
    .toBe("My replacement");
});
