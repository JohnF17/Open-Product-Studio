import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { ClipperSource, emptyClipperSource, type ClipperSourceState } from "./ClipperSource";
import { recording } from "./clipRecordingFixture";
import { type ComponentProps, useState } from "react";
import type { ClipperEvidence } from "./clipperEvidence";

function Project({ onEvidenceReady }: Pick<ComponentProps<typeof ClipperSource>, "onEvidenceReady">) {
  const [source, setSource] = useState<ClipperSourceState>(emptyClipperSource);
  return <ClipperSource projectId="fixture-project" source={source} onSourceChange={setSource} onEvidenceReady={onEvidenceReady} />;
}

it("reviews exact local evidence and hands it off only when requested", async () => {
  const onEvidenceReady = vi.fn<(evidence: ClipperEvidence, signal: AbortSignal) => void>();
  await using ui = await render(<Project onEvidenceReady={onEvidenceReady} />, { router: false });
  await userEvent.upload(ui.getByLabelText("Choose a video file"), recording("private.webm"));
  const player = ui.getByLabelText("Source video");
  await expect.element(player).toBeVisible();
  await vi.waitFor(() => {
    const video = player.element() as HTMLVideoElement;
    expect(video.duration).toBeCloseTo(2);
    expect(video.videoWidth).toBe(16);
    expect(video.src).toMatch(/^blob:/);
  });
  await userEvent.upload(ui.getByLabelText("Import captions (optional)"), new File([
    "WEBVTT\n\n00:00.400 --> 00:01.200\nA <b>readable</b> cue.\n\n00:03.000 --> 00:04.000\nOutside the movie.",
  ], "private.vtt"));
  await ui.getByRole("textbox", { name: "What should the clip show?" }).fill("Find the clearest visual.");
  await ui.getByRole("button", { name: "Prepare evidence" }).click();
  const sheet = ui.getByRole("img", { name: "Contact sheet of sampled video frames" });
  await expect.element(sheet).toBeVisible();
  await expect.element(ui.getByText("A readable cue.", { exact: true })).toBeVisible();
  expect(onEvidenceReady).not.toHaveBeenCalled();
  await ui.getByRole("button", { name: "Use reviewed evidence" }).click();
  const [evidence] = onEvidenceReady.mock.calls[0]!;
  expect(evidence).toMatchObject({
    projectId: "fixture-project",
    mediaRevision: expect.stringMatching(/^sha256:[a-f\d]{64}$/),
    sourceRevision: expect.stringMatching(/^sha256:[a-f\d]{64}$/),
    durationMs: 2000,
    instruction: "Find the clearest visual.",
    transcript: [{ id: "cue-1", text: "A readable cue.", startMs: 400, endMs: 1200 }],
  });
  expect(evidence.frames).toHaveLength(6);
  expect(new Set(evidence.frames.map(({ id }) => id)).size).toBe(6);
  expect(evidence.frames.map(({ timeMs }) => timeMs)).toEqual([166, 500, 833, 1166, 1500, 1833]);
  expect(evidence.contactSheet).toBeInstanceOf(File);
  const reviewed = await (await fetch((sheet.element() as HTMLImageElement).src)).arrayBuffer();
  expect(await evidence.contactSheet.arrayBuffer()).toEqual(reviewed);
  const bitmap = await createImageBitmap(evidence.contactSheet);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  const [r, , b] = context.getImageData(120, 115, 1, 1).data;
  expect(b!).toBeGreaterThan(r! + 100);
  bitmap.close();
  await ui.getByRole("textbox", { name: "What should the clip show?" }).fill("A new instruction");
  await expect.element(ui.getByRole("button", { name: "Use reviewed evidence" })).not.toBeInTheDocument();
  expect(onEvidenceReady).toHaveBeenCalledTimes(1);
});

it("keeps link references inert and rejects a disguised dropped playlist", async () => {
  using fetchSpy = vi.spyOn(window, "fetch");
  const onEvidenceReady = vi.fn<(evidence: ClipperEvidence, signal: AbortSignal) => void>();
  await using ui = await render(<Project onEvidenceReady={onEvidenceReady} />, { router: false });
  await ui.getByText("Keep a video link", { exact: true }).click();
  await ui.getByRole("textbox", { name: "Video link" }).fill("https://example.invalid/recording");
  await ui.getByRole("button", { name: "Keep link as reference" }).click();
  await expect.element(ui.getByText(/Reference only.*No video acquired/)).toBeVisible();
  const transfer = new DataTransfer();
  transfer.items.add(new File(["#EXTM3U\nhttps://example.invalid/media"], "looks-local.mp4", { type: "video/mp4" }));
  ui.getByLabelText("Video file drop area").element().dispatchEvent(
    new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }),
  );
  await expect.element(ui.getByRole("alert")).toHaveTextContent("Choose a non-empty MP4 or WebM video.");
  await expect.element(ui.getByLabelText("Source video")).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(onEvidenceReady).not.toHaveBeenCalled();
});

it("stops all tracks if a chooser resolves after Source closes", async () => {
  let resolve!: (stream: MediaStream) => void;
  using choose = vi.spyOn(navigator.mediaDevices, "getDisplayMedia").mockImplementation(() =>
    new Promise<MediaStream>((done) => { resolve = done; }),
  );
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream;
  await using ui = await render(<Project />, { router: false });
  expect(choose).not.toHaveBeenCalled();
  await ui.getByRole("button", { name: "Choose a screen or window" }).click();
  expect(choose).toHaveBeenCalledWith({ video: true, audio: false });
  await ui.unmount();
  resolve(stream);
  await vi.waitFor(() => expect(stop).toHaveBeenCalledTimes(2));
});


it("opens a real silent recording made from a consent-route fixture", async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 54;
  const context = canvas.getContext("2d")!;
  const stream = canvas.captureStream(15);
  const video = stream.getVideoTracks()[0]!;
  using choose = vi.spyOn(navigator.mediaDevices, "getDisplayMedia").mockResolvedValue(stream);
  let ticks = 0;
  const timer = setInterval(() => {
    context.fillStyle = ++ticks % 2 ? "blue" : "orange";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, 100);
  try {
    const onEvidenceReady = vi.fn<(evidence: ClipperEvidence, signal: AbortSignal) => void>();
    await using ui = await render(<Project onEvidenceReady={onEvidenceReady} />, { router: false });
    await ui.getByRole("button", { name: "Choose a screen or window" }).click();
    const stop = ui.getByRole("button", { name: "Stop recording" });
    await expect.element(stop).toBeVisible();
    await vi.waitFor(() => expect(ticks).toBeGreaterThan(7));
    await stop.click();
    expect(choose).toHaveBeenCalledOnce();
    expect(video.readyState).toBe("ended");
    const player = ui.getByLabelText("Source video");
    await expect.element(player, { timeout: 10_000 }).toBeVisible();
    await vi.waitFor(() => {
      const element = player.element() as HTMLVideoElement;
      expect(element.videoWidth).toBe(96);
      expect(element.duration).toBeGreaterThan(0);
      expect(Number.isFinite(element.duration)).toBe(true);
    });
    await ui.getByRole("textbox", { name: "What should the clip show?" }).fill("Find the color change.");
    await ui.getByRole("button", { name: "Prepare evidence" }).click();
    await expect.element(ui.getByRole("img", { name: "Contact sheet of sampled video frames" })).toBeVisible();
    expect(onEvidenceReady).not.toHaveBeenCalled();
  } finally {
    clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
  }
});

it("offers file import when the host has no qualified chooser", async () => {
  vi.stubGlobal("desktopBridge", {});
  try {
    await using ui = await render(<Project />, { router: false });
    await expect.element(ui.getByText(/Screen recording is unavailable here/)).toBeVisible();
    await expect.element(ui.getByLabelText("Choose a video file")).toBeEnabled();
    await expect.element(ui.getByRole("button", { name: "Choose a screen or window" })).not.toBeInTheDocument();
  } finally {
    vi.unstubAllGlobals();
  }
});


it("keeps media identity stable and changes the reviewed revision when the goal or cue text changes", async () => {
  const onEvidenceReady = vi.fn<(evidence: ClipperEvidence, signal: AbortSignal) => void>();
  await using ui = await render(<Project onEvidenceReady={onEvidenceReady} />, { router: false });
  const file = recording("private.webm");
  await userEvent.upload(ui.getByLabelText("Choose a video file"), file);
  await expect.element(ui.getByLabelText("Source video")).toBeVisible();
  const goal = ui.getByRole("textbox", { name: "What should the clip show?" });
  const picker = ui.getByLabelText("Import captions (optional)");
  async function useEvidence() {
    await ui.getByRole("button", { name: "Prepare evidence" }).click();
    await ui.getByRole("button", { name: "Use reviewed evidence" }).click();
    return onEvidenceReady.mock.calls.at(-1)![0];
  }
  function captions(text: string) {
    return new File(["1\n00:00:00,400 --> 00:00:01,200\n" + text], "private.srt");
  }
  await goal.fill("Find the opening.");
  await userEvent.upload(picker, captions("First line"));
  const original = await useEvidence();
  await goal.fill("Find the ending.");
  const changedGoal = await useEvidence();
  await userEvent.upload(picker, captions("Revised line"));
  const changedCue = await useEvidence();
  expect(changedGoal.sourceRevision).not.toBe(original.sourceRevision);
  expect(changedCue.sourceRevision).not.toBe(changedGoal.sourceRevision);
  expect(changedCue.transcript?.[0]?.id).toBe(original.transcript?.[0]?.id);
  expect(changedCue.frames).toEqual(original.frames);
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  expect([original, changedGoal, changedCue].map(({ mediaRevision }) => mediaRevision)).toEqual(
    Array.from({ length: 3 }, () => "sha256:" + hex),
  );
});

it("allows the same reviewed snapshot to be retried after a rejected handoff", async () => {
  let fail!: (reason: Error) => void;
  const onEvidenceReady = vi.fn<(evidence: ClipperEvidence, signal: AbortSignal) => Promise<void>>()
    .mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; }))
    .mockResolvedValueOnce(undefined);
  await using ui = await render(<Project onEvidenceReady={onEvidenceReady} />, { router: false });
  await userEvent.upload(ui.getByLabelText("Choose a video file"), recording("private.webm"));
  const goal = ui.getByRole("textbox", { name: "What should the clip show?" });
  await goal.fill("Find the opening.");
  await ui.getByRole("button", { name: "Prepare evidence" }).click();
  const useEvidence = ui.getByRole("button", { name: "Use reviewed evidence" });
  await useEvidence.click();
  await expect.element(ui.getByRole("button", { name: "Preparing handoff..." })).toBeDisabled();
  await expect.element(goal).toBeDisabled();
  fail(new Error("Composer unavailable"));
  await expect.element(ui.getByRole("alert")).toHaveTextContent("The evidence handoff could not be prepared. Try again.");
  await useEvidence.click();
  expect(onEvidenceReady.mock.calls[1]![0]).toBe(onEvidenceReady.mock.calls[0]![0]);
  await expect.element(ui.getByText("Evidence selected for the AI handoff.")).toBeVisible();
});
