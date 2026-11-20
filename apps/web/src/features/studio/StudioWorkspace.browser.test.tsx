import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import StudioWorkspace, { type StudioAgentRequest } from "./StudioWorkspace";
import { listDrafts } from "./drafts";
import { recording } from "./clipRecordingFixture";

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
    const workspaceId = randomUUID();
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
    expect(container.querySelectorAll(".ops-choices button")).toHaveLength(7);
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
      if (category === "Replica" && label === "Reference and location") {
        await textbox("Observed behavior").fill("The count updates immediately");
        await textbox("Rights and use limits").fill("Analysis only");
      }
      if (category === "Clipper" && label === "Review notes") {
        await expect.element(screen.getByText("Caption · Callout", { exact: true })).toBeVisible();
        await expect.element(screen.getByText("Keep both hands visible", { exact: true })).toBeVisible();
      }
      if (category === "Clipper" && label === "Mark in") {
        await textbox("Mark out").fill("00:29");
      }
      if (category === "Clipper" && label === "Crop and framing") {
        const png = await new Promise<Blob>((resolve) =>
          document.createElement("canvas").toBlob((blob) => resolve(blob!), "image/png"),
        );
        await userEvent.upload(screen.getByLabelText("Use a permitted reference still (optional)"),
          new File([png], "private-reference.png", { type: "image/png" }));
        await expect.element(screen.getByRole("img", { name: "Selected reference frame" })).toBeVisible();
        await textbox("Caption text").fill("A long caption ".repeat(10));
        await button("Headline").click();
        await expect.element(screen.getByText(/This caption exceeds the frame/)).toBeVisible();
        await expect.element(button("Use this look")).toBeDisabled();
        await textbox("Caption text").fill("Keep both hands visible");
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
        expect(JSON.stringify(exported)).not.toContain("private-reference.png");
        expect(JSON.stringify(exported)).not.toContain("blob:");
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
      if (category === "Replica") {
        expect(Object.keys(exported.fields).sort()).toEqual(["brief", "interfaceSketch"]);
        await screen.getByText("Review brief contents", { exact: true }).click();
        await screen.getByRole("checkbox", { name: /permission to share/ }).click();
        await button(download).click();
        const shared = JSON.parse(await (createUrl.mock.calls.at(-1)![0] as Blob).text());
        expect(Object.keys(shared.fields).sort()).toEqual(["brief", "interfaceSketch", "observation"]);
        expect(shared.fields.observation).toBe("The count updates immediately");
        await screen.getByText("Private backup", { exact: true }).click();
        await button("Download private draft").click();
        const backup = JSON.parse(await (createUrl.mock.calls.at(-1)![0] as Blob).text());
        expect(backup.schema).toBe("studio-project-backup/1");
        expect(Object.values(backup.fields)).toEqual(expect.arrayContaining([sheets[0][1], "Analysis only"]));
      }
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
  await using screen = await render(<StudioWorkspace workspaceId={randomUUID()} />, {
    router: false,
  });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const name = screen.getByRole("textbox", { name: "Project name", exact: true });
  const brief = screen.getByRole("textbox", { name: "What will you make?", exact: true });
  const note = "Show the hinge assembly from three angles.";
  await button(/^Video/).click();
  await name.fill("Hinge study");
  await screen.getByRole("radio", { name: "3D showcase" }).click();
  await button("Apply style").click();
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

it("keeps a stick-figure project's motion direction on its storyboard after reopening", async () => {
  const workspaceId = randomUUID();
  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, { router: false });
  const button = (name: string | RegExp) => screen.getByRole("button", { name, exact: typeof name === "string" });
  const direction = "Hold on the empty chair, then turn the figure toward the open door.";
  await button(/^Video/).click();
  await screen.getByRole("textbox", { name: "Project name" }).fill("The spare chair");
  await screen.getByRole("radio", { name: "Stick-figure explainer" }).click();
  await button("Apply style").click();
  await button("Next").click();
  await button("Next").click();
  await screen.getByRole("textbox", { name: "Motion direction (optional)" }).fill(direction);
  await button("Next").click();
  await expect.element(screen.getByRole("heading", { name: "Build your storyboard" })).toBeVisible();
  await button("Projects").click();
  await button(/^The spare chair/).click();
  await expect.element(screen.getByText(direction, { exact: true })).toBeVisible();
  expect((await listDrafts(workspaceId))[0]).toMatchObject({
    style: "stick-figure-explainer", stage: "storyboard", fields: { motionDirection: direction },
  });
});

it("prepares a Replica question with only the excerpts explicitly included on this sheet", async () => {
  const requests: StudioAgentRequest[] = [];
  await using screen = await render(
    <StudioWorkspace workspaceId={randomUUID()} onAskAgent={async (request) => { requests.push(request); }} />,
    { router: false },
  );
  const button = (name: string | RegExp) => screen.getByRole("button", { name, exact: typeof name === "string" });
  await button(/^Replica/).click();
  await screen.getByRole("textbox", { name: "Observed behavior" }).fill("The open count falls by one");
  await button("Ask agent for options").click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]!.prompt).not.toContain("The open count");
  await screen.getByText("Choose what to include", { exact: true }).click();
  await screen.getByRole("checkbox", { name: /Include these excerpts/ }).click();
  await button("Ask agent for options").click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]!.prompt).toContain("The open count falls by one");
  await screen.getByRole("textbox", { name: "Observed behavior" }).fill("Revised private observation");
  await expect.element(screen.getByRole("checkbox", { name: /Include these excerpts/ })).not.toBeChecked();
  await button("Ask agent for options").click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]!.prompt).not.toContain("Revised private observation");
  await button("Next").click();
  await screen.getByRole("textbox", { name: "Proposed behavior" }).fill("Keep an accessible total");
  await button("Ask agent for options").click();
  await expect.poll(() => requests.length).toBe(4);
  expect(requests[3]!.prompt).not.toContain("Keep an accessible total");
  expect(requests[3]!.prompt).not.toContain("The open count");
});

it("hands saved context to the agent and cancels requests on step changes and project exit", async () => {
  const workspace = randomUUID();
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

it("carries Source media into Moment and clears transient media when the project reopens", async () => {
  const workspaceId = randomUUID();
  const onEvidenceReady = vi.fn();
  const container = document.createElement("div");
  container.style.width = "390px";
  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} onEvidenceReady={onEvidenceReady} />,
    { container, router: false });
  const button = (name: string | RegExp) => screen.getByRole("button", { name, exact: typeof name === "string" });
  await button(/^Clipper/).click();
  await screen.getByRole("textbox", { name: "Project name" }).fill("Source fixture");
  await userEvent.upload(screen.getByLabelText("Choose a video file"), recording("private.webm"));
  await expect.element(screen.getByLabelText("Source video")).toBeVisible();
  const pane = container.querySelector(".ops-workspace")!;
  expect(pane.scrollWidth).toBeLessThanOrEqual(pane.clientWidth);
  await button("Next").click();
  await expect.element(button("Set mark in")).toBeEnabled();
  await button("Back").click();
  await expect.element(screen.getByLabelText("Source video")).toBeVisible();
  const saved = (await listDrafts(workspaceId))[0];
  expect(JSON.stringify(saved)).not.toContain("private.webm");
  expect(onEvidenceReady).not.toHaveBeenCalled();

  const goal = screen.getByRole("textbox", { name: "What should the clip show?" });
  await goal.fill("Find the opening from my private workshop.");
  await button("Prepare evidence").click();
  await button("Use reviewed evidence").click();
  await expect.poll(() => onEvidenceReady.mock.calls.length).toBe(1);
  const inventory = (await listDrafts(workspaceId))[0]?.fields.clipSourceEvidence;
  expect(JSON.parse(inventory!)).toMatchObject({
    mediaRevision: expect.stringMatching(/^sha256:/),
    sourceRevision: expect.stringMatching(/^sha256:/),
    durationMs: 2000,
  });
  expect(inventory).not.toContain("private workshop");
  expect(inventory).not.toContain("private.webm");

  await button("Projects").click();
  await button(/^Source fixture/).click();
  await expect.element(screen.getByLabelText("Choose a video file")).toBeEnabled();
  await expect.element(screen.getByLabelText("Source video")).not.toBeInTheDocument();
  await userEvent.upload(screen.getByLabelText("Choose a video file"), recording("reattached.webm"));
  await expect.element(screen.getByLabelText("Source video")).toBeVisible();
  expect((await listDrafts(workspaceId))[0]?.fields.clipSourceEvidence).toBe(inventory);
  expect(onEvidenceReady).toHaveBeenCalledTimes(1);
  await goal.fill("Find a different part.");
  await button("Next").click();
  await expect.poll(async () => (await listDrafts(workspaceId))[0]?.fields.clipSourceEvidence).toBe("");
});
