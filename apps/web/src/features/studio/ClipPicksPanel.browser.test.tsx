import { useSyncExternalStore } from "react";
import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { ClipPicksPanel } from "./ClipPicksPanel";
import { createDraft, DraftEditor } from "./drafts";
import { encodeClipBatch, readClipBatch } from "./clipBatch";
import type { ClipEvidence, ClipPick } from "./clipPicks";
import { recording } from "./clipRecordingFixture";
import { clipMediaRevision } from "./clipperEvidence";

const file = recording("source.webm");
const mediaRevision = await clipMediaRevision(file, new AbortController().signal);
const evidence: ClipEvidence = { mediaRevision, sourceRevision: "review", durationMs: 2000,
  frames: [{ id: "first", timeMs: 250 }, { id: "mid", timeMs: 750 }, { id: "last", timeMs: 1500 }],
  transcript: [{ id: "line", startMs: 500, endMs: 700 }] };
const picks: ClipPick[] = [{
  startMs: 0, endMs: 1000, title: "First look", reason: "The first view shows the tool.", evidenceIds: ["first", "mid", "line"],
  settings: { aspect: "9:16", resolution: "720p", captions: "off", placement: "bottom" },
}, {
  startMs: 850, endMs: 1800, title: "Final look", reason: "The last view shows the result.", evidenceIds: ["last"],
  settings: { aspect: "1:1", resolution: "1080p", captions: "on", placement: "top" },
}];

function draftEditor(saved: boolean) {
  const draft = createDraft("clip-review-test", "clipper");
  draft.fields = { clipSourceEvidence: JSON.stringify(evidence), markIn: "00:00.123",
    ...(saved ? { clipReviewedBatch: encodeClipBatch(evidence, picks) } : {}) };
  return new DraftEditor(draft);
}
function Project({ editor, revision = mediaRevision, source = file }: { editor: DraftEditor; revision?: string; source?: File }) {
  const { draft } = useSyncExternalStore(editor.subscribe, editor.snapshot);
  return <ClipPicksPanel draft={draft} editor={editor} sourceFile={source} mediaRevision={revision} goToSource={() => {}}
    onRead={async () => JSON.stringify({ schema: "studio-clip-picks/1", sourceRevision: "review", clips: picks })} />;
}

it("auditions the proposed source range, trims it locally and keeps both independent cuts", async () => {
  const editor = draftEditor(false);
  using revoked = vi.spyOn(URL, "revokeObjectURL");
  await using ui = await render(<Project editor={editor} />, { router: false });
  await ui.getByRole("button", { name: "Load AI picks" }).click();
  const toggle = ui.getByRole("button", { name: "Preview or edit First look" });
  await toggle.click();
  await expect.element(ui.getByLabelText("Footage for First look")).toBeVisible();
  const player = ui.getByLabelText("Footage for First look").element() as HTMLVideoElement;
  await ui.getByLabelText("Cut start").fill("0.600");
  await ui.getByLabelText("Cut end").fill("0.900");
  const play = ui.getByRole("button", { name: "Play this range" });
  await expect.element(play).toBeEnabled();
  await play.click();
  await vi.waitFor(() => { expect(player.paused).toBe(true); expect(player.currentTime).toBeCloseTo(.9, 2); }, { timeout: 4000 });
  const url = player.src;
  await ui.getByRole("button", { name: "Apply range" }).click();
  await expect.element(toggle).toHaveFocus();
  expect(revoked).toHaveBeenCalledWith(url);
  expect(editor.snapshot().draft.fields.clipReviewedBatch).toBeUndefined();
  await ui.getByRole("button", { name: "Keep selected clips (2)" }).click();
  await expect.element(ui.getByText(/^First look ·/)).toHaveFocus();
  expect(readClipBatch(editor.snapshot().draft.fields.clipReviewedBatch)?.picks).toEqual([
    { ...picks[0], startMs: 600, endMs: 900, evidenceIds: ["mid", "line"] }, picks[1],
  ]);
});

it("rejects out-of-bounds, unsupported and duplicate ranges, then saves and undoes only the edited cut", async () => {
  const editor = draftEditor(true);
  const previous = editor.snapshot().draft.fields.clipReviewedBatch;
  await using ui = await render(<Project editor={editor} />, { router: false });
  await ui.getByText(/^First look ·/).click();
  await ui.getByRole("button", { name: "Preview or edit First look" }).click();
  const start = ui.getByLabelText("Cut start");
  const end = ui.getByLabelText("Cut end");
  const apply = ui.getByRole("button", { name: "Apply range" });
  await end.fill("3");
  await expect.element(apply).toBeDisabled();
  await end.fill(".2");
  await expect.element(apply).toBeDisabled();
  await start.fill("0.870");
  await end.fill("0.910");
  await expect.element(ui.getByText(/at least one cited/)).toBeVisible();
  await expect.element(apply).toBeDisabled();
  await start.fill("0.850");
  await end.fill("1.800");
  await expect.element(ui.getByText(/same range/)).toBeVisible();
  await expect.element(apply).toBeDisabled();
  expect(editor.snapshot().draft.fields.clipReviewedBatch).toBe(previous);
  await start.fill("0.100");
  await end.fill("0.800");
  await apply.click();
  const fields = editor.snapshot().draft.fields;
  expect(fields.markIn).toBe("00:00.123");
  expect(readClipBatch(fields.clipReviewedBatch)?.picks).toEqual([{ ...picks[0], startMs: 100, endMs: 800 }, picks[1]]);
  await ui.getByRole("button", { name: "Undo batch change" }).click();
  expect(editor.snapshot().draft.fields.clipReviewedBatch).toBe(previous);
});

it("never opens a preview against a different recording and releases an open player on replacement", async () => {
  const editor = draftEditor(true);
  using urls = vi.spyOn(URL, "createObjectURL");
  using revoked = vi.spyOn(URL, "revokeObjectURL");
  await using ui = await render(<Project editor={editor} revision="other" />, { router: false });
  await ui.getByText(/^Final look ·/).click();
  const toggle = ui.getByRole("button", { name: "Preview or edit Final look" });
  await expect.element(toggle).toBeDisabled();
  expect(urls).not.toHaveBeenCalled();
  await ui.rerender(<Project editor={editor} source={new File(["wrong bytes"], file.name, { type: file.type })} />);
  await toggle.click();
  await expect.element(ui.getByRole("alert")).toBeVisible();
  expect(urls).not.toHaveBeenCalled();
  await toggle.click();
  await ui.rerender(<Project editor={editor} />);
  await toggle.click();
  await expect.element(ui.getByLabelText("Footage for Final look")).toBeVisible();
  const media = ui.getByLabelText("Footage for Final look").element() as HTMLVideoElement;
  await ui.getByRole("button", { name: "Play this range" }).click();
  const url = media.src;
  await ui.rerender(<Project editor={editor} revision="different" />);
  await expect.element(toggle).toBeDisabled();
  expect(media.paused).toBe(true);
  expect(revoked).toHaveBeenCalledWith(url);
  await expect.element(ui.getByLabelText("Footage for Final look")).not.toBeInTheDocument();
});
