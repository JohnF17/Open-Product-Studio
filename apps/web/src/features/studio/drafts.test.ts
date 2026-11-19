import { describe, expect, it } from "vite-plus/test";
import {
  categories,
  createDraft,
  DraftConflict,
  DraftEditor,
  isStudioDraft,
  stages,
} from "./drafts";
import { catalog, draftExport, selectedTools, starterOptions, styleNames } from "./guide";

describe("Studio working drafts", () => {
  it("starts six schema-1 project types with independent identities", () => {
    const drafts = categories.map(({ id }) => createDraft("one", id));
    expect(new Set(drafts.map(({ id }) => id)).size).toBe(6);
    expect(drafts.map(({ stage }) => stage)).toEqual([
      "notes",
      "format",
      "style",
      "source",
      "reference",
      "practice-data",
    ]);
    expect(drafts.every((draft) => isStudioDraft(draft, "one"))).toBe(true);
    const video = createDraft("one", "video");
    expect(isStudioDraft(video, "two")).toBe(false);
    expect(isStudioDraft({ ...video, stage: "unknown" }, "one")).toBe(false);
    expect(isStudioDraft({ ...video, schema: 2 }, "one")).toBe(false);
    expect(stages.video.at(-2)).toBe("export");
    expect(stages.video.at(-1)).toBe("publish");
  });

  it("keeps working draft routes aligned with the catalog", () => {
    expect(stages.clipper).toEqual(catalog.clipperStages.map(({ id }) => id));
    expect(stages.replica).toEqual(catalog.replicaStages.map(({ id }) => id));
    expect(stages["day-trader"]).toEqual(catalog.dayTraderStages.map(({ id }) => id));
  });

  it("reopens the original video styles and the stick-figure style in schema 1", () => {
    const draft = createDraft("one", "video");
    expect(draft.style).toBe("kinetic-type");
    for (const style of ["kinetic-type", "product-demo", "3d-showcase", "stick-figure-explainer"]) {
      expect(isStudioDraft({ ...draft, style }, "one")).toBe(true);
    }
    expect(isStudioDraft({ ...draft, style: "unknown" }, "one")).toBe(false);
    expect(styleNames).toContain("stick-figure-explainer");
    expect(new Set(styleNames)).toEqual(new Set(Object.keys(catalog.styles)));
  });

  it("exports a stick-figure storyboard with the creator's motion direction and local tool plan", () => {
    const fields = { motionDirection: "Hold while the figure points, then reveal the label." };
    const draft = { ...createDraft("one", "video"), style: "stick-figure-explainer" as const, fields };
    expect(draftExport(draft)).toMatchObject({
      style: { id: "stick-figure-explainer", version: 1 },
      plannedTools: ["scene-editor", "hyperframes"],
      fields,
    });
    expect(starterOptions(draft)[0]?.brief).toMatch(/figure/i);
  });

  const firstCue = { id: "a", timestamp: "0:00", action: "Open the envelope.", narration: "", caption: "", sound: "" };
  const secondCue = { id: "b", timestamp: "0:02.5", action: "", narration: "Read the letter.", caption: "Hello", sound: "Paper rustles" };

  it("retains unfinished cue text and gives other tools the planned starts in milliseconds", () => {
    const draft = createDraft("one", "video");
    expect(draftExport(draft)).not.toHaveProperty("cueSheet");
    expect(draftExport({ ...draft, videoCues: [] })).not.toHaveProperty("cueSheet");
    const planned = { ...draft, videoCues: [firstCue, secondCue] };
    expect(isStudioDraft(planned, "one")).toBe(true);
    expect(draftExport(planned)).toMatchObject({
      cueSheet: { timing: "ready", cues: [{ ...firstCue, startMs: 0 }, { ...secondCue, startMs: 2500 }] },
      fields: {},
    });
    const unfinished = { ...secondCue, timestamp: "0:" };
    const partial = { ...draft, videoCues: [firstCue, unfinished] };
    expect(isStudioDraft(partial, "one")).toBe(true);
    expect(draftExport(partial).cueSheet).toEqual({
      timing: "draft", cues: [{ ...firstCue, startMs: 0 }, { ...unfinished, startMs: null }],
    });
  });

  it.each([
    ["", null, "draft"],
    ["0:60", null, "draft"],
    ["0:9", null, "draft"],
    ["-1:12", null, "draft"],
    ["1:60:05", null, "draft"],
    ["1:03.0000", null, "draft"],
    ["9007199254740992:00", null, "draft"],
    ["00:01", 1000, "draft"],
    ["00:02.500", 2500, "draft"],
    ["00:02.501", 2501, "ready"],
    ["1:02:03.04", 3723040, "ready"],
  ] as const)("checks the next cue at %j without reranking or dropping it", (timestamp, startMs, timing) => {
    const next = { ...firstCue, timestamp };
    const draft = { ...createDraft("one", "video"), videoCues: [secondCue, next] };
    expect(draftExport(draft).cueSheet).toEqual({
      timing, cues: [{ ...secondCue, startMs: 2500 }, { ...next, startMs }],
    });
  });

  it("rejects malformed cue collections and keeps cues within the Video project", () => {
    const draft = createDraft("one", "video");
    for (const videoCues of [null, {}, ["text"], [firstCue, firstCue], [{ ...firstCue, id: "" }], [{ ...firstCue, timestamp: 2 }]]) {
      expect(isStudioDraft({ ...draft, videoCues }, "one")).toBe(false);
    }
    const replica = { ...createDraft("one", "replica"), videoCues: [firstCue] };
    expect(isStudioDraft(replica, "one")).toBe(false);
    expect(draftExport(replica)).not.toHaveProperty("cueSheet");
  });

  it.each([
    ["clipper", "edit-plan"],
    ["replica", "design-brief"],
    ["day-trader", "practice-journal"],
  ] as const)("exports %s as authored notes with an explicit artifact type", (category, kind) => {
    const fields = { brief: "Written by the project owner" };
    const draft = { ...createDraft("one", category), stage: "export", fields };
    expect(draftExport(draft)).toEqual({
      schema: "studio-working-draft/1",
      category,
      title: expect.any(String),
      stage: "export",
      fields,
      kind,
      content: "authored-notes",
    });
  });

  it("keeps private source fields out of a Replica handoff, including when sharing an observation", () => {
    const fields = {
      referenceNote: "/private/source", referenceRights: "Analysis only", observation: "One count changed",
      brief: "Track open tasks", interfaceSketch: "A list with a total", privateFutureField: "Secret",
    };
    const draft = { ...createDraft("one", "replica"), fields };
    expect(draftExport(draft).fields).toEqual({ brief: fields.brief, interfaceSketch: fields.interfaceSketch });
    expect(draftExport(draft, "brief-with-observation").fields).toEqual({
      brief: fields.brief, interfaceSketch: fields.interfaceSketch, observation: fields.observation,
    });
    expect(draftExport(draft, "draft").fields).toEqual(fields);
  });

  it("coalesces rapid edits and only advances a committed revision", async () => {
    const commits: [string, number][] = [];
    let resume!: () => void;
    const editor = new DraftEditor(createDraft("one", "blank"), async (draft, revision) => {
      commits.push([draft.title, revision]);
      if (revision === 0)
        await new Promise<void>((resolve) => {
          resume = resolve;
        });
      return revision + 1;
    });
    editor.update({ title: "A" });
    editor.update({ title: "AB" });
    editor.update({ title: "ABC" });
    resume();
    await editor.flush();
    await editor.flush();
    expect(commits).toEqual([
      ["A", 0],
      ["ABC", 1],
    ]);
    expect(editor.snapshot()).toMatchObject({
      status: "saved",
      draft: { revision: 2, title: "ABC" },
    });
  });

  it("retains local edits after a conflicting write and never blindly retries", async () => {
    let calls = 0;
    const editor = new DraftEditor(createDraft("one", "video"), async () => {
      calls++;
      throw new DraftConflict({ message: "Changed elsewhere" });
    });
    editor.update({ title: "My cut" });
    await editor.flush();
    editor.update({ fields: { script: "Keep this work" } });
    await editor.flush();
    expect(editor.snapshot()).toMatchObject({
      status: "conflict",
      draft: { title: "My cut", fields: { script: "Keep this work" } },
    });
    expect(calls).toBe(1);
  });

  it("retries a recoverable storage error without dropping the active draft", async () => {
    let calls = 0;
    const editor = new DraftEditor(createDraft("one", "blank"), async (_draft, revision) => {
      if (++calls === 1) throw new Error("Storage unavailable");
      return revision + 1;
    });
    editor.update({ fields: { notes: "My notes" } });
    await editor.flush();
    expect(editor.snapshot().status).toBe("error");
    await editor.flush();
    expect(editor.snapshot()).toMatchObject({
      status: "saved",
      draft: { revision: 1, fields: { notes: "My notes" } },
    });
  });

  it("selects only tools offered by the chosen style", () => {
    const project = {
      ...createDraft("one", "video"),
      style: "3d-showcase" as const,
      tools: ["shot-import", "elevenlabs", "unknown-tool"],
    };
    const selected = selectedTools(project);
    expect(selected).toContain("shot-import");
    expect(selected).not.toContain("blender");
    expect(selected).toContain("elevenlabs");
    expect(selected).not.toContain("unknown-tool");
    expect(selected.every((id) => Object.hasOwn(catalog.stackEntries, id))).toBe(true);
    expect(starterOptions(project)[0]?.title).toBe("An object in detail");
  });
});
