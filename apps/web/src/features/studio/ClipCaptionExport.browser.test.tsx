import { expect, it } from "vite-plus/test";
import { render } from "../../../test/render";
import { ClipCaptionExport } from "./ClipCaptionExport";

it("exports one playable plain-text cue on each timeline and excludes private notes", async () => {
  const fields = {
    markIn: "1:02:03.250", markOut: "1:02:05.875",
    captionLine: "<i>Mix</i> & hold\n\n00:00.000 --> 00:01.000",
    sourceNote: "private-recording.mov",
  };
  await using screen = await render(<ClipCaptionExport fields={fields} />, { router: false });
  const track = document.createElement("track");
  const video = document.createElement("video");
  video.append(track);
  document.body.append(video);
  track.track.mode = "hidden";
  let name = "";
  let linkUrl = "";
  function capture(e: MouseEvent) {
    if (!(e.target instanceof HTMLAnchorElement) || !e.target.download) return;
    e.preventDefault();
    name = e.target.download;
    linkUrl = e.target.href;
  }
  document.addEventListener("click", capture);
  try {
    for (const timeline of ["excerpt", "recording"] as const) {
      await screen.getByRole("combobox", { name: "Use caption with" }).selectOptions(timeline);
      await screen.getByRole("button", { name: "Download caption (.vtt)" }).click();
      expect(name).toBe("Caption - " + timeline + ".vtt");
      const text = await (await fetch(linkUrl)).text();
      expect(text).not.toContain(fields.sourceNote);
      const loaded = new Promise<void>((resolve, reject) => {
        track.onload = () => resolve();
        track.onerror = () => reject(new Error("Could not load exported caption"));
      });
      track.src = linkUrl;
      await loaded;
      const cues = track.track.cues!;
      expect(cues.length).toBe(1);
      const cue = cues[0] as VTTCue;
      expect(cue.startTime).toBe(timeline === "excerpt" ? 0 : 3723.25);
      expect(cue.endTime).toBe(timeline === "excerpt" ? 2.625 : 3725.875);
      expect(cue.getCueAsHTML().textContent).toBe("<i>Mix</i> & hold 00:00.000 --> 00:01.000");
    }
  } finally {
    document.removeEventListener("click", capture);
    video.remove();
  }
});

it.each([
  { markIn: "0:02", markOut: "0:01", captionLine: "A caption" },
  { markIn: "0:00", markOut: "0:01", captionLine: "  " },
])("keeps incomplete caption exports disabled", async (fields) => {
  await using screen = await render(<ClipCaptionExport fields={fields} />, { router: false });
  await expect.element(screen.getByRole("button", { name: "Download caption (.vtt)" })).toBeDisabled();
});

it("blocks an out-of-bounds cue against the known source duration and identifies unchecked manual marks", async () => {
  const fields = { markIn: "0:01", markOut: "0:03", captionLine: "Hold" };
  await using screen = await render(<ClipCaptionExport fields={fields} durationMs={2000} />, { router: false });
  const download = screen.getByRole("button", { name: "Download caption (.vtt)" });
  await expect.element(download).toBeDisabled();
  await expect.element(screen.getByText(/Mark out exceeds/)).toBeVisible();
  await screen.rerender(<ClipCaptionExport fields={fields} />);
  await expect.element(download).toBeEnabled();
  await expect.element(screen.getByText(/Recording duration is unverified/)).toBeVisible();
});
