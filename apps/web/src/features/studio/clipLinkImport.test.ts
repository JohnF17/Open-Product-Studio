import { describe, expect, it, vi } from "vite-plus/test";
import { clipDownloadUrl, downloadClipLink, maxClipDownloadBytes } from "./clipLinkDownload";

const object = "https://storage.googleapis.com/studio-fixtures/demo.webm";

describe("public video object links", () => {
  it.each([
    object,
    "https://public-footage.s3.eu-west-1.amazonaws.com/demo",
    "https://s3.us-east-2.amazonaws.com/public-footage/demo",
    "https://footage.blob.core.windows.net/videos/demo.mp4",
  ])("can review %s without network access", (link) => {
    expect(clipDownloadUrl(link)?.href).toBe(link);
  });

  it.each([
    "http://storage.googleapis.com/b/f", "https://user@storage.googleapis.com/b/f",
    "https://storage.googleapis.com:444/b/f", "https://storage.googleapis.com/b/f?token=private",
    "https://storage.googleapis.com.evil.invalid/b/f", "https://evil.invalid/b/f",
    "https://127.0.0.1/f", "https://[::1]/f", "https://localhost/f", "https://storage.local/f",
    "https://www.youtube.com/watch?v=abc", "https://storage.googleapis.com/",
  ])("declines %s before dispatch", async (link) => {
    using fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("unexpected"));
    expect(clipDownloadUrl(link)).toBeNull();
    await expect(downloadClipLink(link, new AbortController().signal)).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("cancels the response stream on an invalid type, oversized declaration or redirect", async () => {
    for (const response of [
      { headers: { "Content-Type": "text/html" } },
      { headers: { "Content-Type": "video/mp4", "Content-Length": String(maxClipDownloadBytes + 1) } },
      { headers: { "Content-Type": "video/mp4" }, redirected: true },
    ]) {
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({ cancel });
      const result = new Response(body, { headers: response.headers });
      if ("redirected" in response) Object.defineProperty(result, "redirected", { value: true });
      using request = vi.spyOn(globalThis, "fetch").mockResolvedValue(result);
      await expect(downloadClipLink(object, new AbortController().signal)).rejects.toThrow();
      expect(cancel).toHaveBeenCalledOnce();
    }
  });

  it("caps incoming bytes when the declared length understates the response", async () => {
    const cancel = vi.fn();
    const chunk = new Uint8Array(4 * 1024 * 1024);
    const stream = new ReadableStream({ pull(controller) { controller.enqueue(chunk); }, cancel });
    using request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(stream, {
      headers: { "Content-Type": "video/webm", "Content-Length": "32" },
    }));
    await expect(downloadClipLink(object, new AbortController().signal)).rejects.toThrow(/64 MiB/);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
