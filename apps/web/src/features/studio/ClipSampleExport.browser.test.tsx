import type { ClipperSampleRequest, ClipperSampleResult, DesktopBridge } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { ClipSampleExport } from "./ClipSampleExport";
import { listDrafts } from "./drafts";
import StudioWorkspace from "./StudioWorkspace";
import sampleUrl from "./fixtures/clipper-sample-review.mp4?inline";
import "./studio.css";

const projectId = "c1f21d14-1939-4d52-88c2-918666cfc48c";
const token = "9d3333ff-74a0-4b0c-822e-9be499d20fba";
// Silent 360 × 640 H.264 test fixture generated from a solid color at 24 fps.
const base64 = sampleUrl.slice(sampleUrl.indexOf(",") + 1);
const review = { status: "review", token, base64, startFrame: 30, endFrameExclusive: 90 } as const;

function installBridge(clipperSample?: NonNullable<DesktopBridge["clipperSample"]>) {
  const previous = window.desktopBridge;
  window.desktopBridge = { clipperSample } as DesktopBridge;
  return {
    [Symbol.dispose]() {
      if (previous) window.desktopBridge = previous;
      else delete window.desktopBridge;
    },
  };
}

function exportPanel(id = projectId) {
  return (
    <main className="ops-workspace">
      <ClipSampleExport workspaceId="clipper-browser-qualification" projectId={id} />
    </main>
  );
}

it("skips the sample controls without the optional native method", async () => {
  using _bridge = installBridge();
  await using screen = await render(exportPanel(), { router: false });
  expect(screen.container.querySelector("fieldset")).toBeNull();
});

it.each(["saved", "uncertain"] as const)("keeps a late %s result with its project", async outcome => {
  const late = Promise.withResolvers<ClipperSampleResult>();
  const request = vi.fn(async (call: ClipperSampleRequest): Promise<ClipperSampleResult> => {
    if (call.action === "render") return review;
    if (call.action === "save") return late.promise;
    return { status: "ready" };
  });
  using _bridge = installBridge(request);
  await using screen = await render(exportPanel(), { router: false });
  await screen.getByRole("button", { name: "Try a sample export" }).click();
  await screen.getByRole("button", { name: "Render sample" }).click();
  const save = screen.getByRole("button", { name: /Save As/ });
  await expect.element(save).toBeEnabled();
  await save.click();
  await expect.poll(() => request.mock.calls.some(([r]) => r.action === "save")).toBe(true);
  await screen.rerender(exportPanel("00000000-0000-4000-8000-000000000010"));
  late.resolve({ status: outcome });
  await expect.poll(() => request.mock.calls.at(-1)?.[0].action).toBe("discard");
  const label = outcome === "saved" ? "Last sample export was saved." : "A sample save was started. Check the destination before exporting again.";
  expect(screen.container.textContent).not.toContain(label);
  await screen.rerender(exportPanel());
  await expect.element(screen.getByText(label, { exact: true })).toBeVisible();
  expect(request.mock.calls.filter(([call]) => call.action === "save")).toHaveLength(1);
  expect(screen.container.querySelector("video")).toBeNull();
});

it("opts in, enrolls explicitly, plays the returned MP4 and retries Save As after cancel or collision", async () => {
  const saves = ["cancelled", "occupied", "saved"] as const;
  let saveIndex = 0;
  const request = vi.fn(async (call: ClipperSampleRequest): Promise<ClipperSampleResult> => {
    if (call.action === "status") return { status: "needs-encoder" };
    if (call.action === "render") return review;
    if (call.action === "save") return { status: saves[saveIndex++]! };
    return { status: "ready" };
  });
  using _bridge = installBridge(request);
  await page.viewport(390, 844);
  await using screen = await render(exportPanel(), { router: false });
  const button = (name: string | RegExp) => screen.getByRole("button", { name });
  expect(request).not.toHaveBeenCalled();
  await button("Try a sample export").click();
  await expect.element(screen.getByText(/60 frames, 2.5 seconds/)).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "ImageIO’s release files" })).toHaveAttribute("href", "https://pypi.org/project/imageio-ffmpeg/0.6.0/#files");
  expect(request.mock.calls).toEqual([[{ action: "status" }]]);
  await button(/Choose FFmpeg/).click();
  await expect.element(button("Render sample")).toBeEnabled();
  await button("Render sample").click();

  const save = button(/Save As/);
  await expect.element(save).toBeEnabled();
  const video = screen.container.querySelector("video")!;
  expect([video.videoWidth, video.videoHeight, video.duration]).toEqual([360, 640, 2.5]);
  expect(video.src).toMatch(/^blob:/);
  expect(new Uint8Array(await (await fetch(video.src)).arrayBuffer())).toEqual(
    new Uint8Array(await (await fetch(sampleUrl)).arrayBuffer()),
  );
  const url = video.src;
  await video.play();
  await expect.poll(() => video.currentTime).toBeGreaterThan(0);
  video.pause();
  expect(request.mock.calls).toEqual([
    [{ action: "status" }],
    [{ action: "enroll" }],
    [{ action: "render", projectId, startFrame: 30, endFrameExclusive: 90 }],
  ]);

  await save.click();
  await expect.element(screen.getByText(/Save As was cancelled/)).toBeVisible();
  await expect.element(save).toBeEnabled();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByText(/file already exists/)).toBeVisible();
  await expect.element(save).toBeEnabled();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("status")).toHaveTextContent("Sample MP4 saved.");
  await expect.element(button("Render sample")).toHaveFocus();
  await expect
    .poll(() => request.mock.calls.at(-1)?.[0])
    .toEqual({ action: "discard", projectId, token });
  expect(request.mock.calls.slice(3, 6)).toEqual(
    Array.from({ length: 3 }, () => [{ action: "save", projectId, token }]),
  );
  await expect(fetch(url)).rejects.toThrow();
  const workspace = screen.container.querySelector(".ops-workspace")!;
  expect(workspace.scrollWidth).toBeLessThanOrEqual(workspace.clientWidth);
});

it("discards a render that finishes after a frame change without enabling Save As", async () => {
  const pendingRender = Promise.withResolvers<ClipperSampleResult>();
  const request = vi.fn((call: ClipperSampleRequest) =>
    call.action === "render"
      ? pendingRender.promise
      : Promise.resolve({ status: "ready" } as const),
  );
  using _bridge = installBridge(request);
  await using screen = await render(exportPanel(), { router: false });
  await screen.getByRole("button", { name: "Try a sample export" }).click();
  const renderSample = screen.getByRole("button", { name: "Render sample" });
  await renderSample.click();
  (renderSample.element() as HTMLButtonElement).click();
  expect(request.mock.calls.filter(([call]) => call.action === "render")).toHaveLength(1);
  await screen.getByRole("spinbutton", { name: "End frame (excluded)" }).fill("30");
  pendingRender.resolve(review);

  await expect
    .poll(() => request.mock.calls.at(-1)?.[0])
    .toEqual({ action: "discard", projectId, token });
  await expect.element(renderSample).toBeDisabled();
  expect(screen.container.querySelector("video")).toBeNull();
});

it("discards a render that finishes after leaving the Export step", async () => {
  const late = Promise.withResolvers<ClipperSampleResult>();
  const request = vi.fn((call: ClipperSampleRequest) =>
    call.action === "render" ? late.promise : Promise.resolve({ status: "ready" } as const),
  );
  using _bridge = installBridge(request);
  await using screen = await render(exportPanel(), { router: false });
  await screen.getByRole("button", { name: "Try a sample export" }).click();
  await screen.getByRole("button", { name: "Render sample" }).click();
  await screen.rerender(<div>Another step</div>);
  late.resolve(review);

  await expect
    .poll(() => request.mock.calls.at(-1)?.[0])
    .toEqual({ action: "discard", projectId, token });
  expect(screen.container.querySelector("video")).toBeNull();
});

it("uses the active Clipper project without changing its marks or caption export", async () => {
  const request = vi.fn(async (call: ClipperSampleRequest): Promise<ClipperSampleResult> =>
    call.action === "render" ? review : { status: "ready" },
  );
  using _bridge = installBridge(request);
  const workspaceId = "0b2934ff-5953-4da1-8968-cdb97bca6fe9";
  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, {
    router: false,
  });
  const button = (name: string | RegExp) => screen.getByRole("button", { name });
  const next = screen.getByRole("button", { name: "Next", exact: true });
  await button(/^Clipper/).click();
  await next.click();
  await screen.getByRole("textbox", { name: "Mark in", exact: true }).fill("00:12");
  await screen.getByRole("textbox", { name: "Mark out", exact: true }).fill("00:29");
  await next.click();
  await screen.getByRole("textbox", { name: "Caption text" }).fill("Synthetic caption");
  await next.click();
  await next.click();
  await expect.element(button("Download caption (.vtt)")).toBeEnabled();
  await expect.element(button("Download edit plan")).toBeEnabled();
  expect(request).not.toHaveBeenCalled();

  await button("Try a sample export").click();
  await button("Render sample").click();
  await expect.element(button(/Save As/)).toBeEnabled();
  const [draft] = await listDrafts(workspaceId);
  expect(draft?.fields).toMatchObject({
    markIn: "00:12",
    markOut: "00:29",
    captionLine: "Synthetic caption",
  });
  expect(request.mock.calls[1]).toEqual([
    { action: "render", projectId: draft?.id, startFrame: 30, endFrameExclusive: 90 },
  ]);

  const url = screen.container.querySelector("video")!.src;
  await button("Back").click();
  await expect
    .element(screen.getByRole("heading", { name: "Review your edit plan" }))
    .toHaveFocus();
  await expect
    .poll(() => request.mock.calls.at(-1)?.[0])
    .toEqual({
      action: "discard",
      projectId: draft?.id,
      token,
    });
  await expect(fetch(url)).rejects.toThrow();
  await next.click();
  await expect.element(button("Try a sample export")).toBeVisible();
  await expect.element(button("Download caption (.vtt)")).toBeEnabled();
});
