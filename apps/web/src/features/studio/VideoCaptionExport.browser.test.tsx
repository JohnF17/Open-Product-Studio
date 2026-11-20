import { expect, it } from "vite-plus/test";
import { useSyncExternalStore } from "react";
import { act, render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { VideoCaptionExport } from "./VideoCaptionExport";
import { createDraft, DraftEditor } from "./drafts";
import type { VideoCue } from "./videoCues";

function cue(timestamp: string, caption: string): VideoCue {
  return {
    id: randomUUID(),
    timestamp,
    caption,
    action: "Private action",
    narration: "Private narration",
    sound: "Private sound",
  };
}

function makeEditor(videoCues: VideoCue[]) {
  const draft = {
    ...createDraft(randomUUID(), "video"),
    title: "Private studio title",
    stage: "export",
    fields: { notes: "Private project notes" },
    videoCues,
  };
  return new DraftEditor(draft, async (_draft, revision) => revision + 1);
}

function View({ editor }: { editor: DraftEditor }) {
  const { draft } = useSyncExternalStore(editor.subscribe, editor.snapshot);
  return <VideoCaptionExport draft={draft} editor={editor} />;
}

it("downloads the exact reviewed caption bytes and excludes the rest of the storyboard", async () => {
  const editor = makeEditor([
    cue("0:01.250", "<Bass> & drum\n\nEnough --> fade"),
    cue("0:03.500", ""),
    cue("0:04", "Finish 🎬"),
    cue("0:12", ""),
  ]);
  await using ui = await render(<View editor={editor} />, { router: false });
  const download = ui.getByRole("button", { name: "Download video captions (.vtt)" });
  await expect.element(download).toBeDisabled();
  await ui.getByRole("textbox", { name: "Final caption end" }).fill("0:09");
  await expect.element(download).toBeDisabled();

  const preview = ui.getByLabelText("WebVTT preview");
  await expect.element(preview).toBeVisible();
  const reviewed = preview.element().textContent;
  await ui.getByRole("checkbox", { name: "I reviewed this caption file" }).click();

  const links: HTMLAnchorElement[] = [];
  function capture(event: MouseEvent) {
    if (event.target instanceof HTMLAnchorElement && event.target.download) {
      event.preventDefault();
      links.push(event.target);
    }
  }
  document.addEventListener("click", capture);
  try {
    await download.click();
  } finally {
    document.removeEventListener("click", capture);
  }
  expect(links).toHaveLength(1);
  const clicked = links[0];
  expect(clicked?.download).toBe("Video captions.vtt");
  const url = clicked?.href;
  expect(url).toBeTruthy();
  const response = await fetch(url!);
  expect(response.headers.get("content-type")).toBe("text/vtt;charset=utf-8");
  const content = await response.text();
  expect(content).toBe(reviewed);
  expect(content).not.toContain("Private studio title");
  expect(content).toBe(
    "WEBVTT\n\n" +
      "00:00:01.250 --> 00:00:03.500\n&lt;Bass&gt; &amp; drum\nEnough --&gt; fade\n\n" +
      "00:00:04.000 --> 00:00:09.000\nFinish 🎬\n",
  );
});

it("clears approval when the final end or authored captions change", async () => {
  const editor = makeEditor([cue("0:01", "Welcome")]);
  await using ui = await render(<View editor={editor} />, { router: false });
  const end = ui.getByRole("textbox", { name: "Final caption end" });
  const review = ui.getByRole("checkbox", { name: "I reviewed this caption file" });
  const download = ui.getByRole("button", { name: "Download video captions (.vtt)" });

  await end.fill("0:02");
  await review.click();
  await expect.element(download).toBeEnabled();
  await end.fill("0:03");
  await expect.element(download).toBeDisabled();
  await end.fill("0:02");
  await expect.element(review).not.toBeChecked();

  await review.click();
  await act(async () => {
    const current = editor.snapshot().draft.videoCues![0]!;
    editor.update({ videoCues: [{ ...current, caption: "A different caption" }] });
    await editor.flush();
  });
  await expect.element(download).toBeDisabled();
  await expect.element(review).not.toBeChecked();
});

it.each([
  [[], "0:10", /Add at least one caption on Storyboard/],
  [[cue("", "Welcome")], "0:10", /Cue 1.*Enter a start time/],
  [[cue("0:06", "First"), cue("0:04", "Second")], "0:10", /Cue 2.*later than the preceding/],
  [[cue("0:04", "First"), cue("0:04", "Second")], "0:10", /Cue 2.*later than the preceding/],
  [[cue("0:04", "Welcome")], "0:04", /End the final caption after its start time/],
  [
    [cue("0:04", "Welcome"), cue("0:06", "")],
    "0:07",
    /End the final caption by the next storyboard cue/,
  ],
  [[cue("0:04", "Invalid\u0000caption")], "0:07", /unsupported control characters/],
] as const)("disables export with invalid caption input %#", async (cues, end, message) => {
  await using ui = await render(<View editor={makeEditor([...cues])} />, { router: false });
  const finalEnd = ui.getByRole("textbox", { name: "Final caption end" });
  if (cues.length) await finalEnd.fill(end);
  await expect
    .element(ui.getByRole("button", { name: "Download video captions (.vtt)" }))
    .toBeDisabled();
  await expect.element(ui.getByText(message)).toBeVisible();
});
