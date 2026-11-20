import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { ClipFootageExport } from "./ClipFootageExport";
import { renderFootageCut, type FootageCut } from "./clipFootageRender";
import { recording } from "./clipRecordingFixture";
import { readClipVideo } from "./clipperEvidence";
import toneUrl from "./clipFootageTone.fixture.webm?url";

const portrait: FootageCut = {
  title: "Opening", startMs: 200, endMs: 1400,
  settings: { aspect: "9:16", resolution: "720p", captions: "on", placement: "top" },
  captions: [{ startMs: 700, endMs: 1800, text: "An original caption" }],
};
const square: FootageCut = {
  title: "Ending", startMs: 1400, endMs: 1950,
  settings: { aspect: "1:1", resolution: "1080p", captions: "off", placement: "bottom" },
};

async function whiteCaptionPixels(video: HTMLVideoElement, time: number, startY: number) {
  await new Promise<void>((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
    video.currentTime = time;
  });
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);
  const rgba = ctx.getImageData(0, startY, canvas.width, 220).data;
  let count = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i]! > 190 && rgba[i + 1]! > 190 && rgba[i + 2]! > 190) count++;
  }
  const [r, , b] = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
  expect(b!).toBeGreaterThan(r! + 100);
  return count;
}

it("encodes two approved ranges into playable downloads with the requested size and timed caption", async () => {
  const file = recording("permitted.webm");
  await using ui = await render(<ClipFootageExport file={file} cuts={[portrait, square]} />, { router: false });
  await ui.getByRole("checkbox", { name: /Allow silent/ }).click();
  await ui.getByRole("button", { name: "Render 2 clips" }).click();
  const links = ui.getByRole("link", { name: /Download/ });
  await vi.waitFor(() => expect(document.body.innerText).toContain("2 of 2 clips ready."), { timeout: 15_000 });
  expect(links.all().length).toBe(2);
  for (const [index, link] of links.all().entries()) {
    const anchor = link.element() as HTMLAnchorElement;
    const blob = await (await fetch(anchor.href)).blob();
    expect(blob.size).toBeGreaterThan(512);
    expect(anchor.download).toMatch(/\.(webm|mp4)$/);
    const source = await readClipVideo(new File([blob], anchor.download), new AbortController().signal);
    try {
      expect([source.video.videoWidth, source.video.videoHeight]).toEqual(index ? [1080, 1080] : [720, 1280]);
      expect(Math.abs(source.durationMs - (index ? 550 : 1200))).toBeLessThan(250);
      if (!index) {
        expect(await whiteCaptionPixels(source.video, 0.12, 0)).toBeLessThan(5);
        expect(await whiteCaptionPixels(source.video, 0.82, 0)).toBeGreaterThan(100);
        expect(await whiteCaptionPixels(source.video, 0.88, 980)).toBeLessThan(5);
      }
    } finally { source.release(); }
  }
  await ui.rerender(<ClipFootageExport file={recording("replacement.webm")} cuts={[portrait, square]} />);
  await expect.element(ui.getByRole("link", { name: /Download/ })).not.toBeInTheDocument();
}, 25_000);

it("requires consent for silence and a usable caption when captions are enabled", async () => {
  const file = recording("silent.webm");
  await expect(renderFootageCut(file, square, false, new AbortController().signal)).rejects.toThrow(/silent/i);
  await expect(renderFootageCut(file, { ...portrait, captions: [] }, true, new AbortController().signal))
    .rejects.toThrow(/caption/i);
});

it("cancels a batch without exposing its unfinished bytes and can render again", async () => {
  await using ui = await render(<ClipFootageExport file={recording("silent.webm")} cuts={[square]} />, { router: false });
  await ui.getByRole("checkbox", { name: /Allow silent/ }).click();
  const start = ui.getByRole("button", { name: "Render 1 clip" });
  await start.click();
  await ui.getByRole("button", { name: "Cancel rendering" }).click();
  await expect.element(ui.getByRole("status")).toHaveTextContent("Rendering canceled.");
  const retry = ui.getByRole("button", { name: "Retry 1 unfinished clip" });
  await expect.element(retry).toBeEnabled();
  await expect.element(ui.getByRole("link", { name: /Download/ })).not.toBeInTheDocument();
  await retry.click();
  await expect.element(ui.getByRole("link", { name: /Download/ }), { timeout: 15_000 }).toBeVisible();
}, 20_000);

it("keeps successful downloads through a failed retry and invalidates only the changed cut", async () => {
  const file = recording("same-source.webm");
  const missingCaption: FootageCut = { ...square, settings: { ...square.settings, captions: "on" } };
  await using ui = await render(<ClipFootageExport file={file} cuts={[portrait, missingCaption]} />, { router: false });
  await ui.getByRole("checkbox", { name: /Allow silent/ }).click();
  await ui.getByRole("button", { name: "Render 2 clips" }).click();
  const first = ui.getByRole("link", { name: /Download 01/ });
  const second = ui.getByRole("link", { name: /Download 02/ });
  const retry = ui.getByRole("button", { name: "Retry 1 unfinished clip" });
  await expect.element(retry, { timeout: 15_000 }).toBeEnabled();
  const firstUrl = (first.element() as HTMLAnchorElement).href;
  await retry.click();
  await expect.element(ui.getByRole("alert")).toHaveTextContent("Add a caption, import timed captions for this range, or turn captions off in the clip settings.");
  expect((first.element() as HTMLAnchorElement).href).toBe(firstUrl);
  await ui.rerender(<ClipFootageExport file={file} cuts={[portrait, square]} />);
  await retry.click();
  await expect.element(second, { timeout: 15_000 }).toBeVisible();
  expect((first.element() as HTMLAnchorElement).href).toBe(firstUrl);
  expect((await (await fetch(firstUrl)).blob()).size).toBeGreaterThan(512);
  const secondUrl = (second.element() as HTMLAnchorElement).href;
  await ui.rerender(<ClipFootageExport file={file} cuts={[{ ...portrait, endMs: 1450 }, square]} />);
  await expect.element(first).not.toBeInTheDocument();
  await expect(fetch(firstUrl)).rejects.toThrow();
  expect((second.element() as HTMLAnchorElement).href).toBe(secondUrl);
  await ui.rerender(<ClipFootageExport file={recording("same-source.webm")} cuts={[portrait, square]} />);
  await expect.element(second).not.toBeInTheDocument();
  await expect(fetch(secondUrl)).rejects.toThrow();
}, 30_000);

it("preserves an audible 440 Hz source tone and clips the later red picture", async () => {
  // Synthetic 64 x 36 VP8 fixture, one second each of blue and red with a two-second Opus sine wave.
  const file = new File([await (await fetch(toneUrl)).blob()], "tone.webm", { type: "video/webm" });
  const output = await renderFootageCut(file, {
    ...square, startMs: 1120, endMs: 1850, settings: { ...square.settings, aspect: "16:9", resolution: "720p" },
  }, false, new AbortController().signal);
  expect(output.audio).toBe(true);
  const audio = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await output.blob.arrayBuffer());
  const samples = audio.getChannelData(0);
  let peak = 0;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]!));
    if (samples[i - 1]! <= 0 && samples[i]! > 0) crossings++;
  }
  expect(peak).toBeGreaterThan(0.035);
  expect(crossings / audio.duration).toBeGreaterThan(350);
  expect(crossings / audio.duration).toBeLessThan(500);
  const source = await readClipVideo(new File([output.blob], "render." + output.extension), new AbortController().signal);
  try {
    expect([source.video.videoWidth, source.video.videoHeight]).toEqual([1280, 720]);
    await new Promise<void>((resolve) => {
      source.video.addEventListener("seeked", () => resolve(), { once: true });
      source.video.currentTime = 0.28;
    });
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.drawImage(source.video, 0, 0, 1, 1);
    const [r, , b] = ctx.getImageData(0, 0, 1, 1).data;
    expect(r!).toBeGreaterThan(b! + 100);
  } finally { source.release(); }
});
