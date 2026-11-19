import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import StudioWorkspace, { type StudioAgentRequest } from "./StudioWorkspace";
import { listDrafts } from "./drafts";

const workingDraftCases = [
  {
    category: "Clipper",
    sheets: [
      ["Reference recording", "Workshop walkthrough, take 2"],
      ["Mark in", "00:12"],
      ["Crop and framing", "9:16, keep both hands in frame"],
      ["Review notes", "Check that the captions clear the hands"],
    ],
    download: "Download edit plan",
    kind: "edit-plan",
    exportField: { key: "cropNotes", fromSheet: 2 },
    optional: { button: "Publishing prep (optional)", heading: "Prepare a possible post" },
  },
  {
    category: "Replica",
    sheets: [
      ["Reference and location", "My notes from the workshop signup flow"],
      ["Proposed behavior", "Filter upcoming workshops by skill level"],
      ["Interface sketch", "A filter row above the list with an inline empty state"],
    ],
    download: "Download design brief",
    kind: "design-brief",
    exportField: { key: "interfaceSketch", fromSheet: 2 },
    optional: { button: "Prototype (optional)", heading: "Build an isolated prototype" },
  },
  {
    category: "Day Trader",
    sheets: [
      ["Practice dataset reference", "Synthetic workshop series, revision B"],
      ["Practice rules", "Reveal one saved bar at a time and write down what changed"],
      ["Practice decision", "Pause the exercise at the first gap in the dataset"],
      ["Journal notes", "I spotted the gap before looking at the next bar"],
    ],
    download: "Download practice journal",
    kind: "practice-journal",
    exportField: { key: "journalNotes", fromSheet: 3 },
    optional: undefined,
  },
] as const;

it.each(workingDraftCases)(
  "edits, reopens and exports a $category working draft",
  async ({ category, sheets, download, kind, exportField, optional }) => {
    const workspaceId = crypto.randomUUID();
    const onAskAgent = vi.fn(async () => {});
    const container = document.createElement("div");
    container.style.width = "320px";
    await using screen = await render(
      <StudioWorkspace workspaceId={workspaceId} onAskAgent={onAskAgent} />,
      { container, router: false },
    );
    const button = (name: string | RegExp) =>
      screen.getByRole("button", { name, exact: typeof name === "string" });
    const textbox = (name: string) => screen.getByRole("textbox", { name, exact: true });

    await expect.element(button(/^Day Trader/)).toBeVisible();
    expect(container.querySelectorAll(".ops-choices button")).toHaveLength(6);
    const workspace = container.querySelector(".ops-workspace")!;
    expect(workspace.scrollWidth).toBeLessThanOrEqual(workspace.clientWidth);
    await button(new RegExp("^" + category)).click();
    await expect.element(textbox(sheets[0][0])).toHaveValue("");
    if (category === "Day Trader") {
      await expect.element(button("Ask agent for options")).not.toBeInTheDocument();
    }
    await textbox("Project name").fill("Working study");
    for (const [index, [label, sample]] of sheets.entries()) {
      await textbox(label).fill(sample);
      if (category === "Clipper" && label === "Mark in") {
        await textbox("Mark out").fill("00:29");
      }
      if (category === "Clipper" && label === "Crop and framing") {
        await textbox("Caption text").fill("Keep both hands visible");
        await button("Headline").click();
        await button("Use this look").click();
        await button("Undo look").click();
        await button("Callout").click();
        await button("Use this look").click();
        await screen.getByText("Style and audio (optional)", { exact: true }).click();
        await textbox("Style notes").fill("Use a dark backing for captions");
      }
      if (index < sheets.length - 1) await button("Next").click();
    }
    await button("Projects").click();
    await button(/^Working study/).click();
    const [lastLabel, lastValue] = sheets.at(-1)!;
    await expect.element(textbox(lastLabel)).toHaveValue(lastValue);

    await button("Next").click();
    const createUrl = vi.spyOn(URL, "createObjectURL");
    const clickLink = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      await button(download).click();
      const blob = createUrl.mock.calls.at(-1)?.[0];
      expect(blob).toBeInstanceOf(Blob);
      const exported = JSON.parse(await (blob as Blob).text());
      expect(exported).toMatchObject({
        kind,
        content: "authored-notes",
        fields: { [exportField.key]: sheets[exportField.fromSheet]?.[1] },
      });
      if (category === "Clipper") {
        expect(exported.fields).toMatchObject({
          markIn: "00:12",
          markOut: "00:29",
          captionLook: "label",
          captionLine: "Keep both hands visible",
          styleNotes: "Use a dark backing for captions",
        });
      }
      if (category === "Day Trader") {
        expect(exported).not.toHaveProperty("orders");
        expect(exported).not.toHaveProperty("fills");
      }
      expect(clickLink).toHaveBeenCalledTimes(1);
    } finally {
      createUrl.mockRestore();
      clickLink.mockRestore();
    }
    if (optional) {
      await button(optional.button).click();
      await expect.element(screen.getByRole("heading", { name: optional.heading })).toBeVisible();
      if (category === "Replica") {
        await expect.element(screen.getByText(/Planned for M6B/)).toBeVisible();
        await expect.element(button("Build prototype")).not.toBeInTheDocument();
      } else {
        await textbox("Post caption").fill("A draft caption for the workshop clip");
        await expect.element(button("Publish")).not.toBeInTheDocument();
      }
    }
    expect(onAskAgent).not.toHaveBeenCalled();
  },
);

it("preserves an editable video brief through forward, backward and project navigation", async () => {
  await using screen = await render(<StudioWorkspace workspaceId={crypto.randomUUID()} />, {
    router: false,
  });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const name = screen.getByRole("textbox", { name: "Project name", exact: true });
  const brief = screen.getByRole("textbox", { name: "What will you make?", exact: true });
  const note = "Show the hinge assembly from three angles.";
  await button(/^Video/).click();
  await name.fill("Hinge study");
  await button(/^3D showcase/).click();
  await button("Next").click();
  await expect
    .element(screen.getByRole("combobox", { name: "3D shot", exact: true }))
    .toBeVisible();
  await button("Next").click();
  await brief.fill(note);
  await button("Back").click();
  await button("Next").click();
  await expect.element(brief).toHaveValue(note);
  await button("Projects").click();
  await button(/^Hinge study/).click();
  await expect.element(brief).toHaveValue(note);
});

it("prepares a Replica question with only the excerpts explicitly included on this sheet", async () => {
  const requests: StudioAgentRequest[] = [];
  await using screen = await render(
    <StudioWorkspace workspaceId={crypto.randomUUID()} onAskAgent={async (request) => { requests.push(request); }} />,
    { router: false },
  );
  const button = (name: string | RegExp) => screen.getByRole("button", { name, exact: typeof name === "string" });
  await button(/^Replica/).click();
  await screen.getByRole("textbox", { name: "Observed behavior" }).fill("The open count falls by one");
  await button("Ask agent for options").click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]!.prompt).not.toContain("The open count");
  await screen.getByText("Choose what to include", { exact: true }).click();
  await screen.getByRole("checkbox", { name: /Include these excerpts/ }).check();
  await button("Ask agent for options").click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]!.prompt).toContain("The open count falls by one");
  await button("Next").click();
  await screen.getByRole("textbox", { name: "Proposed behavior" }).fill("Keep an accessible total");
  await button("Ask agent for options").click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]!.prompt).not.toContain("Keep an accessible total");
  expect(requests[2]!.prompt).not.toContain("The open count");
});

it("hands saved context to the agent and cancels requests on step changes and project exit", async () => {
  const workspace = crypto.randomUUID();
  const requests: StudioAgentRequest[] = [];
  const handoff = async (request: StudioAgentRequest) => {
    requests.push(request);
    await new Promise<void>((resolve) =>
      request.signal.addEventListener("abort", () => resolve(), { once: true }),
    );
  };
  await using screen = await render(
    <StudioWorkspace workspaceId={workspace} onAskAgent={handoff} />,
    { router: false },
  );
  await screen.getByRole("button", { name: /^Video/ }).click();
  await screen.getByRole("textbox", { name: "Project name" }).fill("Final cut");
  const ask = screen.getByRole("button", { name: "Ask agent for options" });
  await ask.click();
  await expect.poll(() => requests.length).toBe(1);
  expect((await listDrafts(workspace))[0]).toMatchObject({
    id: requests[0]!.projectId,
    title: "Final cut",
    stage: "style",
  });
  expect(requests[0]!.prompt).toContain("Final cut");
  await screen.getByRole("button", { name: "Next", exact: true }).click();
  expect(requests[0]!.signal.aborted).toBe(true);
  await ask.click();
  await expect.poll(() => requests.length).toBe(2);
  await screen.getByRole("button", { name: "Projects", exact: true }).click();
  expect(requests[1]!.signal.aborted).toBe(true);
});
