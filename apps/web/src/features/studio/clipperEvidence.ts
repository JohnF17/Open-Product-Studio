import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { decodeHTML } from "entities";
import { formatClipTime, parseClipTime } from "./clipTimes";

export const maxClipSourceBytes = 250 * 1024 * 1024;
export const clipVideoAccept = ".mp4,.m4v,.webm,video/mp4,video/webm";
const maxCaptionBytes = 256 * 1024;

export interface ClipTranscriptCue {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface ClipperEvidence {
  projectId: string;
  mediaRevision: string;
  sourceRevision: string;
  durationMs: number;
  frames: { id: string; timeMs: number }[];
  contactSheet: File;
  transcript?: ClipTranscriptCue[];
  instruction: string;
}

// Never pass a local playlist or HTML file to the media element based on extension or OS MIME.
export async function localVideoType(file: File) {
  if (file.size === 0) return null;
  const header = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) return "video/webm";
  const view = new DataView(header.buffer);
  for (let offset = 0; offset + 8 <= header.length;) {
    const size = view.getUint32(offset);
    const type = String.fromCharCode(...header.subarray(offset + 4, offset + 8));
    if (size < 8 || offset + size > file.size) break;
    if (type === "ftyp" && size >= 16) return "video/mp4";
    if (type !== "free" && type !== "skip" && type !== "wide") break;
    offset += size;
  }
  return null;
}

export function clipDurationMs(video: HTMLVideoElement) {
  const duration = Math.round(video.duration * 1000);
  return Number.isSafeInteger(duration) && duration > 0 ? duration : undefined;
}

// Some locally recorded WebMs have duration only at the buffered end.
export function primeClipPlayback(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration)) return;
  video.addEventListener("seeked", () => {
    if (Number.isFinite(video.duration)) video.currentTime = 0;
  }, { once: true });
  video.currentTime = 1e10;
}

export function clipSourceLink(input: string) {
  const text = input.trim();
  if (text.length > 2048 || !/^https?:\/\/[^/?#]/i.test(text) || /[\s\\\u0000-\u001f\u007f]/u.test(text)) return null;
  try {
    const url = new URL(text);
    if (url.username || url.password || text.split("/")[2]?.includes("@")) return null;
    return url.href;
  } catch {
    return null;
  }
}

const cueTiming = /^((?:\d{2,}:)?[0-5]\d:[0-5]\d[.,]\d{3})[ \t]+-->[ \t]+((?:\d{2,}:)?[0-5]\d:[0-5]\d[.,]\d{3})(?:[ \t]+.*)?$/;

export async function readClipCaptions(file: File): Promise<ClipTranscriptCue[]> {
  if (file.size > maxCaptionBytes) throw new Error("Choose a caption file up to 256 KiB.");
  const contents = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  const groups = contents.replace(/\r\n?/g, "\n").trim().split(/\n(?:[ \t]*\n)+/);
  const cues: ClipTranscriptCue[] = [];
  for (const group of groups) {
    if (/^(?:WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(group)) continue;
    const lines = group.split("\n");
    const index = lines[0]?.includes("-->") ? 0 : 1;
    const times = cueTiming.exec(lines[index]?.trim() ?? "");
    if (!times) continue;
    const startMs = parseClipTime(times[1]!.replace(",", "."));
    const endMs = parseClipTime(times[2]!.replace(",", "."));
    const text = decodeHTML(lines.slice(index + 1).join("\n").replace(/<[^>\n]*>/g, "")).trim();
    if (startMs === null || endMs === null || startMs >= endMs || !text) continue;
    cues.push({ id: "cue-" + (cues.length + 1), text, startMs, endMs });
  }
  if (cues.length === 0) throw new Error("Choose a UTF-8 WebVTT or SRT file with readable timed captions.");
  return cues.sort((a, b) => a.startMs - b.startMs);
}

function transcriptExcerpt(cues: readonly ClipTranscriptCue[], durationMs: number) {
  let remaining = 3000;
  const excerpt: ClipTranscriptCue[] = [];
  for (const cue of cues) {
    if (cue.endMs > durationMs) continue;
    if (excerpt.length === 24 || remaining === 0) break;
    const text = cue.text.slice(0, remaining);
    excerpt.push({ ...cue, text });
    remaining -= text.length;
  }
  return excerpt;
}

function waitForVideo(
  video: HTMLVideoElement,
  event: string,
  ready: () => boolean,
  signal: AbortSignal,
  start?: () => void,
) {
  return new Promise<void>((resolve, reject) => {
    const listeners = new AbortController();
    function done(error?: unknown) {
      clearTimeout(timeout);
      listeners.abort();
      if (error !== undefined) reject(error);
      else resolve();
    }
    const timeout = setTimeout(() => done(new Error("The browser timed out reading this video.")), 8000);
    const options = { signal: listeners.signal };
    const check = () => { if (ready()) done(); };
    video.addEventListener(event, check, options);
    if (event === "seeked") video.addEventListener("loadeddata", check, options);
    video.addEventListener("error", () => done(new Error("The browser could not decode this video.")), options);
    signal.addEventListener("abort", () => done(signal.reason), options);
    try {
      signal.throwIfAborted();
      start?.();
      if (ready()) done();
    } catch (error) {
      done(error);
    }
  });
}

export async function readClipVideo(file: File, signal: AbortSignal) {
  if (file.size > maxClipSourceBytes) throw new Error("Choose a video up to 250 MiB.");
  const type = await localVideoType(file);
  signal.throwIfAborted();
  if (!type) {
    throw new Error("Choose a non-empty MP4 or WebM video.");
  }
  const url = URL.createObjectURL(file.slice(0, file.size, type));
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.disableRemotePlayback = true;
  function release() {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
  try {
    await waitForVideo(video, "loadedmetadata", () => video.readyState >= 1, signal, () => { video.src = url; });
    if (!Number.isFinite(video.duration) && type === "video/webm") {
      // MediaRecorder can omit duration in a WebM stream. Seeking to its buffered end
      // lets the native demuxer discover the finite end time from the recorded bytes.
      await waitForVideo(video, "durationchange", () => Number.isFinite(video.duration), signal, () => {
        video.currentTime = 1e10;
      });
    }
    const durationMs = clipDurationMs(video);
    if (!video.videoWidth || !video.videoHeight || durationMs === undefined) {
      throw new Error("This video needs a readable picture and finite duration. Try an exported MP4 or WebM.");
    }
    return { video, type, durationMs, release };
  } catch (error) {
    release();
    throw error;
  }
}

export async function clipMediaRevision(file: File, signal: AbortSignal) {
  // Read bounded slices, keeping a large source file out of a single JS buffer.
  const hash = sha256.create();
  const chunkBytes = 4 * 1024 * 1024;
  for (let offset = 0; offset < file.size; offset += chunkBytes) {
    signal.throwIfAborted();
    hash.update(new Uint8Array(await file.slice(offset, offset + chunkBytes).arrayBuffer()));
  }
  signal.throwIfAborted();
  return "sha256:" + bytesToHex(hash.digest());
}

export async function openClipSourceFile(file: File, signal: AbortSignal) {
  const opened = await readClipVideo(file, signal);
  const { durationMs, type } = opened;
  opened.release();
  signal.throwIfAborted();
  return {
    file: file.type === type ? file : new File([file], file.name, { type, lastModified: file.lastModified }),
    durationMs,
    mediaRevision: await clipMediaRevision(file, signal),
  };
}

export async function prepareClipperEvidence(
  projectId: string,
  file: File,
  mediaRevision: string,
  instruction: string,
  cues: readonly ClipTranscriptCue[],
  signal: AbortSignal,
): Promise<ClipperEvidence> {
  const { video, durationMs, release } = await readClipVideo(file, signal);
  try {
    const count = Math.min(6, durationMs);
    const width = 288;
    const height = 162;
    const band = 28;
    const margin = 12;
    const columns = Math.min(2, count);
    const rows = Math.ceil(count / columns);
    const canvas = document.createElement("canvas");
    canvas.width = columns * width + (columns + 1) * margin;
    canvas.height = 34 + rows * (height + band + margin);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("The browser could not create a contact sheet.");
    ctx.fillStyle = "#151e28";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("Clipper source samples   /   " + formatClipTime(durationMs), margin, 22);
    const frames: ClipperEvidence["frames"] = [];
    for (let index = 0; index < count; index++) {
      signal.throwIfAborted();
      const target = Math.floor(durationMs * (index + 0.5) / count) / 1000;
      if (video.currentTime !== target) {
        await waitForVideo(video, "seeked", () => !video.seeking && video.readyState >= 2, signal, () => {
          video.currentTime = target;
        });
      } else if (video.readyState < 2) {
        await waitForVideo(video, "loadeddata", () => video.readyState >= 2, signal);
      }
      const frame = { id: "frame-" + (index + 1), timeMs: Math.round(video.currentTime * 1000) };
      frames.push(frame);
      const x = margin + (index % columns) * (width + margin);
      const y = 34 + Math.floor(index / columns) * (height + band + margin);
      ctx.fillStyle = "#080d13";
      ctx.fillRect(x, y, width, height);
      const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
      const drawWidth = video.videoWidth * scale;
      const drawHeight = video.videoHeight * scale;
      ctx.drawImage(video, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px monospace";
      ctx.fillText(frame.id + "   " + formatClipTime(frame.timeMs), x + 2, y + height + 19);
    }
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((image) => {
        if (image) resolve(image);
        else reject(new Error("The contact sheet could not be encoded."));
      }, "image/png");
    });
    signal.throwIfAborted();
    const transcript = transcriptExcerpt(cues, durationMs);
    // This identifies the reviewed snapshot. A change to the goal, captions or
    // sample positions creates a different revision even though cue/frame IDs recur.
    const snapshot = JSON.stringify([
      1,
      mediaRevision,
      durationMs,
      frames.map(({ id, timeMs }) => [id, timeMs]),
      transcript.map(({ id, text, startMs, endMs }) => [id, text, startMs, endMs]),
      instruction,
    ]);
    const sourceRevision = "sha256:" + bytesToHex(sha256(new TextEncoder().encode(snapshot)));
    return {
      projectId,
      mediaRevision,
      sourceRevision,
      durationMs,
      frames,
      contactSheet: new File([blob], "clipper-contact-sheet.png", { type: "image/png" }),
      ...(transcript.length ? { transcript } : {}),
      instruction,
    };
  } finally {
    release();
  }
}
