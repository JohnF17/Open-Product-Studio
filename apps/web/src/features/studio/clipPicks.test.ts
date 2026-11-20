import { describe, expect, it } from "vite-plus/test";
import { clipEditPlanFields, encodeClipBatch, readClipBatch } from "./clipBatch";
import { clipEvidenceInventory, readClipEvidence, readClipPicks, type ClipEvidence, type ClipPick } from "./clipPicks";

const evidence: ClipEvidence = {
  sourceRevision: "evidence-1", mediaRevision: "movie-1", durationMs: 2500,
  frames: [{ id: "frame-1", timeMs: 250 }],
  transcript: [{ id: "cue-1", startMs: 1100, endMs: 2100 }],
};
const pick: ClipPick = {
  startMs: 0, endMs: 500, title: "First move", reason: "The diagram is visible.",
  evidenceIds: ["frame-1"], settings: { aspect: "9:16", resolution: "720p", captions: "off", placement: "bottom" },
};
function reply(clips: unknown[], sourceRevision = evidence.sourceRevision) {
  return JSON.stringify({ schema: "studio-clip-picks/1", sourceRevision, clips });
}
describe("source-bound clip proposals", () => {
  it("accepts an observed frame and a partially overlapping spoken cue", () => {
    const second = { ...pick, startMs: 1500, endMs: 2450, evidenceIds: ["cue-1"] };
    expect(readClipPicks(reply([pick, second]), evidence)).toEqual({ picks: [pick, second] });
    expect(readClipPicks(reply([]), evidence)).toEqual({ picks: [] });
  });
  it.each([
    { ...pick, startMs: 500 }, { ...pick, endMs: 2501 }, { ...pick, endMs: 250 },
    { ...pick, evidenceIds: ["unseen"] }, { ...pick, evidenceIds: ["frame-1", "frame-1"] },
    { ...pick, settings: { ...pick.settings, placement: "somewhere" } }, { ...pick, publish: true },
    { ...pick, reason: "The speaker says “an invented line”." },
  ])("rejects unsupported fields, settings, references and ranges", (invalid) => {
    expect(readClipPicks(reply([invalid]), evidence)).toHaveProperty("error");
  });
  it("rejects a changed evidence revision, duplicates and an oversized reply", () => {
    expect(readClipPicks(reply([pick], "old"), evidence)).toHaveProperty("error");
    expect(readClipPicks(reply([pick, pick]), evidence)).toHaveProperty("error");
    expect(readClipPicks(" ".repeat(65537), evidence)).toHaveProperty("error");
  });
  it("keeps text out of timing inventories, excludes linkage from handoffs and revalidates imports", () => {
    const reviewed = { ...evidence, transcript: [{ id: "cue-1", startMs: 1100, endMs: 2100, text: "private transcript" }] };
    const slim = clipEvidenceInventory(reviewed);
    expect(JSON.stringify(slim)).not.toContain("private transcript");
    expect(readClipEvidence(JSON.stringify(slim))).toEqual(evidence);
    const raw = encodeClipBatch(slim, [pick]);
    expect(readClipBatch(raw)).toEqual({ evidence, picks: [pick] });
    const handoff = clipEditPlanFields({ clipSourceEvidence: JSON.stringify(evidence), clipReviewedBatch: raw, captionLine: "Manual" });
    expect(handoff.fields).toEqual({ captionLine: "Manual" });
    expect(handoff.clips).toEqual([{ title: pick.title, startMs: 0, endMs: 500, settings: pick.settings }]);
    expect(readClipBatch(raw.replace("frame-1", "changed"))).toBeUndefined();
  });
});
