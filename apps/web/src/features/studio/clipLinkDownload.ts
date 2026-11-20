import { clipSourceLink, localVideoType } from "./clipperEvidence";

export const maxClipDownloadBytes = 64 * 1024 * 1024;

// The renderer cannot resolve and pin arbitrary DNS names. Limit requests to
// public object endpoints controlled by the storage providers, with no proxies.
export function clipDownloadUrl(input: string): URL | null {
  const link = clipSourceLink(input);
  if (!link) return null;
  const url = new URL(link);
  if (url.protocol !== "https:" || url.port || url.search || url.hash) return null;
  const host = url.hostname;
  const path = url.pathname.split("/").filter(Boolean);
  const pathBucket = host === "storage.googleapis.com" || /^s3(?:\.[a-z0-9-]+)?\.amazonaws\.com$/.test(host);
  if (pathBucket) return path.length >= 2 ? url : null;
  const bucketHost = /^[a-z0-9][a-z0-9-]*\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com$/.test(host);
  if (bucketHost) return path.length >= 1 ? url : null;
  if (/^[a-z0-9]+\.blob\.core\.windows\.net$/.test(host) && path.length >= 2) return url;
  return null;
}

export async function downloadClipLink(input: string, signal: AbortSignal): Promise<File> {
  const url = clipDownloadUrl(input);
  if (!url) throw new Error("Choose a supported public storage link to an MP4 or WebM.");
  signal.throwIfAborted();
  const response = await fetch(url.href, {
    method: "GET", credentials: "omit", redirect: "error", mode: "cors",
    cache: "no-store", referrerPolicy: "no-referrer", signal,
  });
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The host did not send a video file.");
  try {
    signal.throwIfAborted();
    if (response.status !== 200 || response.redirected || (response.url && response.url !== url.href)) {
      throw new Error("The host did not return the requested file. Import a local copy.");
    }
    const mime = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (mime !== "video/mp4" && mime !== "video/webm" && mime !== "application/octet-stream") {
      throw new Error("This link returned a page or unsupported file. Choose a direct MP4 or WebM.");
    }
    const sizeError = "Direct video imports can be up to 64 MiB. Choose a smaller video or import a local copy.";
    if (Number(response.headers.get("content-length")) > maxClipDownloadBytes) throw new Error(sizeError);
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      received += value.byteLength;
      if (received > maxClipDownloadBytes) throw new Error(sizeError);
      chunks.push(value);
    }
    const file = new File(chunks, "linked-video");
    const type = await localVideoType(file);
    signal.throwIfAborted();
    if (!type) throw new Error("The downloaded bytes are not a supported MP4 or WebM.");
    return new File([file], type === "video/webm" ? "linked-video.webm" : "linked-video.mp4", { type });
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
