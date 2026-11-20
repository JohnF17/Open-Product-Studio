import { useState } from "react";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { ClipRecordingPreview } from "./ClipRecordingPreview";

// Two seconds of solid blue, four 16 × 16 frames. Generated with FFmpeg color and libvpx.
const webm = "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIKEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHGTbuMU6uEElTDZ1OsggETTbuMU6uEHFO7a1OsggH07AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmoCrXsYMPQkBNgIRMYXZmV0GETGF2ZkSJiECfQAAAAAAAFlSua8iuAQAAAAAAAD/XgQFzxYgAAAAAAAAAAZyBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhB3NZQDgkLCBELqBEJqBAlWwhFW5gQESVMNn0HNzzWPAi2PFiAAAAAAAAAABZ8iYRaOHRU5DT0RFUkSHi0xhdmMgbGlidnB4Z8ihRaOIRFVSQVRJT05Eh5MwMDowMDowMi4wMDAwMDAwMDAAH0O2dUCG54EAo7yBAACAsAIAnQEqEAAQAABHCIWFiIWEiAICAnWqA/gCDP0oAP7/TRL//FhX8WFfxYV/8WFf/PzO7cX85gCjlYEB9ACxAQAFEKwAGAAYWC/0AAgAAKOVgQPoALEBAAUQrAAYABhYL/QACAAAo5WBBdwAsQEABRCsABgAGFgv9AAIAAAcU7trkbuPs4EAt4r3gQHxggFo8IED";

function recording(name: string) {
  return new File([Uint8Array.from(atob(webm), (char) => char.charCodeAt(0))], name, { type: "video/webm" });
}

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
    "Choose a compatible MP4 or WebM video. You can also enter the marks below by hand.",
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
  await expect.element(screen.getByLabelText("Local recording")).toBeInTheDocument();
});
