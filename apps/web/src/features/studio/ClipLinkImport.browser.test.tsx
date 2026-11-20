import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { recording } from "./clipRecordingFixture";
import { readClipVideo } from "./clipperEvidence";
import { ClipLinkImport } from "./ClipLinkImport";

const link = "https://storage.googleapis.com/studio-fixtures/blue.webm";

it("contacts only the reviewed host on approval and hands the playable footage to the source picker", async () => {
  const fixture = recording("blue.webm");
  using fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(fixture, {
    headers: { "Content-Type": "video/webm" },
  }));
  const onFile = vi.fn<(file: File) => void>();
  await using ui = await render(<ClipLinkImport link={link} onFile={onFile} />, { router: false });
  await expect.element(ui.getByText(/storage\.googleapis\.com/)).toBeVisible();
  expect(fetchSpy).not.toHaveBeenCalled();
  await ui.getByRole("button", { name: "Import permitted video" }).click();
  await vi.waitFor(() => expect(onFile).toHaveBeenCalledOnce());
  expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(link, expect.objectContaining({
    credentials: "omit", redirect: "error", mode: "cors", referrerPolicy: "no-referrer", cache: "no-store",
  }));
  const file = onFile.mock.calls[0]![0];
  expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array(await fixture.arrayBuffer()));
  const opened = await readClipVideo(file, new AbortController().signal);
  try {
    expect(opened.durationMs).toBe(2000);
    expect(opened.video.videoWidth).toBe(16);
  } finally {
    opened.release();
  }
});

it("discards a late result after the user cancels", async () => {
  let finish!: (response: Response) => void;
  using fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const onFile = vi.fn();
  await using ui = await render(<ClipLinkImport link={link} onFile={onFile} />, { router: false });
  await ui.getByRole("button", { name: "Import permitted video" }).click();
  await ui.getByRole("button", { name: "Cancel import" }).click();
  expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  finish(new Response(recording("blue.webm"), { headers: { "Content-Type": "video/webm" } }));
  await expect.element(ui.getByRole("button", { name: "Import permitted video" })).toBeEnabled();
  expect(onFile).not.toHaveBeenCalled();
});

it("keeps a platform page offline and recovers from a browser-blocked object request", async () => {
  using fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
  const onFile = vi.fn();
  await using ui = await render(
    <ClipLinkImport link="https://www.youtube.com/watch?v=example" onFile={onFile} />, { router: false },
  );
  await expect.element(ui.getByText(/For video pages, keep a reference/)).toBeVisible();
  await expect.element(ui.getByRole("button", { name: "Import permitted video" })).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  await ui.rerender(<ClipLinkImport link={link} onFile={onFile} />);
  await ui.getByRole("button", { name: "Import permitted video" }).click();
  await expect.element(ui.getByRole("alert")).toHaveTextContent(
    "The browser could not read the direct link. Check cross-origin access, redirects and connectivity, or choose a local copy.",
  );
  await expect.element(ui.getByRole("button", { name: "Import permitted video" })).toBeEnabled();
  expect(onFile).not.toHaveBeenCalled();
});
