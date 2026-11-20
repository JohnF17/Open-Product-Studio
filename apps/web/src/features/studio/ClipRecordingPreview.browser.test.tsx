import { useState } from "react";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { ClipRecordingPreview } from "./ClipRecordingPreview";
import type { SourceVideo } from "./ClipperSource";
import { openClipSourceFile } from "./clipperEvidence";
import toneUrl from "./clipFootageTone.fixture.webm?url";

import { recording } from "./clipRecordingFixture";

it("marks the playhead, stops the selection, and asks before reusing marks on replacement", async () => {
  const writes = vi.fn();
  using revoke = vi.spyOn(URL, "revokeObjectURL");
  function Project() {
    const [fields, setFields] = useState<Record<string, string>>({});
    return <ClipRecordingPreview fields={fields} writeField={(key, value) => {
      writes(key, value);
      setFields((old) => ({ ...old, [key]: value }));
    }} />;
  }
  await using screen = await render(<Project />, { router: false });
  const choose = screen.getByLabelText("Choose a local recording");
  const button = (name: string) => screen.getByRole("button", { name, exact: true });
  const preview = button("Preview selection");
  await userEvent.upload(choose, recording("private-client.webm"));
  await expect.element(button("Set mark in")).toBeEnabled();
  const media = screen.getByLabelText("Local recording").element() as HTMLVideoElement;
  const url = media.src;
  expect(media.paused).toBe(true);
  expect(media.duration).toBeCloseTo(2);
  await button("Set mark in").click();
  media.currentTime = 0.75;
  await vi.waitFor(() => expect(media.seeking).toBe(false));
  await button("Set mark out").click();
  expect(writes.mock.calls).toEqual([["markIn", "00:00"], ["markOut", "00:00.750"]]);
  await button("Go to mark in").click();
  await vi.waitFor(() => expect(media.currentTime).toBeCloseTo(0));
  await preview.click();
  media.pause();
  await expect.element(button("Stop preview")).toBeVisible();
  await media.play();
  await vi.waitFor(() => {
    expect(media.paused).toBe(true);
    expect(media.currentTime).toBeCloseTo(0.75, 2);
  }, { timeout: 5000 });
  await userEvent.upload(choose, recording("another-team.webm"));
  await expect.element(button("Use saved marks for this recording")).toBeEnabled();
  await expect.element(preview).toBeDisabled();
  expect(revoke).toHaveBeenCalledWith(url);
  expect(writes).toHaveBeenCalledTimes(2);
  const nextUrl = (screen.getByLabelText("Local recording").element() as HTMLVideoElement).src;
  await button("Use saved marks for this recording").click();
  await expect.element(preview).toBeEnabled();
  await expect.element(preview).toHaveFocus();
  await button("Remove recording").click();
  await expect.element(screen.getByLabelText("Local recording")).not.toBeInTheDocument();
  expect(revoke).toHaveBeenCalledWith(nextUrl);
  await expect.element(choose).toHaveFocus();
});

it("rejects a playlist disguised as an MP4 before giving the player a URL", async () => {
  using urls = vi.spyOn(URL, "createObjectURL");
  const write = vi.fn();
  await using screen = await render(<ClipRecordingPreview fields={{}} writeField={write} />, { router: false });
  const file = new File(["#EXTM3U\nhttps://example.invalid/track"], "recording.mp4", { type: "video/mp4" });
  await userEvent.upload(screen.getByLabelText("Choose a local recording"), file);
  await expect.element(screen.getByRole("alert")).toHaveTextContent(
    "Choose a non-empty MP4 or WebM video.",
  );
  expect(urls).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

it("rechecks edited marks against the open source and releases it when leaving", async () => {
  const write = vi.fn();
  using revoke = vi.spyOn(URL, "revokeObjectURL");
  const view = (end: string) => <ClipRecordingPreview fields={{ markIn: "00:00", markOut: end }} writeField={write} />;
  await using screen = await render(view("00:12"), { router: false });
  await userEvent.upload(screen.getByLabelText("Choose a local recording"), recording("practice.webm"));
  const button = (name: string) => screen.getByRole("button", { name, exact: true });
  await expect.element(button("Set mark in")).toBeEnabled();
  await expect.element(button("Go to mark out")).toBeDisabled();
  await expect.element(button("Preview selection")).toBeDisabled();
  await screen.rerender(view("00:02"));
  await button("Use saved marks for this recording").click();
  await button("Preview selection").click();
  const media = screen.getByLabelText("Local recording").element() as HTMLVideoElement;
  await expect.element(button("Stop preview")).toBeVisible();
  await screen.rerender(view("00:01"));
  await expect.element(button("Preview selection")).toBeDisabled();
  expect(media.paused).toBe(true);
  await button("Use saved marks for this recording").click();
  await button("Preview selection").click();
  await screen.unmount();
  expect(media.paused).toBe(true);
  expect(revoke).toHaveBeenCalledWith(media.src);
  expect(write).not.toHaveBeenCalled();
});

it("hands an MP4 container with a leading free box to the native decoder", async () => {
  const freeAndBrand = new Uint8Array([
    0, 0, 0, 8, 102, 114, 101, 101,
    0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0,
  ]);
  using urls = vi.spyOn(URL, "createObjectURL");
  await using screen = await render(<ClipRecordingPreview fields={{}} writeField={() => {}} />, { router: false });
  await userEvent.upload(screen.getByLabelText("Choose a local recording"), new File([freeAndBrand], "boxes.mp4"));
  await vi.waitFor(() => expect(urls).toHaveBeenCalled());
  await expect.element(screen.getByRole("alert")).toBeVisible();
  await expect.element(screen.getByLabelText("Local recording")).not.toBeInTheDocument();
});

it("uses the same verified source for manual marks and export even when filenames match", async () => {
  const name = "lesson.webm";
  const original = await openClipSourceFile(recording(name), new AbortController().signal);
  const replacement = new File([await (await fetch(toneUrl)).blob()], name, { type: "video/webm" });
  const expected = await openClipSourceFile(replacement, new AbortController().signal);
  expect(expected.mediaRevision).not.toBe(original.mediaRevision);
  const changed = vi.fn();
  function Project() {
    const [video, setVideo] = useState<SourceVideo | null>(original);
    return <>
      <ClipRecordingPreview fields={{}} writeField={() => {}} sourceFile={video?.file} mediaRevision={video?.mediaRevision}
        onSourceVideoChange={(value) => { changed(value); setVideo(value); }} />
      <output aria-label="Export source">{video?.mediaRevision ?? "No source"}</output>
      <button type="button" onClick={() => setVideo(original)}>Restore original source</button>
    </>;
  }
  await using ui = await render(<Project />, { router: false });
  const picker = ui.getByLabelText("Choose a local recording");
  const getPlayer = () => ui.getByLabelText("Local recording").element() as HTMLVideoElement;
  const exportSource = ui.getByLabelText("Export source");
  await vi.waitFor(() => expect(getPlayer().videoWidth).toBe(16));
  const first = getPlayer();
  await first.play();
  await userEvent.upload(picker, new File(["#EXTM3U"], name, { type: "video/webm" }));
  await expect.element(ui.getByRole("alert")).toBeVisible();
  await expect.element(exportSource).toHaveTextContent(original.mediaRevision);
  expect(getPlayer()).toBe(first);
  expect(first.paused).toBe(true);
  expect(changed).not.toHaveBeenCalled();
  await userEvent.upload(picker, replacement);
  await expect.element(exportSource).toHaveTextContent(expected.mediaRevision);
  await vi.waitFor(() => expect(getPlayer().videoWidth).toBe(64));
  expect(changed.mock.calls[0]?.[0]).toMatchObject({ durationMs: expected.durationMs, mediaRevision: expected.mediaRevision });
  expect(first.isConnected).toBe(false);
  const second = getPlayer();
  await ui.getByRole("button", { name: "Remove recording" }).click();
  await expect.element(exportSource).toHaveTextContent("No source");
  await expect.element(ui.getByLabelText("Local recording")).not.toBeInTheDocument();
  expect(changed).toHaveBeenLastCalledWith(null);
  expect(second.paused).toBe(true);
  await ui.getByRole("button", { name: "Restore original source" }).click();
  await expect.element(exportSource).toHaveTextContent(original.mediaRevision);
  await vi.waitFor(() => expect(getPlayer().videoWidth).toBe(16));
});
