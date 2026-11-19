import { describe, expect, it } from "vite-plus/test";
import { createDraft, DraftConflict, DraftEditor, isStudioDraft, stages } from "./drafts";
import { catalog, selectedTools, starterOptions } from "./guide";

describe("Studio working drafts", () => {
  it("starts all three project types with independent identities", () => {
    const blank = createDraft("one", "blank");
    const product = createDraft("one", "digital-product");
    const video = createDraft("one", "video");
    expect(new Set([blank.id, product.id, video.id]).size).toBe(3);
    expect([blank.stage, product.stage, video.stage]).toEqual(["notes", "format", "style"]);
    expect(isStudioDraft(video, "two")).toBe(false);
    expect(isStudioDraft({ ...video, stage: "unknown" }, "one")).toBe(false);
    expect(isStudioDraft({ ...video, schema: 2 }, "one")).toBe(false);
    expect(stages.video.at(-2)).toBe("export");
    expect(stages.video.at(-1)).toBe("publish");
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
      throw new DraftConflict("Changed elsewhere");
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
