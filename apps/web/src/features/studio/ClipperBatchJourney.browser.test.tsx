import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import StudioWorkspace from "./StudioWorkspace";
import type { ClipperEvidence } from "./clipperEvidence";
import { recording } from "./clipRecordingFixture";
import { listDrafts } from "./drafts";
import { readClipBatch } from "./clipBatch";

it("uses reviewed footage and two assistant picks to render a playable batch from the builder", async () => {
  let reviewed: ClipperEvidence | undefined;
  const workspace = randomUUID();
  await using ui = await render(<StudioWorkspace workspaceId={workspace}
    onEvidenceReady={evidence => { reviewed = evidence; }}
    onReadClipReply={async (projectId, revision) => {
      if (!reviewed || reviewed.projectId !== projectId || reviewed.sourceRevision !== revision) return null;
      const clips = [
        { startMs: 0, endMs: 950, title: "First view", evidenceIds: ["frame-1"] },
        { startMs: 1000, endMs: 1950, title: "Second view", evidenceIds: ["frame-6"] },
      ].map((clip, index) => ({ ...clip, reason: "The sample frame shows the blue surface.",
        settings: { aspect: index ? "1:1" : "9:16", resolution: "720p", captions: "off", placement: "bottom" } }));
      return JSON.stringify({ schema: "studio-clip-picks/1", sourceRevision: revision, clips });
    }} />, { router: false });
  await ui.getByRole("button", { name: /^Clipper/ }).click();
  await userEvent.upload(ui.getByLabelText("Choose a video file"), recording("blue.webm"));
  await expect.element(ui.getByLabelText("Source video")).toBeVisible();
  await ui.getByLabelText("What should the clip show?").fill("Make two examples.");
  await ui.getByRole("button", { name: "Prepare evidence" }).click();
  await ui.getByRole("button", { name: "Use reviewed evidence" }).click();
  await expect.poll(() => reviewed?.frames.length).toBe(6);
  const stage = ui.getByRole("combobox", { name: "Go to step" });
  await stage.selectOptions("1");
  await ui.getByRole("button", { name: "Load AI picks" }).click();
  await ui.getByRole("button", { name: "Keep selected clips (2)" }).click();
  await expect.poll(async () => readClipBatch((await listDrafts(workspace))[0]?.fields.clipReviewedBatch)?.picks.length).toBe(2);
  await stage.selectOptions("4");
  await ui.getByRole("checkbox", { name: /Allow silent export/ }).click();
  await ui.getByRole("button", { name: "Render 2 clips" }).click();
  for (const [index, title] of ["First view", "Second view"].entries()) {
    const download = ui.getByRole("link", { name: new RegExp("Download.*" + title) });
    await expect.element(download, { timeout: 25000 }).toBeVisible();
    const bytes = await (await fetch((download.element() as HTMLAnchorElement).href)).blob();
    expect(bytes.size).toBeGreaterThan(1000);
    const movie = ui.getByLabelText("Rendered clip " + (index + 1));
    await expect.poll(() => (movie.element() as HTMLVideoElement).videoHeight).toBe(index ? 720 : 1280);
  }
}, 60000);
